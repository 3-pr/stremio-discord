import { Message } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream';
import { getGuildState } from '../state';
import { stopStream } from '../services/streamer';

export async function handleStop(message: Message, streamer: Streamer) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);

  await stopStream(guildId);
  
  if (state.voiceChannelId) {
    streamer.leaveVoice();
    state.voiceChannelId = null;
  }

  // Clear queue
  state.queue = [];

  return message.reply('🛑 Stream stopped and disconnected from voice.');
}
