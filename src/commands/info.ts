import { Message } from 'discord.js-selfbot-v13';
import { getGuildState } from '../state';
import { config } from '../config';
import { getUserAddons } from '../services/stremio';

export async function handleInfo(message: Message) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);

  if (!state.currentContent) {
    return message.reply('ℹ️ Nothing is currently playing.');
  }

  const { title, year, sourceName } = state.currentContent;
  const subtitle = state.currentSubtitle ? state.currentSubtitle.lang : 'Disabled';
  const status = state.isPaused ? '⏸️ Paused' : '▶️ Playing';

  const infoText = `🎬 **Now Playing:** ${title} ${year ? `(${year})` : ''}\n🔹 **Source:** ${sourceName}\n🔹 **Subtitle:** ${subtitle}\n🔹 **Status:** ${status}\n🔹 **Volume:** ${state.volume}%` + (state.queue.length > 0 ? `\n⏭️ **Up Next:** ${state.queue[0].title}` : '');

  return message.reply(infoText);
}

export async function handleAccount(message: Message) {
  const loading = await message.reply('⏳ Checking account...');

  try {
     if (!config.stremioAuthKey) return loading.edit('❌ **AuthKey missing!**');

     const addons = await getUserAddons();
     const desc = `Found **${addons.length}** active addons in your cloud collection.`;
     const adds = addons.slice(0, 15).map(a => `• ${a.manifest?.name || 'Unknown'}`).join('\n') || 'None';
     
     const responseText = `✅ **Account Synced:**\n${desc}\n\n**Top Addons:**\n${adds}`;
     await message.channel.send(responseText);
     return loading.delete().catch(() => {});
  } catch (err: any) {
     return loading.edit('❌ **Sync failed!**');
  }
}
