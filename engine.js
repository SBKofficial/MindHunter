const lobby = require('./lobby');
const combat = require('./combat');
const game = require('./game');
const state = require('./state');
const ui = require('./ui');
const logger = require('./logger');

const init = (bot) => logger.init(bot);

const listPlayers = async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply(ui.list.dm_error, { parse_mode: 'Markdown' });
    const gameState = state.getGame(ctx.chat.id);
    if (!gameState) return ctx.reply(ui.list.noGame, { parse_mode: 'Markdown' });
    const p = state.getPlayer(gameState, ctx.from.id);
    if (!p) return ctx.reply(ui.list.denied, { parse_mode: 'Markdown' });
    
    if (gameState.players.length === 0) return ctx.reply(ui.list.noGame, { parse_mode: 'Markdown' });

    await ctx.reply(`${ui.list.header}\n\n${gameState.players.map(pl => ui.list.format(pl)).join('\n')}`, { parse_mode: 'Markdown' });
};

module.exports = {
    init,
    logEvent: logger.log, // 👈 THIS WAS MISSING. NOW FIXED.
    createLobby: lobby.create,
    joinGame: lobby.join,
    skipLobby: lobby.skip,
    handleKill: combat.kill,
    handleShootAction: combat.shootAction,
    handleGuess: combat.guess,
    handleAccuse: combat.accuse,
    handleStandoffChoice: combat.standoffChoice,
    handleReport: combat.handleReport,
    handleText: game.handleText,
    listPlayers
};
