const { Markup } = require('telegraf');
const config = require('./config');
const state = require('./state');
const ui = require('./ui');

let botInstance = null; 
const gameState = state.gameState;

const init = (bot) => { botInstance = bot; };

// 📠 THE LOGGER FUNCTION
const logEvent = (text) => {
    if (config.LOG_GROUP_ID && botInstance) {
        // We use a try-catch to ensure logging never crashes the actual game
        botInstance.telegram.sendMessage(config.LOG_GROUP_ID, `📝 ${text}`).catch(e => console.log("Log Error:", e.message));
    }
};

// --- 🎮 LOBBY SYSTEM ---
async function createLobby(ctx) {
    if (gameState.status !== "idle") return ctx.reply("⚠️ Game running.");
    if (ctx.chat.type === 'private') return ctx.reply("⚠️ Use in Group Chat.");
    
    if (gameState.players.length > 0) state.reset();

    gameState.status = "lobby";
    gameState.chatId = ctx.chat.id;
    gameState.creatorId = ctx.from.id; 
    
    // LOG IT
    logEvent(`LOBBY CREATED\nUser: ${ctx.from.first_name}\nChat: ${ctx.chat.title} (${ctx.chat.id})`);

    const msg = await ctx.reply(
        ui.lobby.text(ctx.from.first_name, 120, []), 
        { parse_mode: 'Markdown', ...ui.lobby.keyboard }
    );
    gameState.lobbyMessageId = msg.message_id; 

    try { await ctx.telegram.pinChatMessage(gameState.chatId, gameState.lobbyMessageId); } catch (e) { ctx.reply("⚠️ Make me Admin to pin the lobby!"); }

    ctx.reply("💡 Creator: Type /skip to start.");
    startLobbyTimer(ctx);
}

async function joinGame(ctx) {
    if (gameState.status !== "lobby") return ctx.answerCbQuery("Lobby closed!");
    const userId = ctx.from.id;
    if (gameState.players.some(p => p.id === userId)) return ctx.answerCbQuery("Already joined!");

    try {
        await ctx.telegram.sendMessage(userId, ui.dm.welcome, { parse_mode: 'Markdown' });
    } catch (e) {
        return ctx.answerCbQuery("❌ ERROR: Start bot in DM first!", { show_alert: true });
    }

    gameState.players.push({
        id: userId,
        name: ctx.from.first_name,
        username: ctx.from.username || "Unknown",
        targetId: null,
        trapWord: null,
        killUnlockTime: 0,
        lastSeen: Date.now(),
        alive: true,
        hasShield: false
    });
    
    // LOG IT
    logEvent(`PLAYER JOINED\nName: ${ctx.from.first_name}\nTotal: ${gameState.players.length}`);

    ctx.answerCbQuery("Ledger Signed.");
    await ctx.telegram.sendMessage(gameState.chatId, ui.group.joined(ctx.from.first_name), { parse_mode: 'Markdown' });

    try {
        await ctx.telegram.editMessageText(
            gameState.chatId, 
            gameState.lobbyMessageId, 
            null, 
            ui.lobby.text(state.getPlayer(gameState.creatorId)?.name || "Unknown", "ACTIVE", gameState.players),
            { parse_mode: 'Markdown', ...ui.lobby.keyboard }
        );
    } catch (e) {}
}

async function skipLobby(ctx) {
    if (gameState.status !== "lobby") return ctx.reply("No lobby.");
    if (ctx.from.id !== gameState.creatorId) return ctx.reply("⛔ Creator only.");
    
    logEvent(`LOBBY SKIPPED by Host.`);
    clearInterval(gameState.lobbyTimer); 
    try {
        await ctx.telegram.unpinChatMessage(gameState.chatId, { message_id: gameState.lobbyMessageId });
        await ctx.telegram.deleteMessage(gameState.chatId, gameState.lobbyMessageId);
    } catch (e) {}

    if (gameState.players.length < 3) {
        ctx.reply(ui.lobby.insufficient, { parse_mode: 'Markdown' });
        state.reset();
        return;
    }
    startGame(ctx); 
}

// --- 📋 UTILITIES ---
async function listPlayers(ctx) {
    if (gameState.status === "idle") return ctx.reply(ui.list.noGame, { parse_mode: 'Markdown' });
    const requestor = state.getPlayer(ctx.from.id);
    if (!requestor) return ctx.reply(ui.list.denied, { parse_mode: 'Markdown' });
    
    // Log confidential access
    logEvent(`REGISTRY CHECKED by ${ctx.from.first_name}`);
    
    const playerList = gameState.players.map(p => ui.list.format(p)).join('\n');
    await ctx.reply(`${ui.list.header}\n\n${playerList}`, { parse_mode: 'Markdown' });
}

// --- ⚔️ MECHANICS ---
async function handleKill(ctx) {
    if (gameState.status !== "active") return ctx.reply("⚠️ No active game.");
    if (ctx.chat.type !== 'private') return ctx.reply("❌ DM only.");
    const hunter = state.getPlayer(ctx.from.id);
    if (!hunter || !hunter.alive) return ctx.reply("You are dead/spectating.");
    
    // Log intent
    logEvent(`KILL COMMAND INITIATED\nHunter: ${hunter.name}`);

    const buttons = gameState.players.filter(p => p.alive && p.id !== hunter.id).map(p => Markup.button.callback(`🔫 ${p.name}`, `shoot_${p.id}`));
    const keyboard = [];
    while (buttons.length > 0) keyboard.push(buttons.splice(0, 2)); 
    ctx.reply("🎯 *SELECT TARGET:*", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

async function handleShootAction(ctx) {
    const targetId = parseInt(ctx.match[1]);
    const hunter = state.getPlayer(ctx.from.id);
    if (!hunter || !hunter.alive || gameState.status !== "active") return ctx.answerCbQuery("Invalid.");
    ctx.deleteMessage(); 
    if (Date.now() > hunter.killUnlockTime) return ctx.reply("🔒 Weapon Locked.");

    if (targetId !== hunter.targetId) {
        // WRONG TARGET
        logEvent(`FAILED KILL (WRONG TARGET)\nHunter: ${hunter.name} -> Died.`);
        hunter.alive = false;
        await ctx.telegram.sendMessage(gameState.chatId, ui.group.killFail(hunter.username), { parse_mode: 'Markdown' });
        ctx.reply("💀 You died.");
        handleDeathFlow(ctx, hunter.id);
    } else {
        const realTarget = state.getPlayer(targetId);
        if (realTarget.hasShield) {
            logEvent(`BLOCKED KILL (SHIELD)\nHunter: ${hunter.name} -> Target: ${realTarget.name}`);
            realTarget.hasShield = false;
            await ctx.telegram.sendMessage(gameState.chatId, ui.group.blocked(realTarget.username, hunter.username), { parse_mode: 'Markdown' });
            ctx.reply("❌ *BLOCKED!* They had a shield.", { parse_mode: 'Markdown' });
            hunter.killUnlockTime = 0;
            return;
        }
        logEvent(`SUCCESSFUL KILL\nHunter: ${hunter.name} -> Target: ${realTarget.name}`);
        realTarget.alive = false;
        await ctx.telegram.sendMessage(gameState.chatId, ui.group.killSuccess(realTarget.username), { parse_mode: 'Markdown' });
        ctx.reply("🎯 Target Eliminated.");
        handleDeathFlow(ctx, realTarget.id, hunter);
    }
}

async function handleGuess(ctx) {
    if (gameState.status !== "active") return ctx.reply("Game not active.");
    if (ctx.chat.type !== 'private') return ctx.reply("DM Only.");
    const player = state.getPlayer(ctx.from.id);
    if (!player || !player.alive) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 3) return ctx.reply("Usage: /guess @Hunter [word]");
    const hunterName = args[1];
    const word = args[2].toLowerCase();
    const hunter = state.getPlayerByName(hunterName);
    if (!hunter || !hunter.alive) return ctx.reply("Invalid player.");
    
    if (hunter.targetId === player.id && hunter.trapWord.toLowerCase() === word) {
        logEvent(`GUESS SUCCESS\nPrey: ${player.name} -> Killed Hunter: ${hunter.name}`);
        hunter.alive = false;
        await ctx.telegram.sendMessage(gameState.chatId, ui.group.reverseKill(player.username, hunter.username, word), { parse_mode: 'Markdown' });
        ctx.reply(ui.dm.guessSuccess, { parse_mode: 'Markdown' });
        handleDeathFlow(ctx, hunter.id);
    } else {
        logEvent(`GUESS FAIL\nPlayer: ${player.name} -> Died.`);
        player.alive = false;
        await ctx.telegram.sendMessage(gameState.chatId, ui.group.suicide(player.username), { parse_mode: 'Markdown' });
        ctx.reply(ui.dm.guessFail, { parse_mode: 'Markdown' });
        handleDeathFlow(ctx, player.id);
    }
}

async function handleAccuse(ctx) {
    if (gameState.status !== "active") return;
    if (!ctx.message.reply_to_message) return ctx.reply("⚠️ Reply to suspect.");
    const survivors = gameState.players.filter(p => p.alive).length;
    if (survivors < 5) return ctx.reply(`🛡️ **DISABLED!** Need 5+ players.`);
    const suspectId = ctx.message.reply_to_message.from.id;
    const accuser = state.getPlayer(ctx.from.id);
    const suspect = state.getPlayer(suspectId);
    if (!accuser || !accuser.alive || !suspect || !suspect.alive) return;
    if (suspect.targetId === accuser.id) {
        logEvent(`ACCUSATION SUCCESS\n${accuser.name} killed ${suspect.name}`);
        suspect.alive = false;
        await ctx.reply(`🛡️ *COUNTER!* @${accuser.username} killed assassin @${suspect.username}!`, { parse_mode: 'Markdown' });
        handleDeathFlow(ctx, suspect.id);
    } else {
        logEvent(`ACCUSATION FAIL\n${accuser.name} was paranoid and died.`);
        accuser.alive = false;
        await ctx.reply(`🤪 *PARANOIA!* @${accuser.username} was wrong & died.`, { parse_mode: 'Markdown' });
        handleDeathFlow(ctx, accuser.id);
    }
}

async function handleText(ctx, next) {
    if (ctx.chat.type === 'private') {
        if (gameState.status === "active" && gameState.turn.phase === "ask_dm" && ctx.from.id === gameState.turn.questionerId) {
            if (ctx.message.text.startsWith('/')) return next();
            if (gameState.turn.askTimer) clearTimeout(gameState.turn.askTimer);
            gameState.turn.phase = "wait_group"; 
            await ctx.reply("✅ Sent!");
            logEvent(`QUESTION ASKED\nBy: ${ctx.from.first_name}\nContent: "${ctx.message.text}"`);
            const sentMsg = await ctx.telegram.sendMessage(gameState.chatId, ui.group.question(ctx.message.text), { parse_mode: 'Markdown' });
            gameState.turn.questionMessageId = sentMsg.message_id;
            try { await ctx.telegram.pinChatMessage(gameState.chatId, sentMsg.message_id); } catch(e) {}
            startAnswerTimer(ctx);
            return;
        }
        return next();
    }
    if (gameState.status !== "active" || ctx.chat.id !== gameState.chatId) return;
    const player = state.getPlayer(ctx.from.id);
    if (!player || !player.alive) return;
    player.lastSeen = Date.now();
    if (gameState.turn.phase === "wait_group") {
        if (ctx.message.reply_to_message && ctx.message.reply_to_message.message_id === gameState.turn.questionMessageId) {
            if (!gameState.turn.answeredIds.includes(player.id)) {
                gameState.turn.answeredIds.push(player.id);
                try { await ctx.react('✅'); } catch(e) {} 
            }
            const survivors = gameState.players.filter(p => p.alive);
            if (gameState.turn.answeredIds.length >= survivors.length) {
                 try { await ctx.telegram.unpinChatMessage(gameState.chatId, { message_id: gameState.turn.questionMessageId }); } catch(e){}
                 await ctx.reply("✅ All associates have complied.");
                 nextTurn(ctx);
            }
        }
    }
    const hunter = gameState.players.find(p => p.targetId === player.id && p.alive);
    if (hunter) {
        const regex = new RegExp(`\\b${hunter.trapWord}\\b`, 'i');
        if (regex.test(ctx.message.text)) {
            logEvent(`TRAP WORD TRIGGERED\nPrey: ${player.name} said "${hunter.trapWord}"\nHunter Unlocked: ${hunter.name}`);
            hunter.killUnlockTime = Date.now() + (config.KILL_WINDOW_SECONDS * 1000);
            try { await ctx.telegram.sendMessage(hunter.id, ui.dm.locked(hunter.trapWord), { parse_mode: 'Markdown' }); } catch(e) {}
        }
    }
}

function startLobbyTimer(ctx) {
    let timeLeft = 120; 
    gameState.lobbyTimer = setInterval(async () => {
        timeLeft--;
        if (timeLeft <= 0) { 
            clearInterval(gameState.lobbyTimer); 
            try { 
                await ctx.telegram.unpinChatMessage(gameState.chatId, { message_id: gameState.lobbyMessageId });
                await ctx.telegram.deleteMessage(gameState.chatId, gameState.lobbyMessageId); 
            } catch (e) {}
            if (gameState.players.length < 3) {
                 ctx.telegram.sendMessage(gameState.chatId, ui.lobby.insufficient, { parse_mode: 'Markdown' });
                 state.reset();
            } else {
                 startGame(ctx);
            }
        }
    }, 1000);
}

async function startGame(ctx) {
    if (gameState.players.length < 3) {
        ctx.telegram.sendMessage(gameState.chatId, ui.lobby.insufficient, { parse_mode: 'Markdown' });
        state.reset();
        return;
    }
    logEvent(`GAME STARTED\nPlayers: ${gameState.players.map(p => p.name).join(', ')}`);
    gameState.status = "active";
    gameState.players.sort(() => Math.random() - 0.5);
    for (let i = 0; i < gameState.players.length; i++) {
        const hunter = gameState.players[i];
        const target = gameState.players[(i + 1) % gameState.players.length];
        hunter.targetId = target.id;
        hunter.trapWord = state.getRandomWord();
        hunter.lastSeen = Date.now(); 
        try {
            await ctx.telegram.sendMessage(hunter.id, ui.dm.mission(target.name, hunter.trapWord, config.AFK_LIMIT_SECONDS), { parse_mode: 'Markdown' });
        } catch (e) {}
    }
    ctx.telegram.sendMessage(gameState.chatId, ui.group.start, { parse_mode: 'Markdown' });
    gameState.turn.active = true;
    gameState.turn.playerIndex = -1;
    nextTurn(ctx);
    startGameLoop(ctx);
}

function startGameLoop(ctx) {
    const interval = setInterval(async () => {
        if (gameState.status !== "active") { clearInterval(interval); return; }
        const now = Date.now();
        for (const p of gameState.players) {
            if (!p.alive) continue;
            if ((now - p.lastSeen) / 1000 > config.AFK_LIMIT_SECONDS) {
                p.alive = false;
                logEvent(`AFK DEATH\nPlayer: ${p.name} timed out.`);
                await ctx.telegram.sendMessage(gameState.chatId, ui.group.afkDeath(p.username), { parse_mode: 'Markdown' });
                handleDeathFlow(ctx, p.id);
            }
        }
    }, config.CHECK_INTERVAL);
}

function startRouletteMode(ctx) {
    if (gameState.turn.timer) clearInterval(gameState.turn.timer);
    if (gameState.turn.askTimer) clearTimeout(gameState.turn.askTimer);
    gameState.status = "roulette"; 
    const survivors = gameState.players.filter(p => p.alive);
    logEvent(`ROULETTE MODE\nFinalists: ${survivors[0].name} vs ${survivors[1].name}`);
    gameState.roulette.active = true;
    gameState.roulette.chamber = 0;
    gameState.roulette.bulletPosition = Math.floor(Math.random() * 6); 
    gameState.roulette.turnId = survivors[0].id;
    ctx.telegram.sendMessage(gameState.chatId, ui.roulette.intro(survivors[0].username, survivors[1].username), { parse_mode: 'Markdown' });
    startShotTimer(ctx);
}

async function handleTrigger(ctx) {
    if (gameState.status !== "roulette") return;
    const player = state.getPlayer(ctx.from.id);
    if (!player || player.id !== gameState.roulette.turnId) return ctx.reply("Not your turn!");
    if (gameState.roulette.shotTimer) clearTimeout(gameState.roulette.shotTimer);
    if (gameState.roulette.chamber === gameState.roulette.bulletPosition) {
        logEvent(`ROULETTE DEATH\nPlayer: ${player.name} got the bullet.`);
        player.alive = false;
        await ctx.reply(ui.roulette.bang(player.username), { parse_mode: 'Markdown' });
        checkWinner(ctx);
    } else {
        logEvent(`ROULETTE CLICK\nPlayer: ${player.name} is safe.`);
        gameState.roulette.chamber++;
        const survivors = gameState.players.filter(p => p.alive);
        const nextPlayer = survivors.find(p => p.id !== player.id);
        gameState.roulette.turnId = nextPlayer.id;
        await ctx.reply(ui.roulette.click(nextPlayer.username, 6 - gameState.roulette.chamber), { parse_mode: 'Markdown' });
        startShotTimer(ctx);
    }
}

function startShotTimer(ctx) {
    gameState.roulette.shotTimer = setTimeout(async () => {
        if (gameState.status !== "roulette") return;
        const coward = state.getPlayer(gameState.roulette.turnId);
        if (coward && coward.alive) {
            coward.alive = false;
            logEvent(`ROULETTE TIMEOUT\nPlayer: ${coward.name} failed to pull trigger.`);
            await ctx.telegram.sendMessage(gameState.chatId, `⏱️ Timeout! @${coward.username} died.`);
            checkWinner(ctx);
        }
    }, 30000);
}

async function nextTurn(ctx) {
    if (gameState.status !== "active") return;
    if (gameState.turn.timer) clearInterval(gameState.turn.timer);
    if (gameState.turn.askTimer) clearTimeout(gameState.turn.askTimer);
    const alivePlayers = gameState.players.filter(p => p.alive);
    if (alivePlayers.length < 2) return;
    let nextIndex = (gameState.turn.playerIndex + 1) % gameState.players.length;
    let loops = 0;
    while (!gameState.players[nextIndex].alive && loops < gameState.players.length) {
        nextIndex = (nextIndex + 1) % gameState.players.length;
        loops++;
    }
    gameState.turn.playerIndex = nextIndex;
    gameState.turn.questionerId = gameState.players[nextIndex].id;
    gameState.turn.phase = "ask_dm";
    gameState.turn.answeredIds = [];
    await ctx.telegram.sendMessage(gameState.chatId, "🕵️ Next Turn...");
    try {
        await ctx.telegram.sendMessage(gameState.turn.questionerId, ui.dm.yourTurnAsk, { parse_mode: 'Markdown' });
        gameState.turn.askTimer = setTimeout(() => {
             if (gameState.turn.phase === "ask_dm") nextTurn(ctx); 
        }, 60000); 
    } catch(e) { nextTurn(ctx); }
}

function startAnswerTimer(ctx) {
    gameState.turn.timeLeft = 120; 
    gameState.turn.timer = setInterval(async () => {
        if (gameState.status !== "active") { clearInterval(gameState.turn.timer); return; }
        gameState.turn.timeLeft--;
        const t = gameState.turn.timeLeft;
        if (t === 60 || t === 10) {
            const unanswered = gameState.players.filter(p => p.alive && !gameState.turn.answeredIds.includes(p.id));
            if (unanswered.length > 0) {
                const mentions = unanswered.map(p => `@${p.username}`).join(' ');
                await ctx.telegram.sendMessage(gameState.chatId, ui.group.timerWarning(t, mentions), { parse_mode: 'Markdown' });
            }
        }
        if (t <= 0) {
            clearInterval(gameState.turn.timer);
            const unanswered = gameState.players.filter(p => p.alive && !gameState.turn.answeredIds.includes(p.id));
            for (const p of unanswered) { p.alive = false; } 
            
            const survivors = gameState.players.filter(pl => pl.alive);
            if (survivors.length <= 1) checkWinner(ctx);
            else if (survivors.length === 2) startRouletteMode(ctx);
            else nextTurn(ctx);
        }
    }, 1000);
}

function handleDeathFlow(ctx, deadId, successfulHunter = null) {
    const survivors = gameState.players.filter(p => p.alive);
    if (survivors.length <= 1) { checkWinner(ctx); return; }
    if (survivors.length === 2) { startRouletteMode(ctx); return; }
    repairChain(deadId, ctx, successfulHunter);
    if (gameState.turn.questionerId === deadId) {
        ctx.telegram.sendMessage(gameState.chatId, "🎤 Interrogator died.");
        nextTurn(ctx);
    }
}

async function repairChain(deadId, ctx, successfulHunter = null) {
    const deadGuy = state.getPlayer(deadId);
    const hunter = gameState.players.find(p => p.targetId === deadId && p.alive);
    if (hunter && deadGuy) {
        const newTarget = state.getPlayer(deadGuy.targetId);
        if (newTarget) {
            hunter.targetId = newTarget.id;
            hunter.trapWord = state.getRandomWord();
            hunter.killUnlockTime = 0;
            try { await ctx.telegram.sendMessage(hunter.id, ui.dm.mission(newTarget.name, hunter.trapWord, config.AFK_LIMIT_SECONDS), { parse_mode: 'Markdown' }); } catch(e){}
        }
    }
}

function checkWinner(ctx) {
    const survivors = gameState.players.filter(p => p.alive);
    if (survivors.length === 1) { 
        logEvent(`GAME OVER\nWinner: ${survivors[0].name}`);
        ctx.telegram.sendMessage(gameState.chatId, ui.victory(survivors[0].username), { parse_mode: 'Markdown' }); 
        state.reset(); 
    } else if (survivors.length === 0) {
        logEvent(`GAME OVER\nNo Survivors.`);
        ctx.telegram.sendMessage(gameState.chatId, "☠️ Game Over. Everyone died."); 
        state.reset();
    }
}

module.exports = {
    createLobby, joinGame, skipLobby, handleKill, handleShootAction, 
    handleGuess, handleAccuse, handleText, handleTrigger, checkWinner, 
    init, logEvent, getPlayer: state.getPlayer, listPlayers
};
