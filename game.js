const config = require('./config');
const state = require('./state');
const ui = require('./ui');
const logger = require('./logger');
const combat = require('./combat'); // Circular dependency handled by function passing if needed

async function start(ctx, gameState) {
    gameState.status = "active";
    logger.log(`GAME STARTED: ${gameState.chatId}`);
    
    gameState.players.sort(() => Math.random() - 0.5);
    for (let i = 0; i < gameState.players.length; i++) {
        const hunter = gameState.players[i];
        const target = gameState.players[(i + 1) % gameState.players.length];
        hunter.targetId = target.id;
        hunter.trapWord = state.getRandomWord();
        hunter.lastSeen = Date.now();
        try { await ctx.telegram.sendMessage(hunter.id, ui.dm.mission(target.name, hunter.trapWord, config.AFK_LIMIT_SECONDS), { parse_mode: 'Markdown' }); } catch(e){}
    }
    ctx.telegram.sendMessage(gameState.chatId, ui.group.start, { parse_mode: 'Markdown' });
    nextTurn(ctx, gameState);
    startAFKLoop(ctx, gameState);
}

function startAFKLoop(ctx, gameState) {
    const interval = setInterval(async () => {
        if (!state.getGame(gameState.chatId) || gameState.status !== "active") { clearInterval(interval); return; }
        const now = Date.now();
        for (const p of gameState.players) {
            if (!p.alive) continue;
            if ((now - p.lastSeen) / 1000 > config.AFK_LIMIT_SECONDS) {
                p.alive = false;
                await ctx.telegram.sendMessage(gameState.chatId, ui.group.afkDeath(p.username), { parse_mode: 'Markdown' });
                deathFlow(ctx, gameState, p.id);
            }
        }
    }, config.CHECK_INTERVAL);
}

async function nextTurn(ctx, gameState) {
    if (gameState.status !== "active") return;
    if (gameState.turn.timer) clearInterval(gameState.turn.timer);
    if (gameState.turn.askTimer) clearTimeout(gameState.turn.askTimer);

    const alive = gameState.players.filter(p => p.alive);
    if (alive.length < 2) return;

    let idx = (gameState.turn.playerIndex + 1) % gameState.players.length;
    while (!gameState.players[idx].alive) idx = (idx + 1) % gameState.players.length;

    gameState.turn.playerIndex = idx;
    gameState.turn.questionerId = gameState.players[idx].id;
    gameState.turn.phase = "ask_dm";
    gameState.turn.answeredIds = [];

    await ctx.telegram.sendMessage(gameState.chatId, "🕵️ Next Turn...");
    try {
        await ctx.telegram.sendMessage(gameState.turn.questionerId, ui.dm.yourTurnAsk, { parse_mode: 'Markdown' });
        gameState.turn.askTimer = setTimeout(() => { if (gameState.turn.phase === "ask_dm") nextTurn(ctx, gameState); }, 60000);
    } catch(e) { nextTurn(ctx, gameState); }
}

async function handleText(ctx, next) {
    if (ctx.chat.type === 'private') {
        const gameState = state.getGameByPlayerId(ctx.from.id);
        if (gameState && gameState.status === "active" && gameState.turn.phase === "ask_dm" && ctx.from.id === gameState.turn.questionerId) {
            if (ctx.message.text.startsWith('/')) return next();
            if (gameState.turn.askTimer) clearTimeout(gameState.turn.askTimer);
            gameState.turn.phase = "wait_group";
            await ctx.reply("✅ Sent!");
            const sent = await ctx.telegram.sendMessage(gameState.chatId, ui.group.question(ctx.message.text), { parse_mode: 'Markdown' });
            gameState.turn.questionMessageId = sent.message_id;
            try { await ctx.telegram.pinChatMessage(gameState.chatId, sent.message_id); } catch(e){}
            startAnswerTimer(ctx, gameState);
        }
        return next();
    }

    const gameState = state.getGame(ctx.chat.id);
    if (!gameState || gameState.status !== "active") return;
    const player = state.getPlayer(gameState, ctx.from.id);
    if (!player?.alive) return;
    player.lastSeen = Date.now();

    if (gameState.turn.phase === "wait_group" && ctx.message.reply_to_message?.message_id === gameState.turn.questionMessageId) {
        if (!gameState.turn.answeredIds.includes(player.id)) {
            gameState.turn.answeredIds.push(player.id);
            try { await ctx.react('✅'); } catch(e){}
        }
        if (gameState.turn.answeredIds.length >= gameState.players.filter(p=>p.alive).length) {
            try { await ctx.telegram.unpinChatMessage(gameState.chatId, { message_id: gameState.turn.questionMessageId }); } catch(e){}
            await ctx.reply("✅ All Complied.");
            nextTurn(ctx, gameState);
        }
    }

    const hunter = gameState.players.find(p => p.targetId === player.id && p.alive);
    if (hunter && new RegExp(`\\b${hunter.trapWord}\\b`, 'i').test(ctx.message.text)) {
        hunter.killUnlockTime = Date.now() + (config.KILL_WINDOW_SECONDS * 1000);
        try { await ctx.telegram.sendMessage(hunter.id, ui.dm.locked(hunter.trapWord), { parse_mode: 'Markdown' }); } catch(e){}
    }
}

function startAnswerTimer(ctx, gameState) {
    gameState.turn.timeLeft = 120;
    gameState.turn.timer = setInterval(async () => {
        if (gameState.status !== "active") { clearInterval(gameState.turn.timer); return; }
        gameState.turn.timeLeft--;
        if (gameState.turn.timeLeft === 30) await ctx.telegram.sendMessage(gameState.chatId, ui.group.timerWarning(30, "Everyone"), { parse_mode: 'Markdown' });
        if (gameState.turn.timeLeft <= 0) {
            clearInterval(gameState.turn.timer);
            gameState.players.filter(p => p.alive && !gameState.turn.answeredIds.includes(p.id)).forEach(p => p.alive = false);
            checkWinner(ctx, gameState);
        }
    }, 1000);
}

function checkWinner(ctx, gameState) {
    const survivors = gameState.players.filter(p => p.alive);
    if (survivors.length === 1) {
        logger.log(`WINNER: ${survivors[0].name}`);
        ctx.telegram.sendMessage(gameState.chatId, ui.victory(survivors[0].username), { parse_mode: 'Markdown' });
        state.deleteGame(gameState.chatId);
    } else if (survivors.length === 0) {
        ctx.telegram.sendMessage(gameState.chatId, "☠️ Everyone died.");
        state.deleteGame(gameState.chatId);
    } else if (survivors.length === 2 && gameState.status !== "standoff") {
        combat.startStandoff(ctx, gameState);
    } else if (gameState.status !== "standoff") {
        nextTurn(ctx, gameState);
    }
}

function deathFlow(ctx, gameState, deadId, hunter = null) {
    const survivors = gameState.players.filter(p => p.alive);
    if (survivors.length <= 2) { checkWinner(ctx, gameState); return; }
    
    // Repair chain
    const deadGuy = state.getPlayer(gameState, deadId);
    const killer = gameState.players.find(p => p.targetId === deadId && p.alive);
    if (killer && deadGuy) {
        const newTarget = state.getPlayer(gameState, deadGuy.targetId);
        if (newTarget) {
            killer.targetId = newTarget.id;
            killer.trapWord = state.getRandomWord();
            killer.killUnlockTime = 0;
            try { ctx.telegram.sendMessage(killer.id, ui.dm.mission(newTarget.name, killer.trapWord, config.AFK_LIMIT_SECONDS), { parse_mode: 'Markdown' }); } catch(e){}
        }
    }
    if (gameState.turn.questionerId === deadId) nextTurn(ctx, gameState);
}

module.exports = { start, handleText, checkWinner, deathFlow };
