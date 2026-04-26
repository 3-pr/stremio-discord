import { Message } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream';
import { getGuildState } from '../state';
import { getSubtitles, resolveStreamUrl } from '../services/stremio';
import { startStream } from '../services/streamer';
import { logToFile, logCrash } from '../services/logger';
import fs from 'fs';
import axios from 'axios';

export async function handleSubtitles(message: Message, args: string[], streamer: Streamer) {
  const guildId = message.guild?.id || message.channel.id;
  const state = getGuildState(guildId);

  if (!state.currentContent) {
    return message.reply('❌ Nothing is currently playing.');
  }

  // Handle Disable subtitles
  if (args[0] && args[0].toLowerCase() === 'off') {
    if (state.currentSubtitle && state.currentSubtitle.localPath && fs.existsSync(state.currentSubtitle.localPath)) {
       fs.unlinkSync(state.currentSubtitle.localPath);
    }
    state.currentSubtitle = null;
    
    if (state.ffmpegCommand) {
        const elapsedMs = Date.now() - state.startTime;
        const ts = Math.floor(elapsedMs / 1000);
        state.ffmpegCommand.kill('SIGKILL');
        state.ffmpegCommand = null;
        await new Promise(r => setTimeout(r, 2500));
        await startStream(streamer, guildId, state.currentContent.streamUrl, undefined, ts);
    }
    return message.reply('✅ Subtitles disabled. Restarting stream...');
  }

  // Provide list
  if (args.length === 0) {
      const loading = await message.reply('⏳ Fetching subtitles...');
      try {
          const playbackId = state.currentContent.type === 'series' && state.selectedSeason !== null && state.selectedEpisode !== null
              ? `${state.currentContent.imdbId}:${state.selectedSeason}:${state.selectedEpisode}`
              : state.currentContent.imdbId;

          const subs = await getSubtitles(playbackId, state.currentContent.type);
          if (subs.length === 0) return loading.edit('📝 No subtitles available.');
          
          const sortedSubs = subs.sort((a, b) => {
             const aIsAra = a.lang.toLowerCase().includes('ara') ? 1 : 0;
             const bIsAra = b.lang.toLowerCase().includes('ara') ? 1 : 0;
             return bIsAra - aIsAra;
          });

          state.pendingSubtitles = sortedSubs;

          let listStr = '';
          const limit = Math.min(sortedSubs.length, 35);
          for (let i = 0; i < limit; i++) {
             const line = `**${i + 1}.** ${sortedSubs[i].lang} (${sortedSubs[i].id})\n`;
             if (listStr.length + line.length > 1800) break;
             listStr += line;
          }

          const responseText = `📝 **Subtitles for ${state.currentContent.title}**\n─────────────────────────────────────\n${listStr}─────────────────────────────────────\n**❌ Disable:** \`$subtitles off\`\nReply with \`$subtitles <number>\` to select.`;

          await message.channel.send(responseText);
          await loading.delete().catch(() => {});
      } catch (err: any) {
          logCrash(err, 'handleSubtitles (Fetch)');
          loading.edit(`❌ Failed to fetch subtitles: ${err.message}`);
      }
      return;
  }

  // Handle Selection
  const selection = parseInt(args[0], 10);
  if (isNaN(selection) || selection < 1 || !state.pendingSubtitles || selection > state.pendingSubtitles.length) {
    return message.reply('❌ Invalid selection.');
  }

  const selectedSub = state.pendingSubtitles[selection - 1];
  const loadingSub = await message.reply(`✅ Selected: ${selectedSub.lang}. Downloading...`);

  try {
      const tempPath = `/tmp/sub_${Date.now()}.vtt`;
      logToFile('INFO', `Downloading subtitle from: ${selectedSub.url}`);
      
      const subContent = await axios.get(selectedSub.url, { responseType: 'stream', timeout: 15000 });
      const writer = fs.createWriteStream(tempPath);
      subContent.data.pipe(writer);

      await new Promise((resolve, reject) => {
         writer.on('finish', () => resolve(null));
         writer.on('error', reject);
      });

      if (state.currentSubtitle && state.currentSubtitle.localPath && fs.existsSync(state.currentSubtitle.localPath)) {
        fs.unlinkSync(state.currentSubtitle.localPath);
      }

      state.currentSubtitle = { lang: selectedSub.lang, url: selectedSub.url, localPath: tempPath };
      logToFile('INFO', `Subtitle saved to: ${tempPath}`);

      if (state.ffmpegCommand) {
        const elapsedMs = Date.now() - state.startTime;
        const ts = Math.floor(elapsedMs / 1000);
        
        await message.reply('⏳ **Applying subtitles...** The stream will restart in a few seconds at your current position.');

        let urlToUse = state.currentContent.streamUrl;
        if (state.currentContent.originalSource) {
           const freshUrl = await resolveStreamUrl(state.currentContent.originalSource);
           if (freshUrl) {
              urlToUse = freshUrl;
              state.currentContent.streamUrl = freshUrl;
              logToFile('INFO', 'Re-resolved stream URL for subtitle restart.');
           }
        }

        logToFile('INFO', `Restarting FFmpeg at timestamp: ${ts}s for subtitle application.`);
        state.ffmpegCommand.kill('SIGKILL');
        state.ffmpegCommand = null;
        await new Promise(r => setTimeout(r, 2500));
        await startStream(streamer, guildId, urlToUse, tempPath, ts);
      }
      await loadingSub.delete().catch(() => {});
  } catch(e: any) {
     logCrash(e, `handleSubtitles (Selection)`);
     return message.reply(`❌ Failed to apply subtitle: ${e.message}`);
  }
}
