const { Markup } = require('telegraf');

// 🛡️ CRASH PREVENTER: Removes backticks only (Cyberpunk Style Names)
const escape = (text) => text.replace(/`/g, '');

module.exports = {
    // 🏠 LOBBY SYSTEM
    lobby: {
        text: (creator, time, players = []) => {
            const names = players.length > 0 
                ? players.map(p => `• \`${escape(p.name)}\``).join('\n')
                : "• (No associates yet)";

            return `🕯️ *THE CONTINENTAL*\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `*CONTRACT:* Open Bounty\n` +
            `*CLIENT:* Mr. \`${escape(creator)}\`\n` +
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
            return `${icon} \`${escape(p.name)}\``;
        }
    },

    // 🕵️ DM BRIEFINGS
    dm: {
        welcome: "💼 *SECURE LINE ACTIVE.*\n\nWe will contact you shortly. Return to the lounge.",
        mission: (target, word, afkTime) =>
            `📜 *NEW CONTRACT*\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `🎯 *MARK:* \`${escape(target)}\`\n` +
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
        joined: (name) => `🖋️ *NEW ASSOCIATE*\n\nMr. \`${escape(name)}\` has signed the ledger.`,
        killSuccess: (target) => `🩸 *SERVED*\n\nThe contract on \`${escape(target)}\` has been fulfilled.`,
        killFail: (hunter) => `🤡 *MESSY*\n\n\`${escape(hunter)}\` missed the shot and was retired by Management.`,
        blocked: (target, hunter) => `🧥 *ARMORED*\n\n\`${escape(target)}\`'s Kevlar stopped the bullet from \`${escape(hunter)}\`.`,
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
            `\`${escape(prey)}\` anticipated the move by \`${escape(hunter)}\`.\n` +
            `*Method:* "${word}"\n` +
            `The Hunter has become the Hunted.`,
        suicide: (player) => `💀 *RETIRED*\n\n\`${escape(player)}\` made a fatal calculation error.`,
        afkDeath: (player) => `💥 *EXPIRED*\n\n\`${escape(player)}\` breached the "Proof of Life" protocol.`
    },

    // 🎰 ROULETTE
    roulette: {
        intro: (p1, p2) => 
            `⚖️ *FINAL JUDGMENT* ⚖️\n\n` +
            `*PARTIES:* \`${escape(p1)}\` vs \`${escape(p2)}\`\n` +
            `*PROTOCOL:* Standard Revolver (1 Round)\n\n` +
            `👉 \`${escape(p1)}\`, you have the floor.\nType */trigger* (30s).`,
        click: (nextPlayer, odds) => 
            `💨 *CLICK...* (Empty)\n` +
            `Fate spins the cylinder.\n\n` +
            `👉 \`${escape(nextPlayer)}\`, your turn.\nType */trigger*\n` +
            `*(Risk Factor: 1/${odds})*`,
        bang: (player) => `🧨 *BANG!*\n\nMr. \`${escape(player)}\`'s membership has been revoked.`
    },
    victory: (winner) => `👑 *LAST MAN STANDING*\n\nMr. \`${escape(winner)}\` receives the Gold Coin.`,

    // 📘 GUIDE
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
        `☠️ *WAYS TO DIE*\n` +
        `• Saying your Trap Word.\n` +
        `• Guessing wrong.\n` +
        `• Missing an Interrogation Question.\n` +
        `• Losing Russian Roulette.\n\n` +
        `*Prepare yourself.*`
};

