const config = require('./config');

const gameState = {
    status: "idle",
    lobbyTimer: null,
    chatId: null,
    creatorId: null, 
    lobbyMessageId: null, 
    players: [],
    turn: {
        active: false,
        playerIndex: 0,      
        phase: "idle",       
        questionerId: null,  
        answeredIds: [],
        questionMessageId: null,
        timer: null,
        timeLeft: 0,
        askTimer: null 
    },
    // 👇 NEW: STANDOFF STATE
    standoff: {
        active: false,
        round: 0,
        timer: null,
        reminderTimer: null,
        moves: {},        // Stores current round choices: { playerId: 'shoot' }
        lastMoves: {}     // Stores previous round choices (for Cooldowns)
    }
};

const getPlayer = (id) => gameState.players.find(p => p.id === id);
const getPlayerByName = (username) => gameState.players.find(p => p.username.toLowerCase() === username.toLowerCase().replace('@', ''));
const getRandomWord = () => config.TRAP_WORDS[Math.floor(Math.random() * config.TRAP_WORDS.length)];

const reset = () => {
    if (gameState.lobbyTimer) clearInterval(gameState.lobbyTimer);
    if (gameState.turn.timer) clearInterval(gameState.turn.timer);
    if (gameState.turn.askTimer) clearTimeout(gameState.turn.askTimer);
    
    // Clear Standoff Timers
    if (gameState.standoff.timer) clearTimeout(gameState.standoff.timer);
    if (gameState.standoff.reminderTimer) clearTimeout(gameState.standoff.reminderTimer);

    gameState.status = "idle";
    gameState.lobbyTimer = null;
    gameState.chatId = null;
    gameState.creatorId = null;
    gameState.lobbyMessageId = null; 
    gameState.players = []; 
    
    gameState.turn = { active: false, playerIndex: 0, phase: "idle", questionerId: null, answeredIds: [], questionMessageId: null, timer: null, timeLeft: 0, askTimer: null };
    gameState.standoff = { active: false, round: 0, timer: null, reminderTimer: null, moves: {}, lastMoves: {} };
    
    console.log("🔄 State Reset.");
};

module.exports = {
    gameState, getPlayer, getPlayerByName, getRandomWord, reset
};
        
