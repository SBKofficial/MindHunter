const config = require('./config');

// 🗄️ THE MULTI-GROUP DATABASE
const games = new Map(); // Key: GroupChatId, Value: GameStateObject
const playerDirectory = new Map(); // Key: UserId, Value: GroupChatId (Where they are playing)

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
            askTimer: null
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

// Find which game a user is in (Crucial for DMs)
const getGameByPlayerId = (userId) => {
    const chatId = playerDirectory.get(userId);
    if (!chatId) return null;
    return games.get(chatId);
};

const getPlayer = (game, userId) => game.players.find(p => p.id === userId);

const getPlayerByName = (game, username) => {
    if (!username) return null;
    const cleanName = username.replace('@', '').toLowerCase();
    return game.players.find(p => p.username.toLowerCase() === cleanName);
};

const getRandomWord = () => config.TRAP_WORDS[Math.floor(Math.random() * config.TRAP_WORDS.length)];

const addPlayerToDirectory = (userId, chatId) => playerDirectory.set(userId, chatId);
const removePlayerFromDirectory = (userId) => playerDirectory.delete(userId);

const deleteGame = (chatId) => {
    const game = games.get(chatId);
    if (game) {
        // Clear all timers
        if (game.lobbyTimer) clearInterval(game.lobbyTimer);
        if (game.turn.timer) clearInterval(game.turn.timer);
        if (game.turn.askTimer) clearTimeout(game.turn.askTimer);
        if (game.standoff.timer) clearTimeout(game.standoff.timer);
        if (game.standoff.reminderTimer) clearTimeout(game.standoff.reminderTimer);
        
        // Free players
        game.players.forEach(p => playerDirectory.delete(p.id));
        games.delete(chatId);
    }
    console.log(`🗑️ Game deleted for chat ${chatId}`);
};

module.exports = {
    games, createGame, getGame, getGameByPlayerId, 
    getPlayer, getPlayerByName, getRandomWord, 
    addPlayerToDirectory, removePlayerFromDirectory, deleteGame
};
            
