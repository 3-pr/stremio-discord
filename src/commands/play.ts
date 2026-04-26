import { Message } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream';
import { getGuildState, StreamSource } from '../state';
import { searchCatalog, getStreams, getMetadata, resolveStreamUrl } from '../services/stremio';
import { startStream } from '../services/streamer';

async function sendAddonsList(loadingMsg: Message, title: string, meta: any, addons: string[]) {
  const guildId = loadingMsg.guild?.id || loadingMsg.channel.id;
  const state = getGuildState(guildId);
  const limit = Math.min(addons.length, 50);
  
  const headerText = `🎬 **${title} ${meta.year ? `(${meta.year})` : ''}**\n`
    + (meta.description ? `*${meta.description.slice(0, 150)}...*\n` : '')
    + `───────────────\n`
    + `📦 Found **${addons.length}** addons with sources.\n`
    + (meta.poster ? `${meta.poster}` : '');
  
  try {
    const headMsg = await loadingMsg.channel.send(headerText);
    state.sourceMessageIds.push(headMsg.id);
  } catch (e) {}

  for (let i = 0; i < limit; i += 15) {
    const chunk = addons.slice(i, i + 15);
    const chunkText = `📂 **ADDON DIRECTORY [${i + 1}-${i + chunk.length}]**\n`
      + chunk.map((a, idx) => `> **${i + idx + 1}.** ${a}`).join('\n');
    
    try {
      const chunkMsg = await loadingMsg.channel.send(chunkText);
      state.sourceMessageIds.push(chunkMsg.id);
    } catch (e) {}
  }

  try {
    const cmdMsg = await loadingMsg.channel.send(`🕹️ **COMMAND:** Reply with \`$addon <number>\` to view sources.`);
    state.sourceMessageIds.push(cmdMsg.id);
  } catch (e) {}

  state.sourceMessageIds.push(loadingMsg.id);
  await loadingMsg.delete().catch(() => {});
}

async function sendSourcesList(loadingMsg: Message, title: string, meta: any, streams: StreamSource[], addonName?: string) {
  const guildId = loadingMsg.guild?.id || loadingMsg.channel.id;
  const state = getGuildState(guildId);
  const limit = Math.min(streams.length, 100);
  
  const headerText = `🎬 **${title} ${meta.year ? `(${meta.year})` : ''}**\n`
    + (addonName ? `📂 Source: **${addonName}**\n` : '')
    + `───────────────\n`
    + `✅ Found **${streams.length}** sources in this addon.\n`;
  
  try {
    const headMsg = await loadingMsg.channel.send(headerText);
    state.sourceMessageIds.push(headMsg.id);
  } catch (e) {}

  if (streams.length === 0) {
    const emptyMsg = await loadingMsg.channel.send("❌ No sources found in this addon.");
    state.sourceMessageIds.push(emptyMsg.id);
  }

  for (let i = 0; i < limit; i += 15) {
    const chunk = streams.slice(i, i + 15);
    const chunkText = `📡 **SERVER LIST [${i + 1}-${i + chunk.length}]**\n`
      + chunk.map((s, idx) => `> **${i + idx + 1}.** ${s.name || 'Server'} — \`${s.title?.split('\n')[0].trim().slice(0, 40) || '1080p'}\``).join('\n');
    
    try {
      const chunkMsg = await loadingMsg.channel.send(chunkText);
      state.sourceMessageIds.push(chunkMsg.id);
    } catch (e) {}
  }

  try {
    const cmdMsg = await loadingMsg.channel.send(`🕹️ **COMMAND:** Reply with \`$select <number>\` to play. Reply with \`$back\` to return to addons.`);
    state.sourceMessageIds.push(cmdMsg.id);
  } catch (e) {}

  state.sourceMessageIds.push(loadingMsg.id);
  await loadingMsg.delete().catch(() => {});
}

export async function handlePlay(message: Message, args: string[]) {
  if (args.length === 0) return message.reply('❌ Please provide a name.');
  const query = args.join(' ');
  const loadingMsg = await message.reply('⏳ Searching...');
  const state = getGuildState(message.guild?.id || message.channel.id);
  state.sourceMessageIds = [];

  try {
    if (/^tt\d+$/.test(query)) {
       const imdbId = query;
       let type: 'movie' | 'series' = 'movie';
       let meta = await getMetadata(imdbId, 'movie');
       if (!meta) { meta = await getMetadata(imdbId, 'series'); if (meta) type = 'series'; }
       if (!meta) return loadingMsg.edit('❌ IMDB Meta not found.');
        if (type === 'series') {
            state.selectedSeason = null;
            state.selectedEpisode = null;
            return loadingMsg.edit(`📺 **${meta.name}** is a series.\nPlease select a season and episode: \`$s <n> $e <n>\` (e.g., \`$s 1 $e 1\`)`);
        }

        const streams = await getStreams(imdbId, type);
        if (!streams.length) return loadingMsg.edit('❌ No sources.');
        const addonNames = Array.from(new Set(streams.map(s => s.addonName || 'Unknown Addon')));
        state.allSources = streams;
        state.pendingAddons = addonNames;
        state.currentContent = { imdbId, type, title: meta.name || imdbId, year: meta.year, streamUrl: '', sourceName: '' };
        
        state.pendingSources = [];
        await sendAddonsList(loadingMsg, meta.name || imdbId, { ...meta, type }, addonNames);
        return;
     }

     const results = await searchCatalog(query);
     if (!results.length) return loadingMsg.edit('❌ No results.');
     const first = results[0];
     
     if (first.type === 'series') {
        state.currentContent = { imdbId: first.id, type: 'series', title: first.name, year: first.year, streamUrl: '', sourceName: '' };
        state.selectedSeason = null;
        state.selectedEpisode = null;
        return loadingMsg.edit(`📺 **${first.name}** (Series) detected.\nPlease select a season and episode: \`$s <n> $e <n>\` (e.g., \`$s 1 $e 1\`)`);
     }

     const streams = await getStreams(first.id, first.type);
     if (!streams.length) return loadingMsg.edit('❌ No sources.');
     
     const addonNames = Array.from(new Set(streams.map(s => s.addonName || 'Unknown Addon')));
     state.allSources = streams;
     state.pendingAddons = addonNames;
     state.currentContent = { imdbId: first.id, type: first.type, title: first.name, year: first.year, streamUrl: '', sourceName: '' };
     
     state.pendingSources = [];
     await sendAddonsList(loadingMsg, first.name, first, addonNames);
  } catch (err) {
    loadingMsg.edit('❌ Error fetching content.');
  }
}

export async function handleSelect(message: Message, args: string[], streamer: Streamer) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);
  if (!state.currentContent || state.pendingSources.length === 0) return message.reply('❌ Use `$play` first.');
  const choice = parseInt(args[0], 10);
  if (isNaN(choice) || choice < 1 || choice > state.pendingSources.length) return message.reply('❌ Invalid choice.');
  const member = message.member;
  if (!member?.voice.channelId) return message.reply('🔇 Join voice first.');
  const source = state.pendingSources[choice - 1];
  const url = await resolveStreamUrl(source);
  if (!url) return message.reply('❌ URL failed.');

  const contentId = state.currentContent.type === 'series' ? `${state.currentContent.imdbId}:${state.selectedSeason}:${state.selectedEpisode}` : state.currentContent.imdbId;
  const historyTs = state.history[contentId];

  let startAt = 0;
  if (historyTs && historyTs > 30) {
      const minutes = Math.floor(historyTs / 60);
      const seconds = historyTs % 60;
      const promptMsg = await message.reply(`🎬 **Found existing progress: ${minutes}m ${seconds}s**\nDo you want to resume? Reply with \`1\` for **Resume** or \`2\` for **Start Over**.`);
      
      try {
          const filter = (m: Message) => m.author.id === message.author.id && (m.content === '1' || m.content === '2');
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
          const userChoice = collected.first()?.content;
          if (userChoice === '1') {
              startAt = historyTs;
              message.reply('🚀 Resuming stream...');
          }
      } catch (e) {
          // Timeout or invalid, start from 0
      }
      await promptMsg.delete().catch(() => {});
  }

  const channel = message.channel;
  for (const mid of state.sourceMessageIds) {
     try {
       const m = await channel.messages.fetch(mid);
       if (m) await m.delete().catch(() => {});
     } catch(e) {}
  }
  state.sourceMessageIds = [];
  await message.delete().catch(() => {});

  const startMsgText = `🚀 **Cinema Mode Active**\n🍿 **${state.currentContent.title}**${startAt > 0 ? ` (Resuming from ${Math.floor(startAt/60)}m)` : ''}\n📡 Source: \`${source.name}\`\n🎥 Quality: \`1080p Premium\``;
  try {
    const statusMsg = await message.channel.send(startMsgText);
    setTimeout(() => statusMsg.delete().catch(() => {}), 10000);
  } catch (e) {}

  state.currentContent.streamUrl = url;
  state.currentContent.sourceName = source.name || 'Unknown';
  state.currentContent.originalSource = source;
  // Update imdbId for series history tracking
  if (state.currentContent.type === 'series') {
     state.currentContent.imdbId = `${state.currentContent.imdbId}:${state.selectedSeason}:${state.selectedEpisode}`;
  }
  
  state.voiceChannelId = member.voice.channelId;
  state.textChannelId = message.channel.id;
  await streamer.joinVoice(message.guild?.id || null, state.voiceChannelId);
  await startStream(streamer, guildId, url, state.currentSubtitle?.localPath, startAt);
}

export async function handlePlayId(message: Message, args: string[], streamer: Streamer) {
  if (args.length < 2) return message.reply('❌ Usage: `$play-id <imdb_id> <movie|series>`');
  const imdbId = args[0];
  const type = args[1] as "movie" | "series";
  const loadingMsg = await message.reply('⏳ Searching...');
  const streams = await getStreams(imdbId, type);
  if (!streams.length) return loadingMsg.edit('❌ No sources found.');
  const meta = await getMetadata(imdbId, type);
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);
  state.allSources = streams;
  const addonNames = Array.from(new Set(streams.map(s => s.addonName || 'Unknown Addon')));
  state.pendingAddons = addonNames;
  state.currentContent = { imdbId, type, title: meta?.name || imdbId, year: meta?.year, streamUrl: '', sourceName: '' };
  
  state.pendingSources = [];
  await sendAddonsList(loadingMsg, state.currentContent.title, { ...meta, type }, addonNames);
}

export async function handlePlayUrl(message: Message, args: string[], streamer: Streamer) {
  if (args.length === 0) return message.reply('❌ Usage: `$play-url <link>`');
  const streamUrl = args[0];
  const member = message.member;
  if (!member || !member.voice.channelId) return message.reply('🔇 Join a voice channel.');
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);
  await message.reply(`✅ Starting direct stream...`);
  state.currentContent = { imdbId: 'direct', type: 'movie', title: 'Direct Link', year: '', streamUrl, sourceName: 'Direct' };
  state.pendingSources = [];
  state.pendingAddons = [];
  state.voiceChannelId = member.voice.channelId;
  state.textChannelId = message.channel.id;
  await streamer.joinVoice(message.guild?.id || null, state.voiceChannelId);
  await startStream(streamer, guildId, streamUrl);
}

export async function handleAddon(message: Message, args: string[]) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);
  if (!state.currentContent || state.pendingAddons.length === 0) return message.reply('❌ No addons available.');
  const choice = parseInt(args[0], 10);
  if (isNaN(choice) || choice < 1 || choice > state.pendingAddons.length) return message.reply('❌ Invalid addon selection.');
  
  const selectedAddon = state.pendingAddons[choice - 1];
  const loadingMsg = await message.reply(`⏳ Loading sources from **${selectedAddon}**...`);
  
  const channel = message.channel;
  for (const mid of state.sourceMessageIds) {
     try {
       const m = await channel.messages.fetch(mid);
       if (m) await m.delete().catch(() => {});
     } catch(e) {}
  }
  state.sourceMessageIds = [];
  await message.delete().catch(() => {});
  
  state.pendingSources = state.allSources.filter(s => (s.addonName || 'Unknown Addon') === selectedAddon);
  await sendSourcesList(loadingMsg, state.currentContent.title, { year: state.currentContent.year }, state.pendingSources, selectedAddon);
}

export async function handleBack(message: Message) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);
  if (!state.currentContent || state.pendingAddons.length === 0) return message.reply('❌ Nothing to go back to.');
  
  const loadingMsg = await message.reply('⏳ Loading addon directory...');
  
  const channel = message.channel;
  for (const mid of state.sourceMessageIds) {
     try {
       const m = await channel.messages.fetch(mid);
       if (m) await m.delete().catch(() => {});
     } catch(e) {}
  }
  state.sourceMessageIds = [];
  await message.delete().catch(() => {});
  
  await sendAddonsList(loadingMsg, state.currentContent.title, { year: state.currentContent.year }, state.pendingAddons);
}

export async function handleS(message: Message, args: string[]) {
    const state = getGuildState(message.guild?.id || message.channel.id);
    if (!state.currentContent || state.currentContent.type !== 'series') return message.reply('❌ Select a series first.');
    const s = parseInt(args[0], 10);
    if (isNaN(s)) return message.reply('❌ Invalid season.');
    state.selectedSeason = s;
    if (state.selectedEpisode !== null) {
        return triggerSeriesSearch(message);
    }
    message.reply(`✅ Season **${s}** selected. Now select episode with \`$e <n>\`.`);
}

export async function handleE(message: Message, args: string[]) {
    const state = getGuildState(message.guild?.id || message.channel.id);
    if (!state.currentContent || state.currentContent.type !== 'series') return message.reply('❌ Select a series first.');
    const e = parseInt(args[0], 10);
    if (isNaN(e)) return message.reply('❌ Invalid episode.');
    state.selectedEpisode = e;
    if (state.selectedSeason !== null) {
        return triggerSeriesSearch(message);
    }
    message.reply(`✅ Episode **${e}** selected. Now select season with \`$s <n>\`.`);
}

async function triggerSeriesSearch(message: Message) {
    const state = getGuildState(message.guild?.id || message.channel.id);
    const loadingMsg = await message.reply(`⏳ Searching for **${state.currentContent!.title}** S${state.selectedSeason} E${state.selectedEpisode}...`);
    const seriesId = `${state.currentContent!.imdbId}:${state.selectedSeason}:${state.selectedEpisode}`;
    
    try {
        const streams = await getStreams(seriesId, 'series');
        if (!streams.length) return loadingMsg.edit('❌ No sources found for this episode.');
        
        const addonNames = Array.from(new Set(streams.map(s => s.addonName || 'Unknown Addon')));
        state.allSources = streams;
        state.pendingAddons = addonNames;
        state.pendingSources = [];
        await sendAddonsList(loadingMsg, `${state.currentContent!.title} S${state.selectedSeason} E${state.selectedEpisode}`, { year: state.currentContent!.year }, addonNames);
    } catch (err) {
        loadingMsg.edit('❌ Error fetching episode sources.');
    }
}
