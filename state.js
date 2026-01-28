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
    roulette: {
        active: false,
        turnId: null,      
        chamber: 0,        
        bulletPosition: 0,
        shotTimer: null
    }
};

const getPlayer = (id) => gameState.players.find(p => p.id === id);
const getPlayerByName = (username) => gameState.players.find(p => p.username.toLowerCase() === username.toLowerCase().replace('@', ''));
const getRandomWord = () => config.TRAP_WORDS[Math.floor(Math.random() * config.TRAP_WORDS.length)];

const reset = () => {
    if (gameState.lobbyTimer) clearInterval(gameState.lobbyTimer);
    if (gameState.turn.timer) clearInterval(gameState.turn.timer);
    if (gameState.turn.askTimer) clearTimeout(gameState.turn.askTimer);
    if (gameState.roulette.shotTimer) clearTimeout(gameState.roulette.shotTimer);

    gameState.status = "idle";
    gameState.lobbyTimer = null;
    gameState.chatId = null;
    gameState.creatorId = null;
    gameState.lobbyMessageId = null; 
    gameState.players = []; 
    
    gameState.turn = { active: false, playerIndex: 0, phase: "idle", questionerId: null, answeredIds: [], questionMessageId: null, timer: null, timeLeft: 0, askTimer: null };
    gameState.roulette = { active: false, turnId: null, chamber: 0, bulletPosition: 0, shotTimer: null };
    
    console.log("🔄 State Reset.");
};

module.exports = {
    gameState, getPlayer, getPlayerByName, getRandomWord, reset
};

