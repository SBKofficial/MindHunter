const { Markup } = require('telegraf');
const state = require('./state');
const ui = require('./ui');
const logger = require('./logger');
const game = require('./game'); 

async function create(ctx) {
    if (ctx.chat.type === 'private') return ctx.reply(ui.lobby.create_dm, { parse_mode: 'Markdown' });
    if (state.getGame(ctx.chat.id)) return ctx.reply(ui.lobby.create_active, { parse_mode: 'Markdown' });
    
    const gameState = state.createGame(ctx.chat.id, ctx.from.id);
    logger.log(`LOBBY CREATED\nUser: ${ctx.from.first_name}\nChat: ${ctx.chat.title}`);

    const msg = await ctx.reply(ui.lobby.text(ctx.from.first_name, 120, []), { parse_mode: 'Markdown', ...ui.lobby.keyboard });
    gameState.lobbyMessageId = msg.message_id;

    try { await ctx.telegram.pinChatMessage(gameState.chatId, gameState.lobbyMessageId); } catch (e) { ctx.reply("⚠️ Pin failed. Give me Admin!"); }
    
    ctx.reply("💡 Creator: Type /skip to start.");
    startTimer(ctx, gameState);
}

async function join(ctx) {
    // 1. Initial Check
    let gameState = state.getGame(ctx.chat.id);
    if (!gameState || gameState.status !== "lobby") return ctx.answerCbQuery(ui.lobby.join_closed.replace(/\*/g, ''), { show_alert: true });
    
    const userId = ctx.from.id;
    if (gameState.players.some(p => p.id === userId)) return ctx.answerCbQuery("Already joined!");
    if (state.getGameByPlayerId(userId)) return ctx.answerCbQuery("🚫 You are already in another game!", { show_alert: true });

    // 2. DM the User (Async - Yields Control)
    try { await ctx.telegram.sendMessage(userId, ui.dm.welcome, { parse_mode: 'Markdown' }); } 
    catch (e) { return ctx.answerCbQuery("❌ Start bot in DM first!", { show_alert: true }); }

    // 🛡️ RACE CONDITION FIX: Re-fetch Game State
    gameState = state.getGame(ctx.chat.id);
    if (!gameState || gameState.status !== "lobby") {
        return ctx.answerCbQuery(ui.lobby.join_closed.replace(/\*/g, ''), { show_alert: true });
    }

    // 3. Commit to State
    state.addPlayerToDirectory(userId, gameState.chatId);
    gameState.players.push({
        id: userId, name: ctx.from.first_name, username: ctx.from.username || "Unknown",
        targetId: null, trapWord: null, killUnlockTime: 0, lastSeen: Date.now(), alive: true, hasShield: false
    });

    logger.log(`PLAYER JOINED\nName: ${ctx.from.first_name}`);
    ctx.answerCbQuery("Ledger Signed.");
    await ctx.telegram.sendMessage(gameState.chatId, ui.group.joined(ctx.from.first_name), { parse_mode: 'Markdown' });

    try {
        await ctx.telegram.editMessageText(gameState.chatId, gameState.lobbyMessageId, null, 
            ui.lobby.text(state.getPlayer(gameState, gameState.creatorId)?.name || "Unknown", "ACTIVE", gameState.players),
            { parse_mode: 'Markdown', ...ui.lobby.keyboard }
        );
    } catch (e) {}
}

async function skip(ctx) {
    const gameState = state.getGame(ctx.chat.id);
    if (!gameState) return ctx.reply("No lobby.");
    if (ctx.from.id !== gameState.creatorId) return ctx.reply(ui.lobby.skip_unauth, { parse_mode: 'Markdown' });
    
    clearInterval(gameState.lobbyTimer);
    try { 
        await ctx.telegram.unpinChatMessage(gameState.chatId, { message_id: gameState.lobbyMessageId });
        await ctx.telegram.deleteMessage(gameState.chatId, gameState.lobbyMessageId);
    } catch(e){}
    
    if (gameState.players.length < 3) {
        ctx.reply(ui.lobby.insufficient, { parse_mode: 'Markdown' });
        state.deleteGame(gameState.chatId);
    } else {
        game.start(ctx, gameState);
    }
}

function startTimer(ctx, gameState) {
    let timeLeft = 120; 
    gameState.lobbyTimer = setInterval(async () => {
        timeLeft--;
        
        if (timeLeft === 60 || timeLeft === 30 || timeLeft === 10) {
            ctx.telegram.sendMessage(gameState.chatId, ui.group.timer_warn(timeLeft), { parse_mode: 'Markdown' });
        }

        if (timeLeft <= 0) {
            clearInterval(gameState.lobbyTimer);
            
            // 👇 NEW: CLEANUP LOBBY MESSAGE
            try { 
                await ctx.telegram.unpinChatMessage(gameState.chatId, { message_id: gameState.lobbyMessageId });
                await ctx.telegram.deleteMessage(gameState.chatId, gameState.lobbyMessageId);
            } catch(e) {} // Ignore errors if message already deleted
            
            if (gameState.players.length < 3) {
                 ctx.telegram.sendMessage(gameState.chatId, ui.lobby.insufficient, { parse_mode: 'Markdown' });
                 state.deleteGame(gameState.chatId);
            } else {
                 game.start(ctx, gameState);
            }
        }
    }, 1000);
}

module.exports = { create, join, skip };
