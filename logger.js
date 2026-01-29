const config = require('./config');

let botInstance = null;

const init = (bot) => { botInstance = bot; };

const log = (text) => {
    console.log(text); // Print to console
    if (config.LOG_GROUP_ID && botInstance) {
        // Send to Telegram Log Channel
        botInstance.telegram.sendMessage(config.LOG_GROUP_ID, `📝 ${text}`)
            .catch(e => console.error("Logger Failed:", e.message));
    }
};

module.exports = { init, log };
