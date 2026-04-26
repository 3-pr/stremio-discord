import { config } from './config';
import { getUserAddons } from './services/stremio';
import axios from 'axios';

async function run() {
    const addons = await getUserAddons();
    const streamAddons = addons.filter(a => Object.values(a.manifest?.resources || {}).some((r: any) => typeof r === 'string' ? r === 'stream' : r.name === 'stream'));
    
    const imdbId = 'tt0111161';
    const type = 'movie';

    for (const addon of streamAddons) {
        let baseUrl = addon.transportUrl;
        if (baseUrl.endsWith('/manifest.json')) baseUrl = baseUrl.replace('/manifest.json', '');
        
        console.log(`Fetching from: ${baseUrl}/stream/${type}/${imdbId}.json`);
        try {
            const res = await axios.get(`${baseUrl}/stream/${type}/${imdbId}.json`, { timeout: 15000 });
            const streams = res.data?.streams || [];
            console.log(`- ${addon.manifest?.name}: ${streams.length} streams`);
        } catch(e: any) {
            console.log(`- ${addon.manifest?.name}: ERROR ${e.message}`);
        }
    }
}
run();
