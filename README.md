# Stremio Discord Selfbot 🎬🍿

A high-performance Stremio playback bot for Discord Go-Live, optimized for a cinematic experience with hardware acceleration and professional streaming configurations.

---

## ✨ Key Features

- **TV Series Support**: Full navigation for Seasons and Episodes with dedicated commands.
- **Professional Streaming**: Pre-configured at **10Mbps / 30fps** with hardware acceleration support (`h264_videotoolbox` for Mac).
- **Hardcoded Subtitles**: Robust support for subtitles (including **Arabic** priority) using the `subtitles` filter with `libass`.
- **Engine Mirroring**: Mimics Stremio's engine behavior, passing proxy headers and handling complex stream resolutions.
- **Auto-Refresh Logic**: Automatically re-resolves stream URLs before restart to prevent "Invalid Data" crashes due to expired links.
- **Continue Watching**: Remembers your playback position and offers to resume from where you left off.
- **Audio Switcher**: Support for multi-language audio tracks within the same stream.

---

## 🛠 Tech Stack & Architecture

The bot acts as a bridge between the Stremio ecosystem and Discord's Go-Live streaming protocol:

1.  **Stremio Addon Logic**: Parses and interacts with Stremio addons to fetch metadata and stream sources.
2.  **Stream Resolver**: Handles URL decryption and proxy header extraction.
3.  **FFmpeg Transcoding**: An optimized FFmpeg pipeline handles:
    -   **Scaling**: Real-time Bicubic scaling (720p/1080p).
    -   **Filtering**: Subtitle overlay and frame rate stabilization.
    -   **Sync**: Advanced audio/video synchronization (+genpts, aggressive aresample).
4.  **Discord Pipeline**: Pushes the raw H.264 stream directly to Discord's voice servers using `discord-video-stream`.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **FFmpeg** (Must be compiled with `libass` for subtitles). 
  - *Mac:* `brew install homebrew-ffmpeg/ffmpeg/ffmpeg`

### Installation
1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Configure `.env` (Rename `.env.example` and add your `SELFBOT_TOKEN`).
4.  Build and Start: `npm run build && npm start`

---

## 👨‍💻 Developer
Developed by **YASSER ALHARBI**

- **Website**: [3-pr.github.io](https://3-pr.github.io)
- **Project**: [3.pr/discord](https://3.pr/discord)

---

## ⚖️ License & Disclaimer
This project is for educational and personal use only. Use at your own risk.
