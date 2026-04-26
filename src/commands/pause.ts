import { Message } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream';
import { getGuildState } from '../state';
import { startStream, stopStream } from '../services/streamer';

export async function handlePause(message: Message) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);

  if (!state.currentContent || !state.ffmpegCommand) {
    return message.reply('❌ Nothing is currently playing.');
  }

  if (state.isPaused) {
    return message.reply('❌ Stream is already paused.');
  }

  // Calculate elapsed time to restart from there
  const elapsedMs = Date.now() - state.startTime;
  state.pauseTimestamp = Math.floor(elapsedMs / 1000);
  
  state.isPaused = true;

  // Kill FFmpeg stream
  try {
    state.ffmpegCommand.kill('SIGKILL');
  } catch(e) {}
  state.ffmpegCommand = null;

  return message.reply('⏸️ Stream paused. (Note: Resume will take 1-2 seconds to buffer)');
}

export async function handleResume(message: Message, streamer: Streamer) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);

  if (!state.currentContent) {
    return message.reply('❌ Nothing is currently playing.');
  }

  if (!state.isPaused) {
    return message.reply('❌ Stream is not paused.');
  }

  const streamUrl = state.currentContent.streamUrl;
  const startTime = state.pauseTimestamp;
  const subFile = state.currentSubtitle?.localPath;
  
  state.isPaused = false;
  state.pauseTimestamp = 0;

  await message.reply('▶️ Resuming stream...');

  await startStream(streamer, guildId, streamUrl, subFile, startTime);
}
