import { Streamer, prepareStream, playStream, Utils } from '@dank074/discord-video-stream';
import { config } from '../config';
import { getGuildState } from '../state';
import { getStreams, resolveStreamUrl } from './stremio';
import { logToFile, logCrash } from './logger';
import fs from 'fs';

export async function startStream(
  streamer: Streamer,
  guildId: string,
  videoUrl: string,
  subtitleLocalPath?: string,
  startTimeSeconds: number = 0
): Promise<void> {
  const state = getGuildState(guildId);
  
  // Professional Encoder (Mac Hardware Acceleration)
  // Higher Bitrate (10M) and High Profile for crisp details
  const encoder: any = () => ({
    H264: {
      name: "h264_videotoolbox",
      options: [
        "-realtime", "true", 
        "-prio_speed", "1", 
        "-forced-idr", "1", 
        "-profile:v", "main",
        "-b:v", "5M", // Force 5Mbps target
        "-maxrate", "7M", // Cap at 7Mbps
        "-bufsize", "10M", // Smaller buffer for quicker recovery/less lag
        "-bf", "0", 
        "-allow_sw", "1", // Fallback if hardware is choked
        "-q:v", "60" // Lower quality slightly to ensure speed > 1.0x
      ]
    }
  });

  const customFfmpegFlags: string[] = [];
  
  // Optimization: Scale to 720p FIRST. This makes subtitle rendering 2x faster.
  let filterStr = "scale=-2:720:flags=bicubic,fps=30";
  if (subtitleLocalPath && fs.existsSync(subtitleLocalPath)) {
    const safePath = subtitleLocalPath.replace(/\\/g, '/');
    filterStr += `,subtitles=filename='${safePath}'`; 
    logToFile('INFO', `Applying subtitles: ${safePath}`);
  }
  
  customFfmpegFlags.push("-vf", filterStr);

  if (startTimeSeconds > 0) {
    customFfmpegFlags.push('-ss', startTimeSeconds.toString());
  }
  
  // Aggressive Audio Sync
  const audioFilters = [];
  if (state.volume !== 100) audioFilters.push(`volume=${state.volume / 100}`);
  audioFilters.push("aresample=async=1000:min_hard_comp=0.100000:first_pts=0"); 
  customFfmpegFlags.push('-af', audioFilters.join(','));

  // Professional delivery mapping (Sync Focused)
  const audioMap = `0:a:${state.audioTrackIndex}?`;
  customFfmpegFlags.push(
    '-map', '0:v:0', 
    '-map', audioMap, 
    '-ac', '2', 
    '-ar', '48000', 
    '-c:a', 'libopus', 
    '-b:a', '128k',
    '-r', '30', 
    '-fps_mode', 'cfr',
    '-tune', 'zerolatency',
    '-threads', '0'
  );

  // Stremio Engine Mimicry
  const streamHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://app.strem.io/",
    "Origin": "https://app.strem.io",
    "Connection": "keep-alive"
  };

  const currentSource = state.currentContent?.originalSource;
  if (currentSource?.behaviorHints?.proxyHeaders?.request) {
    Object.assign(streamHeaders, currentSource.behaviorHints.proxyHeaders.request);
  }

  const headerStr = Object.entries(streamHeaders).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n';

  const streamOptions = {
    encoder,
    frameRate: 30,
    bitrateVideo: 5000, // Matching 5M target
    bitrateVideoMax: 7000,
    videoCodec: Utils.normalizeVideoCodec('H264'),
    includeAudio: true,
    minimizeLatency: true,
    customHeaders: streamHeaders,
    customInputOptions: [
      "-headers", headerStr,
      "-reconnect", "1",
      "-reconnect_at_eof", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "5",
      "-timeout", "90000000",
      "-fflags", "+fastseek+nobuffer+igndts+genpts", 
      "-probesize", "100M", 
      "-analyzeduration", "100M",
      "-threads", "0"
    ],
    customFfmpegFlags: customFfmpegFlags,
  };

  try {
     const { command, output } = prepareStream(videoUrl, streamOptions);
     state.ffmpegCommand = command;
     state.startTime = Date.now() - (startTimeSeconds * 1000); 

     logToFile('INFO', `Starting Pro Stream (10Mpbs/30fps) on guild: ${guildId}`);

     command.on('start', (cmd) => logToFile('FFMPEG', `COMMAND: ${cmd}`));
     command.on('stderr', (line) => {
        logToFile('FFMPEG', line.trim());
     });

     await playStream(output, streamer, { type: 'go-live' });

     // Progress Tracking: Save timestamp every 30s
     const progressInterval = setInterval(() => {
        if (!state.ffmpegCommand || state.isPaused) return;
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        if (state.currentContent && elapsed > 10) { // Only save if played at least 10s
           state.history[state.currentContent.imdbId] = elapsed;
           import('../state').then(m => m.saveGuildHistory(guildId));
        }
     }, 30000);

     state.ffmpegCommand.on('exit', () => {
        clearInterval(progressInterval);
     });
     
  } catch (err: any) {
    if (err.message && err.message.includes('Invalid data found')) {
       logToFile('ERROR', `Stream connection refused or URL expired (Invalid data): ${videoUrl}`);
    } else {
       logCrash(err, `startStream URL: ${videoUrl}`);
    }
    
    // Notify user of failure
    if (state.textChannelId) {
        try {
            const channel: any = await streamer.client.channels.fetch(state.textChannelId);
            if (channel) await channel.send(`❌ **Streaming Failed:** Failed to open or decode source. URL might be expired or unsupported.`);
        } catch(e) {}
    }

    // Don't kill the session, just notify or stop this specific stream
    if (state.ffmpegCommand) {
       try { state.ffmpegCommand.kill('SIGKILL'); } catch (e) {}
       state.ffmpegCommand = null;
    }
  }
}

export async function stopStream(guildId: string): Promise<void> {
  const state = getGuildState(guildId);
  if (state.ffmpegCommand) {
    try { state.ffmpegCommand.kill('SIGKILL'); } catch (e) {}
    state.ffmpegCommand = null;
  }
  state.currentContent = null;
  state.isPaused = false;
  state.pauseTimestamp = 0;
}

export async function playNextInQueue(streamer: Streamer, guildId: string): Promise<void> {
  const state = getGuildState(guildId);
  if (state.queue.length === 0) return;
  
  const next = state.queue.shift();
  if (!next) return;
  
  try {
    await stopStream(guildId);
    const streams = await getStreams(next.imdbId, next.type);
    if (!streams.length) return playNextInQueue(streamer, guildId);
    
    const targetStream = streams[0];
    const streamUrl = await resolveStreamUrl(targetStream);
    if (!streamUrl) return playNextInQueue(streamer, guildId);
    
    state.currentContent = {
      imdbId: next.imdbId, type: next.type, title: next.title, year: next.year, streamUrl, sourceName: targetStream.name || 'Unknown'
    };
    await startStream(streamer, guildId, streamUrl, state.currentSubtitle?.localPath, 0);
  } catch (err: any) {
    logCrash(err, `playNextInQueue`);
    playNextInQueue(streamer, guildId);
  }
}
