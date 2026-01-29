const config = require('./config');

// 🗄️ THE MULTI-GROUP DATABASE
const games = new Map(); // Key: GroupChatId, Value: GameStateObject
const playerDirectory = new Map(); // Key: UserId, Value: GroupChatId

const createGame = (chatId, creatorId) => {
    const newGame = {
        chatId: chatId,
        status: "lobby",
        creatorId: creatorId,
        lobbyMessageId: null,
        lobbyTimer: null,
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
            askTimer: null,
            reports: new Map() 
        },
        standoff: {
            active: false,
            round: 0,
            timer: null,
            reminderTimer: null,
            moves: {},
            lastMoves: {}
        }
    };
    games.set(chatId, newGame);
    return newGame;
};

const getGame = (chatId) => games.get(chatId);

const getGameByPlayerId = (userId) => {
    const chatId = playerDirectory.get(userId);
    if (!chatId) return null;
    
    const game = games.get(chatId);
    
    // 🛡️ SELF-HEALING FIX:
    // If directory says user is in a game, but that game doesn't exist anymore,
    // clean up the trash so the user isn't "stuck".
    if (!game) {
        console.log(`🧹 Cleaning stuck player ${userId} from directory.`);
        playerDirectory.delete(userId);
        return null;
    }
    
    return game;
};

const getPlayer = (game, userId) => game ? game.players.find(p => p.id === userId) : null;
const getPlayerByName = (game, username) => {
    if (!username || !game) return null;
    const cleanName = username.replace('@', '').toLowerCase();
    return game.players.find(p => p.username.toLowerCase() === cleanName);
};
const getRandomWord = () => config.TRAP_WORDS[Math.floor(Math.random() * config.TRAP_WORDS.length)];
const addPlayerToDirectory = (userId, chatId) => playerDirectory.set(userId, chatId);
const removePlayerFromDirectory = (userId) => playerDirectory.delete(userId);
const deleteGame = (chatId) => {
    const game = games.get(chatId);
    if (game) {
        if (game.lobbyTimer) clearInterval(game.lobbyTimer);
        if (game.turn.timer) clearInterval(game.turn.timer);
        if (game.turn.askTimer) clearInterval(game.turn.askTimer);
        if (game.standoff.timer) clearTimeout(game.standoff.timer);
        if (game.standoff.reminderTimer) clearTimeout(game.standoff.reminderTimer);
        game.players.forEach(p => playerDirectory.delete(p.id));
        games.delete(chatId);
    }
};

module.exports = {
    games, createGame, getGame, getGameByPlayerId, 
    getPlayer, getPlayerByName, getRandomWord, 
    addPlayerToDirectory, removePlayerFromDirectory, deleteGame
};
