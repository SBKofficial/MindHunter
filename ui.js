const { Markup } = require('telegraf');

// 🛡️ CRASH FIX: Escapes special Markdown characters
// This fixes the "Bad Request: can't parse entities" error
const escape = (text) => {
    if (!text) return "Unknown";
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};

module.exports = {
    // 🏠 LOBBY SYSTEM
    lobby: {
        text: (creator, time, players = []) => {
            const names = players.length > 0 
                ? players.map(p => `• ${escape(p.name)}`).join('\n')
                : "• (No associates yet)";

            return `🕯️ *THE CONTINENTAL*\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `*CONTRACT:* Open Bounty\n` +
            `*CLIENT:* Mr. ${escape(creator)}\n` +
            `*STATUS:* Recruiting Associates...\n` +
            `⏳ *WINDOW:* ${time}s\n\n` +
            `*CURRENT ROSTER:*\n${names}\n\n` +
            `*DIRECTIVE:* Sign the ledger to accept.`;
        },
        keyboard: Markup.inlineKeyboard([Markup.button.callback("🖋️ Sign Ledger", "join_game")]),
        insufficient: `💼 *CONTRACT REVOKED*\n\nStandard protocols require a minimum of 3 associates.`
    },

    // 📋 STATUS REPORTS (/players)
    list: {
        noGame: "⚠️ *NO ACTIVE CONTRACTS*\n\nBusiness is closed for the evening.",
        denied: "🚫 *EXCOMMUNICADO*\n\nYou are not authorized to view the registry.",
        header: "📂 *ASSOCIATE REGISTRY*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬",
        format: (p) => {
            let icon = p.alive ? "🤵" : "⚰️";
            if (p.hasShield) icon = "🧥"; 
            return `${icon} ${escape(p.name)}`;
        }
    },

    // 🕵️ DM BRIEFINGS
    dm: {
        welcome: "💼 *SECURE LINE ACTIVE.*\n\nWe will contact you shortly. Return to the lounge.",
        mission: (target, word, afkTime) =>
            `📜 *NEW CONTRACT*\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `🎯 *MARK:* ${escape(target)}\n` +
            `🗝️ *METHOD:* \`${word.toUpperCase()}\`\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
            `*INSTRUCTIONS:*\n` +
            `1. Manipulate the Mark into speaking the *METHOD*.\n` +
            `2. Wait for the "Green Light".\n` +
            `3. Execute with */kill*.\n\n` +
            `⚠️ *PROOF OF LIFE:* Communicate in the group every ${afkTime}s.`,
        locked: (word) => 
            `🟢 *GREEN LIGHT*\n` +
            `The Mark is vulnerable. They said "${word}".\n\n` +
            `👇 *EXECUTE:* Type */kill* immediately.`,
        yourTurnAsk: "🎤 *INTERROGATION*\n\nYou have 60 seconds. Extract information from the group.",
        guessSuccess: "🍸 *CLEAN WORK*\n\nYou identified the assassin. You earned a *KEVLAR SUIT*.",
        guessFail: "💀 *UNPROFESSIONAL*\n\nYou struck the wrong target. Management does not tolerate errors."
    },

    // 📢 GROUP ALERTS
    group: {
        start: "🕯️ *BUSINESS HAS COMMENCED*\n\nContracts have been distributed.\nCheck your private channels.\n\n*Be seeing you.*",
        joined: (name) => `🖋️ *NEW ASSOCIATE*\n\nMr. ${escape(name)} has signed the ledger.`,
        killSuccess: (target) => `🩸 *SERVED*\n\nThe contract on ${escape(target)} has been fulfilled.`,
        killFail: (hunter) => `🤡 *MESSY*\n\n${escape(hunter)} missed the shot and was retired by Management.`,
        blocked: (target, hunter) => `🧥 *ARMORED*\n\n${escape(target)}'s Kevlar stopped the bullet from ${escape(hunter)}.`,
        question: (text) => 
            `❓ *INQUIRY*\n` +
            `▬▬▬▬▬▬▬▬▬▬▬\n` +
            `"${escape(text)}"\n` +
            `▬▬▬▬▬▬▬▬▬▬▬\n` +
            `📢 *DIRECTIVE:* All associates must respond.\n` +
            `⏳ *TIMER:* 2 Minutes`,
        timerWarning: (seconds, mentions) => `⏳ *${seconds} SECONDS REMAINING*\n\nCOMPLY OR BE RETIRED:\n${mentions}`,
        reverseKill: (prey, hunter, word) =>
            `⚡ *COUNTER-MEASURE* ⚡\n\n` +
            `${escape(prey)} anticipated the move by ${escape(hunter)}.\n` +
            `*Method:* "${word}"\n` +
            `The Hunter has become the Hunted.`,
        suicide: (player) => `💀 *RETIRED*\n\n${escape(player)} made a fatal calculation error.`,
        afkDeath: (player) => `💥 *EXPIRED*\n\n${escape(player)} breached the "Proof of Life" protocol.`
    },

    // ⚔️ STANDOFF UI
    standoff: {
        intro: (p1, p2) => 
            `⚔️ *FINAL STANDOFF* ⚔️\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `The Table demands a victor.\n` +
            `👉 ${escape(p1)} vs ${escape(p2)}\n\n` +
            `*PROTOCOL:* Triangle of Death\n` +
            `🔥 *Shoot* kills Reload.\n` +
            `🛡️ *Dodge* beats Shoot.\n` +
            `🔋 *Reload* beats Dodge.\n\n` +
            `⚠️ *CHECK DAMS:* You have 30s to choose.`,
        
        roundStart: (round) => `🔔 *ROUND ${round} BEGINS*\nCheck your DMs. Choose your move.`,
        
        dmMenu: (round, disabledMove) => {
            let text = `⚔️ *STANDOFF: ROUND ${round}*\n\nSelect your tactic.`;
            if (disabledMove) text += `\n❌ *COOLDOWN:* You cannot use ${disabledMove.toUpperCase()} this turn.`;
            return text;
        },

        reminder: (names) => `⏳ *THE TABLE GROWS IMPATIENT...*\n\n${names}\nYou have 15 seconds to choose, or you will be executed.`,

        timeout: "💀 *HESITATION IS DEFEAT.*\n\nThose who did not choose have been executed.",

        result: (p1Name, p1Move, p2Name, p2Move, outcome) => 
            `💥 *STANDOFF RESULT*\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `${escape(p1Name)}: ${p1Move.toUpperCase()}\n` +
            `${escape(p2Name)}: ${p2Move.toUpperCase()}\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `*OUTCOME:* ${outcome}`
    },

    victory: (winner) => `👑 *LAST MAN STANDING*\n\nMr. ${escape(winner)} receives the Gold Coin.`,

    guide: 
        `💼 *OPERATIONAL BRIEFING*\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
        `⚔️ *HOW TO KILL*\n` +
        `1. Check DM for your *Trap Word*.\n` +
        `2. Trick your Target into saying it in the Group.\n` +
        `3. Wait for the Bot's "Green Light".\n` +
        `4. Use */kill* in DM.\n\n` +
        `🛡️ *HOW TO SURVIVE*\n` +
        `• *Don't go AFK:* Speak every 120s.\n` +
        `• *Obey Orders:* Reply to Bot Questions immediately.\n` +
        `• *Counter-Attack:* Use */guess* in DM if you know your hunter.\n\n` +
        `⚔️ *FINAL STANDOFF*\n` +
        `The last 2 players enter a Duel.\n` +
        `• 🔥 *Shoot* kills Reload.\n` +
        `• 🛡️ *Dodge* beats Shoot.\n` +
        `• 🔋 *Reload* beats Dodge.\n` +
        `• *Cooldown:* You cannot use the same move twice in a row.\n` +
        `• *Timer:* 30s limit. Hesitation = Death.\n\n` +
        `*Prepare yourself.*`
};
                
