import { Message } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream';
import { getGuildState } from '../state';
import { startStream } from '../services/streamer';

export async function handleVolume(message: Message, args: string[], streamer: Streamer) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);

  if (args.length === 0) {
    return message.reply(`🔊 **Volume Status:** Current volume is **${state.volume}%**`);
  }

  const volume = parseInt(args[0], 10);
  if (isNaN(volume) || volume < 0 || volume > 100) {
    return message.reply('❌ Volume must be a number between 0 and 100.');
  }

  state.volume = volume;

  if (state.currentContent && state.ffmpegCommand) {
     const elapsedMs = Date.now() - state.startTime;
     const ts = Math.floor(elapsedMs / 1000);
     state.ffmpegCommand.kill('SIGKILL');
     state.ffmpegCommand = null;

     await message.reply(`🔊 **Volume Updated:** Set to **${volume}%**. Applying changes...`);
     await new Promise(r => setTimeout(r, 2500));
     
     await startStream(streamer, guildId, state.currentContent.streamUrl, state.currentSubtitle?.localPath, ts);
  } else {
     await message.reply(`🔊 **Volume Updated:** Set to **${volume}%**`);
  }
}
