import { Message } from 'discord.js-selfbot-v13';

export async function handleHelp(message: Message) {
  const helpText = `
✨ **Stremio Discord Bot - Help Menu** ✨
━━━━━━━━━━━━━━━━━━━━
🎥 **Playback Commands:**
• \`$play <search query>\` - Search and play a movie/series.
• \`$play-id <imdb_id> <type>\` - Play by ID (e.g. \`$play-id tt12345 movie\`).
• \`$stop\` - Stop the stream and leave voice.
• \`$pause\` / \`$resume\` - Control playback.

📺 **Series Control:**
• \`$s <number>\` - Select Season.
• \`$e <number>\` - Select Episode.

🔊 **Audio & Subtitles:**
• \`$audio\` - List and switch audio tracks.
• \`$subtitles\` - List and switch subtitles (Includes Arabic).
• \`$volume <0-200>\` - Adjust volume.

ℹ️ **Info:**
• \`$info\` - Show current stream details.
• \`$help\` - Show this menu.

━━━━━━━━━━━━━━━━━━━━
🌐 **Project Links:**
• Website: [3-pr.github.io](https://3-pr.github.io)
• Project: [3.pr/discord](https://3.pr/discord)
  `;

  await message.reply(helpText);
}
