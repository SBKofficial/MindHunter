const { Markup } = require('telegraf');
const state = require('./state');
const ui = require('./ui');
const logger = require('./logger');
const game = require('./game'); // Needed for deathFlow

async function kill(ctx) {
    if (ctx.chat.type !== 'private') return ctx.reply("❌ DM only.");
    const gameState = state.getGameByPlayerId(ctx.from.id);
    if (!gameState || gameState.status !== "active") return ctx.reply("⚠️ No active contract.");

    const hunter = state.getPlayer(gameState, ctx.from.id);
    if (!hunter || !hunter.alive) return ctx.reply("You are retired.");

    const buttons = gameState.players.filter(p => p.alive && p.id !== hunter.id)
        .map(p => Markup.button.callback(`🔫 ${p.name}`, `shoot_${p.id}`));
    const keyboard = [];
    while (buttons.length > 0) keyboard.push(buttons.splice(0, 2));
    ctx.reply("🎯 *SELECT TARGET:*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

async function shootAction(ctx) {
    const gameState = state.getGameByPlayerId(ctx.from.id);
    if (!gameState) return ctx.answerCbQuery("Game expired.");

    const targetId = parseInt(ctx.match[1]);
    const hunter = state.getPlayer(gameState, ctx.from.id);
    if (!hunter || !hunter.alive) return ctx.answerCbQuery("Invalid.");
    
    ctx.deleteMessage();
    if (Date.now() > hunter.killUnlockTime) return ctx.reply("🔒 Weapon Locked.");

    if (targetId !== hunter.targetId) {
        logger.log(`FAILED KILL\n${hunter.name} -> Died.`);
        hunter.alive = false;
        await ctx.telegram.sendMessage(gameState.chatId, ui.group.killFail(hunter.username), { parse_mode: 'Markdown' });
        ctx.reply("💀 You died.");
        game.deathFlow(ctx, gameState, hunter.id);
    } else {
        const realTarget = state.getPlayer(gameState, targetId);
        if (realTarget.hasShield) {
            realTarget.hasShield = false;
            await ctx.telegram.sendMessage(gameState.chatId, ui.group.blocked(realTarget.username, hunter.username), { parse_mode: 'Markdown' });
            ctx.reply("❌ *BLOCKED!* Shield hit.", { parse_mode: 'Markdown' });
            hunter.killUnlockTime = 0;
        } else {
            logger.log(`KILL SUCCESS\n${hunter.name} -> ${realTarget.name}`);
            realTarget.alive = false;
            await ctx.telegram.sendMessage(gameState.chatId, ui.group.killSuccess(realTarget.username), { parse_mode: 'Markdown' });
            ctx.reply("🎯 Eliminated.");
            game.deathFlow(ctx, gameState, realTarget.id, hunter);
        }
    }
}

async function guess(ctx) {
    if (ctx.chat.type !== 'private') return ctx.reply("DM Only.");
    const gameState = state.getGameByPlayerId(ctx.from.id);
    if (!gameState || gameState.status !== "active") return ctx.reply("No active game.");

    const player = state.getPlayer(gameState, ctx.from.id);
    if (!player || !player.alive) return;

    const args = ctx.message.text.split(' ');
    if (args.length < 3) return ctx.reply("Usage: /guess @Hunter [word]");

    const hunter = state.getPlayerByName(gameState, args[1]);
    const word = args[2].toLowerCase();

    if (!hunter || !hunter.alive) return ctx.reply("Invalid player.");

    if (hunter.targetId === player.id && hunter.trapWord.toLowerCase() === word) {
        hunter.alive = false;
        await ctx.telegram.sendMessage(gameState.chatId, ui.group.reverseKill(player.username, hunter.username, word), { parse_mode: 'Markdown' });
        ctx.reply(ui.dm.guessSuccess, { parse_mode: 'Markdown' });
        player.hasShield = true;
        game.deathFlow(ctx, gameState, hunter.id);
    } else {
        player.alive = false;
        await ctx.telegram.sendMessage(gameState.chatId, ui.group.suicide(player.username), { parse_mode: 'Markdown' });
        ctx.reply(ui.dm.guessFail, { parse_mode: 'Markdown' });
        game.deathFlow(ctx, gameState, player.id);
    }
}

async function accuse(ctx) {
    if (ctx.chat.type === 'private') return;
    const gameState = state.getGame(ctx.chat.id);
    if (!gameState || gameState.status !== "active") return;
    if (!ctx.message.reply_to_message) return ctx.reply("⚠️ Reply to suspect.");

    const survivors = gameState.players.filter(p => p.alive).length;
    if (survivors < 5) return ctx.reply(`🛡️ **DISABLED!** Need 5+ players.`);

    const accuser = state.getPlayer(gameState, ctx.from.id);
    const suspect = state.getPlayer(gameState, ctx.message.reply_to_message.from.id);
    if (!accuser?.alive || !suspect?.alive) return;

    if (suspect.targetId === accuser.id) {
        suspect.alive = false;
        await ctx.reply(`🛡️ *COUNTER!* @${accuser.username} killed @${suspect.username}!`, { parse_mode: 'Markdown' });
        game.deathFlow(ctx, gameState, suspect.id);
    } else {
        accuser.alive = false;
        await ctx.reply(`🤪 *PARANOIA!* @${accuser.username} was wrong & died.`, { parse_mode: 'Markdown' });
        game.deathFlow(ctx, gameState, accuser.id);
    }
}

// --- STANDOFF LOGIC ---
function startStandoff(ctx, gameState) {
    if (gameState.turn.timer) clearInterval(gameState.turn.timer);
    gameState.status = "standoff";
    gameState.standoff = { active: true, round: 1, moves: {}, lastMoves: {}, timer: null, reminderTimer: null };

    const survivors = gameState.players.filter(p => p.alive);
    logger.log(`STANDOFF: ${survivors[0].name} vs ${survivors[1].name}`);
    ctx.telegram.sendMessage(gameState.chatId, ui.standoff.intro(survivors[0].username, survivors[1].username), { parse_mode: 'Markdown' });
    
    initStandoffRound(ctx, gameState);
}

function initStandoffRound(ctx, gameState) {
    gameState.standoff.moves = {};
    const survivors = gameState.players.filter(p => p.alive);
    ctx.telegram.sendMessage(gameState.chatId, ui.standoff.roundStart(gameState.standoff.round), { parse_mode: 'Markdown' });

    survivors.forEach(p => {
        const last = gameState.standoff.lastMoves[p.id];
        const buttons = [
            Markup.button.callback("🔥 SHOOT", "standoff_shoot", last === 'shoot'),
            Markup.button.callback("🛡️ DODGE", "standoff_dodge", last === 'dodge'),
            Markup.button.callback("🔋 RELOAD", "standoff_reload", last === 'reload')
        ];
        ctx.telegram.sendMessage(p.id, ui.standoff.dmMenu(gameState.standoff.round, last), 
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard([buttons]) }).catch(e=>{});
    });

    gameState.standoff.reminderTimer = setTimeout(() => {
        const slacker = gameState.players.filter(p=>p.alive).find(p => !gameState.standoff.moves[p.id]);
        if (slacker) ctx.telegram.sendMessage(gameState.chatId, ui.standoff.reminder(`@${slacker.username}`), { parse_mode: 'Markdown' });
    }, 15000);

    gameState.standoff.timer = setTimeout(() => {
        const s = gameState.players.filter(p=>p.alive);
        const m1 = gameState.standoff.moves[s[0].id], m2 = gameState.standoff.moves[s[1].id];
        if (!m1) s[0].alive = false;
        if (!m2) s[1].alive = false;
        if (!m1 && !m2) ctx.telegram.sendMessage(gameState.chatId, ui.standoff.timeout, { parse_mode: 'Markdown' });
        else if (!m1 || !m2) ctx.telegram.sendMessage(gameState.chatId, "💀 Hesitation is defeat.", { parse_mode: 'Markdown' });
        game.checkWinner(ctx, gameState);
    }, 30000);
}

async function standoffChoice(ctx) {
    const gameState = state.getGameByPlayerId(ctx.from.id);
    if (!gameState || gameState.status !== "standoff") return ctx.answerCbQuery("Not active.");
    
    const move = ctx.match[0].replace('standoff_', '');
    const player = state.getPlayer(gameState, ctx.from.id);
    if (!player?.alive) return ctx.answerCbQuery("Dead.");

    if (gameState.standoff.lastMoves[player.id] === move) return ctx.answerCbQuery("Cooldown!", { show_alert: true });

    gameState.standoff.moves[player.id] = move;
    ctx.answerCbQuery(`Selected: ${move}`);
    ctx.editMessageText(`✅ LOCKED IN: *${move.toUpperCase()}*`, { parse_mode: 'Markdown' });

    const survivors = gameState.players.filter(p => p.alive);
    if (gameState.standoff.moves[survivors[0].id] && gameState.standoff.moves[survivors[1].id]) {
        resolveStandoff(ctx, gameState);
    }
}

function resolveStandoff(ctx, gameState) {
    clearTimeout(gameState.standoff.timer);
    clearTimeout(gameState.standoff.reminderTimer);

    const [p1, p2] = gameState.players.filter(p => p.alive);
    const m1 = gameState.standoff.moves[p1.id], m2 = gameState.standoff.moves[p2.id];
    let outcome = "Draw", loser = null;

    if (m1 === m2) outcome = "🤝 DRAW";
    else if ((m1 === 'shoot' && m2 === 'reload') || (m1 === 'reload' && m2 === 'dodge') || (m1 === 'dodge' && m2 === 'shoot')) {
        outcome = `${m1 === 'shoot' ? '🔥' : m1 === 'reload' ? '🔋' : '🛡️'} ${p1.name} Wins!`; loser = p2;
    } else {
        outcome = `${m2 === 'shoot' ? '🔥' : m2 === 'reload' ? '🔋' : '🛡️'} ${p2.name} Wins!`; loser = p1;
    }

    ctx.telegram.sendMessage(gameState.chatId, ui.standoff.result(p1.username, m1, p2.username, m2, outcome), { parse_mode: 'Markdown' });

    if (loser) { loser.alive = false; game.checkWinner(ctx, gameState); }
    else {
        gameState.standoff.round++;
        gameState.standoff.lastMoves = { ...gameState.standoff.moves };
        setTimeout(() => initStandoffRound(ctx, gameState), 3000);
    }
}

module.exports = { kill, shootAction, guess, accuse, standoffChoice, startStandoff };
                                   
