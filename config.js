module.exports = {
    // 👑 YOUR ADMIN ID (Get this from @userinfobot)
    OWNER_ID: 7708811819, // <--- REPLACE THIS WITH YOUR NUMERIC TELEGRAM ID

    // 🔑 YOUR BOT TOKEN
    BOT_TOKEN: '7689161380:AAFSNDnHJIqbE6rIlw5047_UZPsnFwvpXgU',

    // ⏱️ TIMERS (in seconds)
    AFK_LIMIT_SECONDS: 120,    // Time to talk in group before exploding
    KILL_WINDOW_SECONDS: 60,   // Time hunter has to kill after trap word
    CHECK_INTERVAL: 3000,      // How often to check AFK (ms)

    // 🗣️ TRAP WORDS
    TRAP_WORDS: [
        "time", "food", "work", "home", "money", "sleep", "water", 
        "tired", "hungry", "phone", "weather", "today", "tomorrow", 
        "yes", "no", "maybe", "help", "lol", "good", "bad", "game",
        "really", "wait", "stop", "go", "ready", "done", "what"
    ]
};

