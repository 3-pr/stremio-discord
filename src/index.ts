import { Client } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream';
import axios from 'axios';
import { config } from './config';
import { stopStream } from './services/streamer';
import { handlePlay, handleSelect, handlePlayId, handlePlayUrl, handleAddon, handleBack, handleS, handleE } from './commands/play';
import { handleStop } from './commands/stop';
import { handlePause, handleResume } from './commands/pause';
import { handleSubtitles } from './commands/subtitles';
import { handleQueue, handleSkip } from './commands/queue';
import { handleVolume } from './commands/volume';
import { handleInfo, handleAccount } from './commands/info';
import { handleAudio } from './commands/audio';
import { handleHelp } from './commands/help';

const client = new Client({});

const streamer = new Streamer(client);

let stremioOnline = true; // assume true initially or test immediately
let checkingStremio = false;

async function checkStremioHealth() {
  if (checkingStremio) return;
  checkingStremio = true;

  try {
    // A simple GET request to the base URL is enough to check if server is up
    const res = await axios.get(`${config.stremioUrl}/`, { validateStatus: status => status < 400 });
    if (res.status === 200 || res.status === 307) {
      if (!stremioOnline) {
        stremioOnline = true;
        console.log('[Stremio] Back online!');
        // DM Owner
        try {
          const owner = await client.users.fetch(config.ownerId);
          if (owner) await owner.send('✅ Stremio Server is back online!');
        } catch (e) { }
      }
      console.log(`[Stremio] Online.`);
    } else {
      throw new Error(`Non-200 status: ${res.status}`);
    }
  } catch (err: any) {
    if (stremioOnline) {
      stremioOnline = false;
      console.error(`[Stremio] Server offline or unreachable: ${err.message}`);
      try {
        const owner = await client.users.fetch(config.ownerId);
        if (owner) await owner.send(`⚠️ Stremio Server went offline! Error: ${err.message}`);
      } catch (e) { }
    } else {
      console.error(`[Stremio] Server still unreachable. Retrying...`);
    }
  } finally {
    checkingStremio = false;
  }
}

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  // Initial health check
  await checkStremioHealth();

  // Schedule health checks every 30s
  setInterval(checkStremioHealth, 30000);
});

client.on('messageCreate', async (message) => {
  if (message.author.id !== config.ownerId) return; // Only process owner messages

  // Handle Mentions: Welcome Greeting
  if (message.mentions.has(client.user!) && !message.content.startsWith(config.commandPrefix)) {
    const welcome = `
👋 **Hello! / مرحباً بك!** 

English:
I am your Stremio selfbot. I bring the cinema experience directly to Discord! 🎬
• Use \`$help\` to see all commands.
• Website: [3-pr.github.io](https://3-pr.github.io)
• Project: [3.pr/discord](https://3.pr/discord)
• Developed by: **YASSER AL-HARBI**

عربي:
أنا بوت ستريميو الخاص بك. أجلب لك تجربة السينما مباشرة إلى ديسكورد! 🎬
• استخدم الأمر \`$help\` لرؤية جميع الأوامر.
• موقعي: [3-pr.github.io](https://3-pr.github.io)
• رابط المشروع: [3.pr/discord](https://3.pr/discord)
• تطوير / **YASSER ALHARBI**
      `;
    await message.reply(welcome);
    return;
  }

  if (!message.content.startsWith(config.commandPrefix)) return;

  const args = message.content.slice(config.commandPrefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  try {
    switch (command) {
      case 'play':
        await handlePlay(message, args);
        break;
      case 'select':
        await handleSelect(message, args, streamer);
        break;
      case 'addon':
        await handleAddon(message, args);
        break;
      case 'back':
      case 'addons':
        await handleBack(message);
        break;
      case 's':
      case 'season':
        await handleS(message, args);
        break;
      case 'e':
      case 'episode':
        await handleE(message, args);
        break;
      case 'play-id':
        await handlePlayId(message, args, streamer);
        break;
      case 'play-url':
      case 'play-link':
        await handlePlayUrl(message, args, streamer);
        break;
      case 'stop':
        await handleStop(message, streamer);
        break;
      case 'pause':
        await handlePause(message);
        break;
      case 'resume':
        await handleResume(message, streamer);
        break;
      case 'subtitles':
        await handleSubtitles(message, args, streamer);
        break;
      case 'queue':
        await handleQueue(message, args, streamer);
        break;
      case 'skip':
        await handleSkip(message, streamer);
        break;
      case 'volume':
        await handleVolume(message, args, streamer);
        break;
      case 'audio':
        await handleAudio(message, args, streamer);
        break;
      case 'info':
        await handleInfo(message);
        break;
      case 'account':
      case 'addons':
        await handleAccount(message);
        break;
      case 'help':
        await handleHelp(message);
        break;
      default:
        break;
    }
  } catch (err: any) {
    console.error(`[Command Error] ${command}: ${err.message}`);
    message.reply(`❌ Internal error: ${err.message}`);
  }
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  // Stop all active streams per guild logic is complex without tracking all. 
  // Usually leaving voice destroys streams.
  streamer.leaveVoice();
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.login(config.selfbotToken).catch(err => {
  console.error("Login failed:", err.message);
  process.exit(1);
});
