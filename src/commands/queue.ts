import { Message } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream';
import { getGuildState } from '../state';
import { searchCatalog, getMetadata } from '../services/stremio';
import { playNextInQueue } from '../services/streamer';

export async function handleQueue(message: Message, args: string[], streamer: Streamer) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);

  if (args.length === 0) {
    // Show queue
    if (state.queue.length === 0) {
      return message.reply('📭 The queue is currently empty.');
    }
    let response = `📜 **Current Queue**\n─────────────────\n`;
    state.queue.forEach((item, idx) => {
      response += `**${idx + 1}.** ${item.title} ${item.year ? `(${item.year})` : ''}\n`;
    });
    return message.reply(response);
  }

  const subCommand = args[0].toLowerCase();
  
  if (subCommand === 'add') {
    const query = args.slice(1).join(' ');
    if (!query) {
      return message.reply('❌ Please provide a title to add to the queue.');
    }

    if (/^tt\d+$/.test(query)) {
      const imdbId = query;
      let type: 'movie' | 'series' = 'movie';
      let meta = await getMetadata(imdbId, 'movie');
      if (!meta) {
        meta = await getMetadata(imdbId, 'series');
        if (meta) type = 'series';
      }
      if (!meta) {
        return message.reply('❌ Cannot find metadata for this IMDb ID.');
      }
      
      state.queue.push({
        imdbId: imdbId,
        type: type,
        title: meta.name || imdbId,
        year: meta.year
      });
      return message.reply(`✅ Added **${meta.name || imdbId}** to the queue.`);
    }

    const results = await searchCatalog(query);
    if (results.length === 0) {
      return message.reply('❌ No results found. Could not add to queue.');
    }

    const topResult = results[0];
    state.queue.push({
      imdbId: topResult.id,
      type: topResult.type,
      title: topResult.name,
      year: topResult.year
    });

    return message.reply(`✅ Added **${topResult.name}** to the queue.`);
  }
  
  if (subCommand === 'clear') {
    state.queue = [];
    return message.reply('🗑️ Queue cleared.');
  }

  return message.reply('❌ Invalid queue command. Usage: `$queue`, `$queue add <name>`, `$queue clear`');
}

export async function handleSkip(message: Message, streamer: Streamer) {
    const guildId = message.guild?.id || message.channel.id;
    const state = getGuildState(guildId);

    if (!state.currentContent) {
        return message.reply('❌ Nothing is currently playing.');
    }

    message.reply('⏭️ Skipping current item...');
    await playNextInQueue(streamer, guildId);
}
