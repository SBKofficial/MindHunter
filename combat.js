const { Markup } = require('telegraf');
const state = require('./state');
const ui = require('./ui');
const logger = require('./logger');

// 🛡️ Safe Answer Helper
const safeAnswer = async (ctx, text, alert = false) => {
    try { await ctx.answerCbQuery(text, { show_alert: alert }); } catch (e) {}
};

async function kill(ctx) {
    if (ctx.chat.type !== 'private') return ctx.reply(ui.combat.kill_group, { parse_mode: 'Markdown' });
    
    const gameState = state.getGameByPlayerId(ctx.from.id);
    if (!gameState || gameState.status !== "active") return ctx.reply(ui.report.idle, { parse_mode: 'Markdown' });
    
    const hunter = state.getPlayer(gameState, ctx.from.id);
    if (!hunter || !hunter.alive) return ctx.reply(ui.combat.kill_retired, { parse_mode: 'Markdown' });

    const buttons = gameState.players.filter(p => p.alive && p.id !== hunter.id).map(p => Markup.button.callback(`🔫 ${p.name}`, `shoot_${p.id}`));
    const keyboard = [];
    while (buttons.length > 0) keyboard.push(buttons.splice(0, 2));
    ctx.reply("🎯 *SELECT TARGET:*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

async function shootAction(ctx) {
    const game = require('./game'); 
    
    const gameState = state.getGameByPlayerId(ctx.from.id);
    if (!gameState) return safeAnswer(ctx, "Game expired.");
    const targetId = parseInt(ctx.match[1]);
    const hunter = state.getPlayer(gameState, ctx.from.id);
    if (!hunter || !hunter.alive) return safeAnswer(ctx, "Invalid.");
    
    ctx.deleteMessage();
    if (Date.now() > hunter.killUnlockTime) return ctx.reply(ui.combat.kill_locked, { parse_mode: 'Markdown' });

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
    const game = require('./game'); 

    if (ctx.chat.type !== 'private') return ctx.reply(ui.combat.guess_group, { parse_mode: 'Markdown' });
    
    const gameState = state.getGameByPlayerId(ctx.from.id);
    if (!gameState || gameState.status !== "active") return ctx.reply(ui.report.idle, { parse_mode: 'Markdown' });
    
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
    const game = require('./game'); 
    if (ctx.chat.type === 'private') return ctx.reply(ui.accuse.dm, { parse_mode: 'Markdown' });
    
    const gameState = state.getGame(ctx.chat.id);
    if (!gameState || gameState.status !== "active") return ctx.reply(ui.accuse.idle, { parse_mode: 'Markdown' });
    
    if (!ctx.message.reply_to_message) return ctx.reply("⚠️ Reply to suspect.");
    
    const accuser = state.getPlayer(gameState, ctx.from.id);
    const suspect = state.getPlayer(gameState, ctx.message.reply_to_message.from.id);
    if (!accuser?.alive || !suspect?.alive) return;

    const survivors = gameState.players.filter(p => p.alive).length;
    if (survivors < 5) return ctx.reply(`🛡️ **DISABLED!** Need 5+ players.`);

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

async function handleReport(ctx) {
    const game = require('./game'); 
    if (ctx.chat.type === 'private') return ctx.reply(ui.report.dm, { parse_mode: 'Markdown' });
    
    const gameState = state.getGame(ctx.chat.id);
    if (!gameState || gameState.status !== "active") return ctx.reply(ui.report.idle, { parse_mode: 'Markdown' });
    
    const survivors = gameState.players.filter(p => p.alive).length;
    if (survivors <= 2) return ctx.reply(ui.report.standoff, { parse_mode: 'Markdown' });

    if (!ctx.message.reply_to_message) return ctx.reply("⚠️ Reply to the inappropriate message.");
    const reporter = state.getPlayer(gameState, ctx.from.id);
    if (!reporter || !reporter.alive) return;

    let targetId = null;
    const repliedMsg = ctx.message.reply_to_message;
    if (repliedMsg.from.id === ctx.botInfo.id && repliedMsg.message_id === gameState.turn.questionMessageId) {
        targetId = gameState.turn.questionerId;
    } else {
        targetId = repliedMsg.from.id;
    }

    const target = state.getPlayer(gameState, targetId);
    if (!target || !target.alive) return ctx.reply(ui.report.invalid, { parse_mode: 'Markdown' });
    if (target.id === reporter.id) return ctx.reply(ui.report.self);

    if (!gameState.turn.reports.has(targetId)) gameState.turn.reports.set(targetId, new Set());
    const votes = gameState.turn.reports.get(targetId);
    if (votes.has(reporter.id)) return ctx.reply("⚠️ You already reported this.");
    votes.add(reporter.id);

    let votesNeeded = Math.ceil(survivors * 0.5); 
    if (survivors === 3) votesNeeded = 2;

    if (votes.size >= votesNeeded) {
        target.alive = false;
        await ctx.telegram.sendMessage(gameState.chatId, ui.report.executed(target.username), { parse_mode: 'Markdown' });
        gameState.turn.reports.clear();
        game.deathFlow(ctx, gameState, target.id);
    } else {
        ctx.reply(ui.report.logged(target.username, votes.size, votesNeeded), { parse_mode: 'Markdown' });
    }
}

function startStandoff(ctx, gameState) {
    if (gameState.turn.timer) clearInterval(gameState.turn.timer);
    if (gameState.turn.askTimer) clearInterval(gameState.turn.askTimer);
    if (gameState.standoff.timer) clearTimeout(gameState.standoff.timer);
    if (gameState.standoff.reminderTimer) clearTimeout(gameState.standoff.reminderTimer);

    gameState.status = "standoff";
    gameState.standoff = { active: true, round: 1, timer: null, reminderTimer: null };
    
    const survivors = gameState.players.filter(p => p.alive);
    //
