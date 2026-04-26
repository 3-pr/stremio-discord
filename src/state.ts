import fs from 'fs';
import path from 'path';

export interface CatalogItem {
  id: string;
  name: string;
  year?: string;
  type: "movie" | "series";
  poster?: string;
}

export interface StreamSource {
  name?: string;
  title?: string;
  url?: string;
  infoHash?: string; // Magnet equivalent
  fileIdx?: number;
  behaviorHints?: any;
  addonName?: string;
}

export interface ContentMeta {
  name: string;
  year?: string;
  description?: string;
  poster?: string;
  runtime?: string;
  genres?: string[];
}

export interface SubtitleTrack {
  id: string;
  url: string;
  lang: string;
}

export interface QueueItem {
  imdbId: string;
  type: "movie" | "series";
  title: string;
  year?: string;
}

export interface GuildState {
  voiceChannelId: string | null;
  textChannelId: string | null;
  currentContent: {
    imdbId: string;
    type: "movie" | "series";
    title: string;
    year?: string;
    streamUrl: string;
    sourceName: string;
    originalSource?: StreamSource;
  } | null;
  currentSubtitle: { lang: string; url: string; localPath?: string } | null;
  allSources: StreamSource[];
  pendingSources: StreamSource[];
  pendingAddons: string[];
  pendingSubtitles: SubtitleTrack[];
  queue: QueueItem[];
  volume: number;
  isPaused: boolean;
  pauseTimestamp: number; // Seconds into the stream
  startTime: number; // Date.now() when stream started
  ffmpegCommand: any | null; // The command object returned from prepareStream()
  audioTrackIndex: number; // 0-based index for audio tracks
  selectedSeason: number | null;
  selectedEpisode: number | null;
  sourceMessageIds: string[]; // Track messages to delete later
  history: Record<string, number>; // imdbId -> timestamp in seconds
}

// Global state map holding state per guild ID
export const globalState: Record<string, GuildState> = {};

export function getGuildState(guildId: string): GuildState {
  if (!globalState[guildId]) {
    globalState[guildId] = {
      voiceChannelId: null,
      textChannelId: null,
      currentContent: null,
      currentSubtitle: null,
      allSources: [],
      pendingSources: [],
      pendingAddons: [],
      pendingSubtitles: [],
      queue: [],
      volume: 100,
      isPaused: false,
      pauseTimestamp: 0,
      startTime: 0,
      ffmpegCommand: null,
      audioTrackIndex: 0,
      selectedSeason: null,
      selectedEpisode: null,
      sourceMessageIds: [],
      history: loadHistory(guildId),
    };
  }
  return globalState[guildId];
}

const HISTORY_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR);

function getHistoryPath(guildId: string) {
  return path.join(HISTORY_DIR, `history_${guildId}.json`);
}

function loadHistory(guildId: string): Record<string, number> {
  try {
    const p = getHistoryPath(guildId);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {}
  return {};
}

export function saveGuildHistory(guildId: string) {
  try {
    const state = globalState[guildId];
    if (!state) return;
    const p = getHistoryPath(guildId);
    fs.writeFileSync(p, JSON.stringify(state.history, null, 2));
  } catch (e) {}
}
