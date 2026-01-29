const { Markup } = require('telegraf');

// 🛡️ CRASH FIX: Escapes special Markdown characters to prevent Telegram API errors
const escape = (text) => {
    if (!text) return "Unknown";
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};

module.exports = {
    // 🏠 LOBBY INTERFACE
    lobby: {
        text: (creator, time, players = []) => {
            const names = players.length > 0 ? players.map(p => `• ${escape(p.name)}`).join('\n') : "• (No associates yet)";
            return `🕯️ *THE CONTINENTAL*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n*CONTRACT:* Open Bounty\n*CLIENT:* Mr. ${escape(creator)}\n*STATUS:* Recruiting Associates...\n⏳ *WINDOW:* ${time}s\n\n*CURRENT ROSTER:*\n${names}\n\n*DIRECTIVE:* Sign the ledger to accept.`;
        },
        keyboard: Markup.inlineKeyboard([Markup.button.callback("🖋️ Sign Ledger", "join_game")]),
        insufficient: `💼 *CONTRACT REVOKED*\n\nStandard protocols require a minimum of 3 associates.`,
        
        // 🚫 LOBBY ERRORS
        create_dm: `⚠️ *RESTRICTED ACCESS*\nContracts must be opened on neutral ground (Group Chat).\n*We do not conduct business in the shadows.*`,
        create_active: `🚫 *ROOM OCCUPIED*\nA contract is already active in this sector.\n*Wait for the current business to conclude.*`,
        join_closed: `🔒 *CONTRACT SEALED*\nThe window for new associates has closed.\n*Be seeing you.*`,
        skip_unauth: `⚠️ *UNAUTHORIZED*\nOnly the Client who opened this contract may expedite it.\n*Know your place.*`
    },

    // 📋 REGISTRY (PLAYER LIST)
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

    // 🕵️ DM BRIEFINGS & MENUS
    dm: {
        welcome: "💼 *SECURE LINE ACTIVE.*\n\nWe will contact you shortly. Return to the lounge.",
        mission: (target, word, afkTime) => `📜 *NEW CONTRACT*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n🎯 *MARK:* ${escape(target)}\n🗝️ *METHOD:* \`${word.toUpperCase()}\`\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n*INSTRUCTIONS:*\n1. Manipulate the Mark into speaking the *METHOD*.\n2. Wait for the "Green Light".\n3. Execute with */kill*.\n\n⚠️ *PROOF OF LIFE:* Communicate in the group every ${afkTime}s.`,
        locked: (word) => `🟢 *GREEN LIGHT*\nThe Mark is vulnerable. They said "${word}".\n\n👇 *EXECUTE:* Type */kill* immediately.`,
        yourTurnAsk: "🎤 *INTERROGATION*\n\nYou have 60 seconds. Extract information from the group.",
        guessSuccess: "🍸 *CLEAN WORK*\n\nYou identified the assassin. You earned a *KEVLAR SUIT*.",
        guessFail: "💀 *UNPROFESSIONAL*\n\nYou struck the wrong target. Management does not tolerate errors."
    },

    // 📢 GROUP ALERTS & EVENTS
    group: {
        start: "🕯️ *BUSINESS HAS COMMENCED*\n\nContracts have been distributed.\nCheck your private channels.\n\n*Be seeing you.*",
        joined: (name) => `🖋️ *NEW ASSOCIATE*\n\nMr. ${escape(name)} has signed the ledger.`,
        
        // KILL EVENTS
        killSuccess: (target) => `🩸 *SERVED*\n\nThe contract on ${escape(target)} has been fulfilled.`,
        killFail: (hunter) => `🤡 *MESSY*\n\n${escape(hunter)} missed the shot and was retired by Management.`,
        blocked: (target, hunter) => `🧥 *ARMORED*\n\n${escape(target)}'s Kevlar stopped the bullet from ${escape(hunter)}.`,
        reverseKill: (prey, hunter, word) => `⚡ *COUNTER-MEASURE* ⚡\n\n${escape(prey)} anticipated the move by ${escape(hunter)}.\n*Method:* "${word}"\nThe Hunter has become the Hunted.`,
        suicide: (player) => `💀 *RETIRED*\n\n${escape(player)} made a fatal calculation error.`,
        afkDeath: (player) => `💥 *EXPIRED*\n\n${escape(player)} breached the "Proof of Life" protocol.`,
        
        // INTERROGATION EVENTS
        question: (text) => `❓ *INQUIRY*\n▬▬▬▬▬▬▬▬▬▬▬\n"${escape(text)}"\n▬▬▬▬▬▬▬▬▬▬▬\n📢 *DIRECTIVE:* All associates must respond.\n⏳ *TIMER:* 2 Minutes`,
        timer_warn: (seconds, extra = "") => `⏳ *${seconds} SECONDS REMAINING*\nProtocol demands haste.${extra}`,
        askTimeout: (name) => `⌛ *TIME ELAPSED*\n\nInterrogator ${escape(name)} failed to question the suspects.\nThe Table has passed the turn.`,
        answerTimeout: (names) => `⚖️ *NON-COMPLIANCE*\n\nThe following associates refused to answer and have been executed:\n\n${names}`
    },

    // ⚔️ COMBAT & ERROR HANDLING
    combat: {
        kill_group: `🤫 *DISCRETION ADVISED*\nKeep your weapon hidden.\n*Executions must be ordered via Secure Line (DM).*`,
        kill_locked: `⏳ *HOLD FIRE*\nThe Mark has not yet violated protocol.\n*Wait for the signal.*`,
        kill_retired: `⚰️ *STATUS: RETIRED*\nYour privileges have been revoked.\n*The dead do not pull triggers.*`,
        guess_group: `🤐 *SILENCE*\nDo not reveal your hand to the table.\n*Make your counter-move in the Secure Line (DM).*`
    },

    // ⚖️ JUSTICE SYSTEM
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

    // ⚔️ FINAL STANDOFF UI
    standoff: {
        intro: (p1, p2) => `⚔️ *FINAL STANDOFF* ⚔️\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\nThe Table demands a victor.\n👉 ${escape(p1)} vs ${escape(p2)}\n\n*PROTOCOL:* Triangle of Death\n🔥 *Shoot* kills Reload.\n🛡️ *Dodge* beats Shoot.\n🔋 *Reload* beats Dodge.\n\n⚠️ *CHECK DAMS:* You have 30s to choose.`,
        roundStart: (round) => `🔔 *ROUND ${round} BEGINS*\nCheck your DMs. Choose your move.`,
        
        // Dynamic Menu with Visual Cooldowns
        dmMenu: (round, disabledMove) => {
            let text = `⚔️ *STANDOFF: ROUND ${round}*\n\nSelect your tactic.`;
            if (disabledMove) text += `\n❌ *COOLDOWN:* ${disabledMove.toUpperCase()} is disabled this turn.`;
            return text;
        },
        
        reminder: (username) => `⏳ *THE TABLE GROWS IMPATIENT...*\n\n@${escape(username)}\nYou have 10 seconds to choose, or you will be executed.`,
        timeout: "💀 *HESITATION IS DEFEAT.*\n\nThose who did not choose have been executed.",
        result: (p1Name, p1Move, p2Name, p2Move, outcome) => `💥 *STANDOFF RESULT*\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n${escape(p1Name)}: ${p1Move.toUpperCase()}\n${escape(p2Name)}: ${p2Move.toUpperCase()}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n*OUTCOME:* ${outcome}`
    },

    victory: (winner) => `👑 *LAST MAN STANDING*\n\nMr. ${escape(winner)} receives the Gold Coin.`,
    
    // 🛎️ SYSTEM COMMANDS
    start: {
        group: `🛎️ *AT YOUR SERVICE*\n\nThe Concierge is listening.\nCheck your secure line (DM) for assignments, or open a new contract with */create*.`,
        dm: (botUser) => `🕵️‍♂️ *SYSTEM ONLINE*\n\nI am ready to infiltrate your group.\n\n👇 *MISSION PROTOCOL:*\n1. Add me to a Group Chat.\n2. Give me Admin permissions.\n3. Type */create* to open a lobby.`
    },
    
    // 💼 THE FULL OPERATIONAL GUIDE
    guide: `🕯️ *THE CONTINENTAL: ASSOCIATE'S HANDBOOK*
*Authorized Personnel Only. Clearance Level: High Table.*

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

🎯 *OBJECTIVE*
You are an assassin in a room full of killers.
• *Your Goal:* Be the last associate standing.
• *Your Method:* Deception, manipulation, and execution.
• *Your Risk:* Everyone else is trying to kill *you*.

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

📜 *THE RULES OF ENGAGEMENT*

1️⃣ *The Contract (Setup)*
• *Chain of Command:* Every player is assigned a *Target* and a secret *Trap Word* (sent to your DM).
• *The Loop:* Player B is hunting Player C. Player C is hunting You. It is a circle of death.

2️⃣ *The Execution (How to Kill)*
You cannot simply shoot. You must manipulate your Target into slipping up.
1. *Trick:* Guide the conversation in the Group Chat. Make your Target say your *Trap Word*.
2. *Wait:* As soon as they type the word, the Bot (The Table) will send you a *"Green Light"* in your DM.
3. *Strike:* You have a short window. Go to your DM and type \`/kill\`.
4. *Select:* Choose your target from the menu to eliminate them.
⚠️ *Warning:* If you shoot the wrong person or shoot without a Green Light, *you die*.

3️⃣ *The Interrogation (Turns)*
To keep the conversation flowing, The Table assigns an *Interrogator* each turn.
1. *Ask:* The Interrogator has *60 seconds* to DM the bot a question (e.g., "What is your favorite drink?").
2. *Answer:* The Bot posts the question to the group. *EVERYONE* must reply to that message within *120 seconds*.
3. *Consequence:* If you fail to ask or fail to answer, you are executed for non-compliance.

4️⃣ *Proof of Life (AFK Rule)*
Management does not tolerate cowards who hide in the shadows.
• You must speak in the group chat at least once every *120 seconds*.
• Silence results in immediate termination.

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

🛡️ *DEFENSIVE MANEUVERS*

🔹 *Counter-Espionage* (\`/guess\`)
If you suspect someone is hunting you, you can strike first.
• *Action:* Go to DM and type: \`/guess @Username [Word]\`
• *Success:* If you correctly guess your Hunter and their Trap Word, *they die*, and you gain a *Kevlar Shield* (blocks one bullet).
• *Failure:* If you are wrong, *you die*.

🔹 *The Tribunal* (\`/report\`)
If an associate is being abusive or breaking the spirit of the game (e.g., spamming nonsense):
• *Action:* Reply to their message in the Group Chat with \`/report\`.
• *Vote:* If *50%* of the lobby agrees, the violator is executed.
• *Restriction:* Disabled during the final Standoff.

🔹 *Accusation* (\`/accuse\`)
*Requires 5+ Survivors.*
If you are confident someone is an enemy but don't know their word:
• *Action:* Reply to them in Group Chat with \`/accuse\`.
• *Risk:* If they are hunting you, they die. If they are *not* hunting you, *you die* of paranoia.

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

⚔️ *THE STANDOFF (Final Duel)*
When only *2 players* remain, the game shifts to a duel.
• *Mechanic:* A "Rock-Paper-Scissors" style gunfight.
• *Timer:* You have *30 seconds* per round to pick a move in DM.

🔥 *SHOOT* beats Reload.
🛡️ *DODGE* beats Shoot.
🔋 *RELOAD* beats Dodge.

• *Cooldown:* You cannot use the same move twice in a row.
• *Hesitation:* If the timer runs out, you are executed.

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

💻 *COMMAND REFERENCE*

Group Chat:
• \`/create\` - Open a new game lobby.
• \`/skip\` - Force start the game (Host only).
• \`/rules\` - Read the short version of the rules.
• \`/players\` - View the list of alive/dead associates.
• \`/report\` - Reply to a message to vote-kick a player.
• \`/accuse\` - Reply to a player to risk a kill (5+ players only).

Private DM:
• \`/kill\` - Open the execution menu (Only when Green Lit).
• \`/guess\` - Counter-attack: \`/guess @User [word]\`.

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
*"Si vis pacem, para bellum."*`
};
