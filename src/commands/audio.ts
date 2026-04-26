import { Message } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream';
import { getGuildState } from '../state';
import { startStream } from '../services/streamer';
import { resolveStreamUrl } from '../services/stremio';

export async function handleAudio(message: Message, args: string[], streamer: Streamer) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);

  if (!state.currentContent) {
    return message.reply('❌ Nothing is currently playing.');
  }

  if (args.length === 0) {
    return message.reply(`🎵 Current audio track index: **${state.audioTrackIndex}**\nTo change, use \`$audio <index>\` (e.g., $audio 1 for second track).`);
  }

  const newIndex = parseInt(args[0], 10);
  if (isNaN(newIndex) || newIndex < 0) {
    return message.reply('❌ Please provide a valid non-negative index.');
  }

  state.audioTrackIndex = newIndex;
  await message.reply(`🎵 **Switching audio track to index ${newIndex}...** The stream will restart in a few seconds at your current position.`);

  // Restart stream at current position
  if (state.ffmpegCommand) {
     const elapsedMs = Date.now() - state.startTime;
     const ts = Math.floor(elapsedMs / 1000);
     
     let urlToUse = state.currentContent.streamUrl;
     if (state.currentContent.originalSource) {
        const freshUrl = await resolveStreamUrl(state.currentContent.originalSource);
        if (freshUrl) {
           urlToUse = freshUrl;
           state.currentContent.streamUrl = freshUrl;
        }
     }

     state.ffmpegCommand.kill('SIGKILL');
     state.ffmpegCommand = null;
     
     await new Promise(r => setTimeout(r, 2500));
     await startStream(streamer, guildId, urlToUse, state.currentSubtitle?.localPath, ts);
  }
}
