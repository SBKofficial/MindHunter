const { Markup } = require('telegraf');

// 🛡️ CRASH FIX: Escapes special Markdown characters
const escape = (text) => {
    if (!text) return "Unknown";
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};

module.exports = {
    // 🏠 LOBBY
    lobby: {
        text: (creator, time, players = []) => {
            const names = players.length > 0 ? players.map(p => `• ${escape(p.name)}`).join('\n') : "• (No associates yet)";
            return `🕯️ *THE CONTINENTAL*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n*CONTRACT:* Open Bounty\n*CLIENT:* Mr. ${escape(creator)}\n*STATUS:* Recruiting Associates...\n⏳ *WINDOW:* ${time}s\n\n*CURRENT ROSTER:*\n${names}\n\n*DIRECTIVE:* Sign the ledger to accept.`;
        },
        keyboard: Markup.inlineKeyboard([Markup.button.callback("🖋️ Sign Ledger", "join_game")]),
        insufficient: `💼 *CONTRACT REVOKED*\n\nStandard protocols require a minimum of 3 associates.`,
        create_dm: `⚠️ *RESTRICTED ACCESS*\nContracts must be opened on neutral ground (Group Chat).\n*We do not conduct business in the shadows.*`,
        create_active: `🚫 *ROOM OCCUPIED*\nA contract is already active in this sector.\n*Wait for the current business to conclude.*`,
        join_closed: `🔒 *CONTRACT SEALED*\nThe window for new associates has closed.\n*Be seeing you.*`,
        skip_unauth: `⚠️ *UNAUTHORIZED*\nOnly the Client who opened this contract may expedite it.\n*Know your place.*`
    },

    // 📋 REGISTRY
    list: {
        noGame: `⚠️ *EMPTY LEDGER*\nNo associates are currently on duty.`,
        denied: `🚫 *EXCOMMUNICADO*\nYou are not authorized to view the registry.`,
        dm_error: `📂 *CLASSIFIED*\nThe Associate Registry is only viewable in the Main Hall (Group).\n*Security protocol alpha.*`,
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
        mission: (target, word, afkTime) => `📜 *NEW CONTRACT*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n🎯 *MARK:* ${escape(target)}\n🗝️ *METHOD:* \`${word.toUpperCase()}\`\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n*INSTRUCTIONS:*\n1. Manipulate the Mark into speaking the *METHOD*.\n2. Wait for the "Green Light".\n3. Execute with */kill*.\n\n⚠️ *PROOF OF LIFE:* Communicate in the group every ${afkTime}s.`,
        locked: (word) => `🟢 *GREEN LIGHT*\nThe Mark is vulnerable. They said "${word}".\n\n👇 *EXECUTE:* Type */kill* immediately.`,
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
        question: (text) => `❓ *INQUIRY*\n▬▬▬▬▬▬▬▬▬▬▬\n"${escape(text)}"\n▬▬▬▬▬▬▬▬▬▬▬\n📢 *DIRECTIVE:* All associates must respond.\n⏳ *TIMER:* 2 Minutes`,
        
        // 👇 NEW GENERIC WARNING
        timer_warn: (seconds, extra = "") => `⏳ *${seconds} SECONDS REMAINING*\nProtocol demands haste.${extra}`,
        
        reverseKill: (prey, hunter, word) => `⚡ *COUNTER-MEASURE* ⚡\n\n${escape(prey)} anticipated the move by ${escape(hunter)}.\n*Method:* "${word}"\nThe Hunter has become the Hunted.`,
        suicide: (player) => `💀 *RETIRED*\n\n${escape(player)} made a fatal calculation error.`,
        afkDeath: (player) => `💥 *EXPIRED*\n\n${escape(player)} breached the "Proof of Life" protocol.`,
        askTimeout: (name) => `⌛ *TIME ELAPSED*\n\nInterrogator ${escape(name)} failed to question the suspects.\nThe Table has passed the turn.`,
        answerTimeout: (names) => `⚖️ *NON-COMPLIANCE*\n\nThe following associates refused to answer and have been executed:\n\n${names}`
    },

    // ⚔️ COMBAT ERRORS
    combat: {
        kill_group: `🤫 *DISCRETION ADVISED*\nKeep your weapon hidden.\n*Executions must be ordered via Secure Line (DM).*`,
        kill_locked: `⏳ *HOLD FIRE*\nThe Mark has not yet violated protocol.\n*Wait for the signal.*`,
        kill_retired: `⚰️ *STATUS: RETIRED*\nYour privileges have been revoked.\n*The dead do not pull triggers.*`,
        guess_group: `🤐 *SILENCE*\nDo not reveal your hand to the table.\n*Make your counter-move in the Secure Line (DM).*`
    },

    // ⚖️ JUSTICE
    accuse: {
        dm: `🕶️ *SHADOWS DENIED*\nYou cannot pull the trigger from a secure line.\n*Accusations require the Table's presence (Group).*`,
        idle: `🏳️ *NEUTRAL GROUND*\nNo business is authorized at this time.\n*Holster your weapon.*`
    },

    report: {
        dm: `📨 *RETURN TO SENDER*\nOfficial grievances must be lodged on the Continental floor (Group Chat).\n*We do not accept private petitions.*`,
        idle: `🍷 *PEACEKEEPER PROTOCOL*\nThere are no open contracts at this moment.\n*Management requests you keep the peace.*`,
        standoff: `⚔️ *INTERFERENCE DENIED*\nThe High Table will not intervene in a final duel.\n*Resolve this yourselves.*`,
        logged: (target, current, needed) => `⚠️ *VIOLATION REPORTED*\nTarget: ${escape(target)}\nVotes: ${current}/${needed}\n*Status:* Under Review`,
        executed: (target) => `⚖️ *JUDGMENT DELIVERED*\n\nThe Table has recognized a violation of protocols.\n${escape(target)} has been executed.`,
        invalid: "❌ *ERROR:* You cannot report this.",
        self: "❌ You cannot report yourself."
    },

    // ⚔️ STANDOFF UI
    standoff: {
        intro: (p1, p2) => `⚔️ *FINAL STANDOFF* ⚔️\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\nThe Table demands a victor.\n👉 ${escape(p1)} vs ${escape(p2)}\n\n*PROTOCOL:* Triangle of Death\n🔥 *Shoot* kills Reload.\n🛡️ *Dodge* beats Shoot.\n🔋 *Reload* beats Dodge.\n\n⚠️ *CHECK DAMS:* You have 30s to choose.`,
        roundStart: (round) => `🔔 *ROUND ${round} BEGINS*\nCheck your DMs. Choose your move.`,
        dmMenu: (round, disabledMove) => {
            let text = `⚔️ *STANDOFF: ROUND ${round}*\n\nSelect your tactic.`;
            if (disabledMove) text += `\n❌ *COOLDOWN:* You cannot use ${disabledMove.toUpperCase()} this turn.`;
            return text;
        },
        reminder: (username) => `⏳ *THE TABLE GROWS IMPATIENT...*\n\n@${escape(username)}\nYou have 10 seconds to choose, or you will be executed.`,
        timeout: "💀 *HESITATION IS DEFEAT.*\n\nThose who did not choose have been executed.",
        result: (p1Name, p1Move, p2Name, p2Move, outcome) => `💥 *STANDOFF RESULT*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n${escape(p1Name)}: ${p1Move.toUpperCase()}\n${escape(p2Name)}: ${p2Move.toUpperCase()}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n*OUTCOME:* ${outcome}`
    },

    victory: (winner) => `👑 *LAST MAN STANDING*\n\nMr. ${escape(winner)} receives the Gold Coin.`,
    
    // 🛎️ SYSTEM
    start: {
        group: `🛎️ *AT YOUR SERVICE*\n\nThe Concierge is listening.\nCheck your secure line (DM) for assignments, or open a new contract with */create*.`,
        dm: (botUser) => `🕵️‍♂️ *SYSTEM ONLINE*\n\nI am ready to infiltrate your group.\n\n👇 *MISSION PROTOCOL:*\n1. Add me to a Group Chat.\n2. Give me Admin permissions.\n3. Type */create* to open a lobby.`
    },
    
    guide: `💼 *OPERATIONAL BRIEFING*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n⚔️ *HOW TO KILL*\n1. Check DM for your *Trap Word*.\n2. Trick your Target into saying it in the Group.\n3. Wait for the Bot's "Green Light".\n4. Use */kill* in DM.\n\n🛡️ *HOW TO SURVIVE*\n• *Don't go AFK:* Speak every 120s.\n• *Obey Orders:* Reply to Bot Questions immediately.\n• *Counter-Attack:* Use */guess* in DM if you know your hunter.\n\n⚖️ *JUSTICE*\n• *Report:* Reply to inappropriate questions/answers with */report*.\n• *Votes:* If 50% of the lobby agrees, the violator is executed.\n\n⚔️ *FINAL STANDOFF*\nThe last 2 players enter a Duel.\n• 🔥 *Shoot* kills Reload.\n• 🛡️ *Dodge* beats Shoot.\n• 🔋 *Reload* beats Dodge.\n\n*Prepare yourself.*`
};
