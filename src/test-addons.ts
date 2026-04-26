import { config } from './config';
import { getUserAddons } from './services/stremio';

async function run() {
    const addons = await getUserAddons();
    console.log(`Addons found: ${addons.length}`);
    const streamAddons = addons.filter(a => Object.values(a.manifest?.resources || {}).some((r: any) => typeof r === 'string' ? r === 'stream' : r.name === 'stream'));
    console.log(`Stream addons found: ${streamAddons.length}`);
    for (const addon of streamAddons) {
        let baseUrl = addon.transportUrl;
        console.log(`- ${addon.manifest?.name}: ${baseUrl}`);
    }
}
run();
