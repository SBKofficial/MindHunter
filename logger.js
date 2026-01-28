const config = require('./config');

let botInstance = null;

const init = (bot) => { botInstance = bot; };

const log = (text) => {
    if (config.LOG_GROUP_ID && botInstance) {
        botInstance.telegram.sendMessage(config.LOG_GROUP_ID, `📝 ${text}`)
            .catch(e => console.log("Log Error:", e.message));
    }
};

module.exports = { init, log };
