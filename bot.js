const { Telegraf, Markup } = require('telegraf');
const { exec, spawn } = require('child_process'); 
const config = require('./config');
const engine = require('./engine'); 

const bot = new Telegraf(config.BOT_TOKEN);
engine.init(bot);

bot.start((ctx) => {
    engine.logEvent(`CMD: /start used by ${ctx.from.first_name} in ${ctx.chat.type}`);
    const botUser = ctx.botInfo.username; 
    ctx.reply(`🕵️‍♂️ *SYSTEM ONLINE*\n\nI am ready to infiltrate your group.\n\n👇 *MISSION PROTOCOL:*\n1. Add me to a Group Chat.\n2. Give me Admin permissions.\n3. Type */create* to open a lobby.`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([Markup.button.url("➕ Add to Group", `https://t.me/${botUser}?startgroup=true`)]) });
});

bot.command(['rules', 'help'], (ctx) => {
    engine.logEvent(`CMD: /rules used by ${ctx.from.first_name}`);
    ctx.reply(`📜 *RULES OF MIND HUNTER:*\n\n1. *Kill:* Make target say Trap Word in Group -> /kill in DM.\n2. *Survive:* Reply to Bot Questions in Group (2 mins).\n3. *Guess:* /guess @Hunter [word] in DM.\n4. *Report:* Reply to bad content with /report to vote execute.\n5. *Standoff:* Final 2 players enter a Duel.`, { parse_mode: 'Markdown' });
});

bot.command('update', async (ctx) => {
    if (ctx.from.id !== config.OWNER_ID) return; 
    const msg = await ctx.reply("🔄 *CHECKING REPOSITORY...*", { parse_mode: 'Markdown' });
    exec('git pull', (err, stdout, stderr) => {
        if (err) return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `❌ *ERROR:*\n\`${err.message}\``, { parse_mode: 'Markdown' });
        if (stdout.includes('Already up to date')) return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `✅ *SYSTEM OPTIMAL*\nNo new updates found.`, { parse_mode: 'Markdown' });
        ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `✅ *PATCH APPLIED*\n\nChanges:\n\`${stdout}\`\n\n🔄 *RESTARTING SELF...*`, { parse_mode: 'Markdown' }).then(() => {
            const subprocess = spawn(process.argv[0], process.argv.slice(1), { detached: true, stdio: 'inherit' });
            subprocess.unref();
            process.exit();
        });
    });
});

bot.command('create', engine.createLobby);
bot.action('join_game', engine.joinGame);
bot.command('skip', engine.skipLobby);
bot.command('kill', engine.handleKill);
bot.action(/^shoot_(\d+)$/, engine.handleShootAction);
bot.action(/^standoff_/, engine.handleStandoffChoice);
bot.command('guess', engine.handleGuess);
bot.command('accuse', engine.handleAccuse);
bot.command('report', engine.handleReport);
bot.command('players', engine.listPlayers);
bot.command('guide', (ctx) => { engine.logEvent(`CMD: /guide used by ${ctx.from.first_name}`); ctx.reply(require('./ui').guide, { parse_mode: 'Markdown' }); });
bot.command('exit', (ctx) => { ctx.reply("⚠️ To leave a lobby, just don't join! If the game started, you can go AFK to explode."); });
bot.on('text', engine.handleText);

console.log("⏳ Connecting to Telegram..."); 
bot.catch((err) => { console.log(`⚠️ Error: ${err.message}`); engine.logEvent(`CRITICAL ERROR: ${err.message}`); });

bot.launch().then(async () => {
    console.log('✅ Mind Hunter is Live!');
    engine.logEvent(`🚀 SYSTEM STARTUP COMPLETE.`);
    try {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Initialize the system' },
            { command: 'create', description: 'Open a new contract lobby' },
            { command: 'guide', description: 'Operational Manual (How to play)' },
            { command: 'players', description: 'View Associate Registry' },
            { command: 'kill', description: 'Execute your target (DM Only)' },
            { command: 'report', description: 'Vote to kick a violator' },
            { command: 'guess', description: 'Counter-attack your Hunter (DM Only)' },
            { command: 'rules', description: 'Read the standard protocols' },
            { command: 'skip', description: 'Force start (Host Only)' }
        ]);
        console.log("✅ Commands list updated.");
    } catch (e) { console.log("⚠️ Failed to update commands:", e.message); }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
