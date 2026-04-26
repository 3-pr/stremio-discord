import axios from 'axios';
import { config } from '../config';
import { StreamSource, ContentMeta, SubtitleTrack } from '../state';
import { logToFile } from './logger';

export interface CatalogItem {
  id: string;
  name: string;
  type: "movie" | "series";
  year?: string;
}

const STREMIO_API = config.stremioUrl;

export async function getUserAddons(): Promise<any[]> {
    if (!config.stremioAuthKey) return [];
    try {
        const payload = {
            type: "AddonCollectionGet",
            authKey: config.stremioAuthKey,
            update: true
        };
        const res = await axios.post('https://api.strem.io/api/addonCollectionGet', payload, { timeout: 10000 });
        if (res.data && res.data.result && Array.isArray(res.data.result.addons)) {
            return res.data.result.addons;
        }
    } catch(e: any) {
        logToFile('ERROR', `Failed to fetch Addons: ${e.message}`);
    }
    return [];
}

export async function searchCatalog(query: string, type: "movie" | "series" = "movie"): Promise<CatalogItem[]> {
  try {
    const url = `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;
    const response = await axios.get(url, { timeout: 10000 });
    if (response.data && Array.isArray(response.data.metas)) {
      return response.data.metas.map((m: any) => ({
        id: m.id,
        name: m.name,
        type: m.type as 'movie' | 'series',
        year: m.releaseInfo || m.year?.toString()
      }));
    }
  } catch (err: any) {
    logToFile('ERROR', `searchCatalog error: ${err.message}`);
  }
  return [];
}

export async function getStreams(imdbId: string, type: string): Promise<StreamSource[]> {
  logToFile('INFO', `Searching for all possible streams for ${imdbId}...`);
  const allStreams: StreamSource[] = [];

  // 1. User Addons (Cloud)
  if (config.stremioAuthKey) {
      const addons = await getUserAddons();
      const streamAddons = addons.filter(a => {
           const resources = a.manifest?.resources || [];
           const resourceList = Array.isArray(resources) ? resources : Object.values(resources);
           return resourceList.some((r: any) => typeof r === 'string' ? r === 'stream' : r.name === 'stream');
      });
      
      const promises = streamAddons.map(async (addon) => {
          try {
              let baseUrl = addon.transportUrl;
              if (baseUrl.endsWith('/manifest.json')) baseUrl = baseUrl.replace('/manifest.json', '');
              const res = await axios.get(`${baseUrl}/stream/${type}/${imdbId}.json`, { timeout: 30000 });
              if (res.data && Array.isArray(res.data.streams)) {
                  return res.data.streams.map((s: any) => ({ 
                    ...s, 
                    name: s.name || addon.manifest.name, 
                    addonName: addon.manifest.name 
                  }));
              }
          } catch(e: any) {
              logToFile('ERROR', `Addon ${addon.manifest?.name || 'Unknown'} failed: ${e.message}`);
          }
          return [];
      });
      const results = await Promise.all(promises);
      results.forEach(arr => allStreams.push(...arr));
  }

  logToFile('INFO', `Found ${allStreams.length} total raw streams.`);
  
  // Deduplicate by URL or infoHash
  const unique = Array.from(new Map(allStreams.map(s => [s.url || s.infoHash, s])).values());
  
  // Sort by quality: 4K/UHD > 1080p/FHD > 720p/HD > SD/Others
  const qualityScore = (title: string = "") => {
    const t = title.toLowerCase();
    if (t.includes("4k") || t.includes("2160p") || t.includes("uhd")) return 400;
    if (t.includes("1080p") || t.includes("fhd") || t.includes("1080")) return 300;
    if (t.includes("720p") || t.includes("hd") || t.includes("720")) return 200;
    if (t.includes("480p") || t.includes("sd")) return 100;
    return 0;
  };

  unique.sort((a, b) => {
    const scoreA = qualityScore(a.title || a.name);
    const scoreB = qualityScore(b.title || b.name);
    if (scoreB !== scoreA) return scoreB - scoreA;
    // Secondary sort by seeders if available
    const seedsA = parseInt(a.title?.match(/🌱\s*(\d+)/)?.[1] || "0");
    const seedsB = parseInt(b.title?.match(/🌱\s*(\d+)/)?.[1] || "0");
    return seedsB - seedsA;
  });

  return unique;
}

export async function getMetadata(imdbId: string, type: string): Promise<ContentMeta | null> {
  try {
    const url = `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`;
    const response = await axios.get(url, { timeout: 10000 });
    if (response.data && response.data.meta) {
      const meta = response.data.meta;
      return {
        name: meta.name,
        year: meta.year,
        description: meta.description,
        poster: meta.poster,
        runtime: meta.runtime,
        genres: meta.genres
      };
    }
  } catch (err: any) {
    logToFile('ERROR', `getMetadata error: ${err.message}`);
  }
  return null;
}

export async function getSubtitles(playbackId: string, type: string): Promise<SubtitleTrack[]> {
  logToFile('INFO', `Fetching subtitles for ${playbackId}...`);
  const allSubs: SubtitleTrack[] = [];

  // OpenSubtitles V3 (Official)
  try {
    const osUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/${encodeURIComponent(playbackId)}.json`;
    const osRes = await axios.get(osUrl, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
    if (osRes.data?.subtitles) allSubs.push(...osRes.data.subtitles);
  } catch(e) {}

  // User Addons
  if (config.stremioAuthKey) {
      const addons = await getUserAddons();
      const subAddons = addons.filter(a => {
          const resources = a.manifest?.resources || [];
          const resourceList = Array.isArray(resources) ? resources : Object.values(resources);
          const hasSubtitle = resourceList.some((r: any) => typeof r === 'string' ? r === 'subtitles' : r.name === 'subtitles');
          if (hasSubtitle) logToFile('INFO', `Detected Subtitle Addon: ${a.manifest?.name}`);
          return hasSubtitle;
      });
      const promises = subAddons.map(async (addon) => {
          try {
              let baseUrl = addon.transportUrl;
              if (baseUrl.endsWith('/manifest.json')) baseUrl = baseUrl.replace('/manifest.json', '');
              
              const fetchUrl = `${baseUrl}/subtitles/${type}/${encodeURIComponent(playbackId)}.json`;
              logToFile('INFO', `Fetching from ${addon.manifest?.name}: ${fetchUrl}`);
              
              const res = await axios.get(fetchUrl, { timeout: 15000 });
              const tracks = res.data?.subtitles || [];
              logToFile('INFO', `- ${addon.manifest?.name}: Found ${tracks.length} tracks.`);
              return tracks;
          } catch(e: any) {
              logToFile('ERROR', `Subtitle Addon ${addon.manifest?.name} failed: ${e.message}`);
          }
          return [];
      });
      const results = await Promise.all(promises);
      results.forEach(arr => allSubs.push(...arr));
  }

  return allSubs;
}

export async function resolveStreamUrl(stream: StreamSource): Promise<string | null> {
  if (stream.url && stream.url.startsWith('http')) return stream.url;
  if (stream.infoHash) {
    return `${STREMIO_API}/${stream.infoHash}/${stream.fileIdx || 0}`;
  }
  return null;
}
