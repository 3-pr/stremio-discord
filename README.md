# Stremio Discord Selfbot 🎬🍿

A high-performance Stremio playback bot for Discord Go-Live, optimized for a cinematic experience with hardware acceleration and professional streaming configurations.

---

## 🌍 Language Support
- [العربية (Arabic) - README_AR.md](./README_AR.md)

---

## ⚠️ WARNINGS & RISKS

> [!CAUTION]
> **Discord TOS Warning**: This is a **Selfbot**. Using selfbots is against Discord Terminal of Service (TOS) and may result in your account being **suspended or permanently banned**. 
> - **Use at your own risk.** 
> - It is highly recommended to use an **alternate (alt) account**.
> - Do not use this in public or large servers where it can be reported.

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

## 🏗 Architecture Overview

The bot acts as a bridge between the Stremio ecosystem and Discord's Go-Live streaming protocol:

1.  **Stremio Addon Logic**: Parses and interacts with Stremio addons to fetch metadata and stream sources.
2.  **Stream Resolver**: Handles URL decryption and proxy header extraction.
3.  **FFmpeg Transcoding**: An optimized FFmpeg pipeline handles:
    -   **Scaling**: Real-time Bicubic scaling (720p/1080p).
    -   **Filtering**: Subtitle overlay and frame rate stabilization.
    -   **Sync**: Advanced audio/video synchronization (+genpts, aggressive aresample).
4.  **Discord Pipeline**: Pushes the raw H.264 stream directly to Discord's voice servers using `discord-video-stream`.

---

## 📘 Step-by-Step Setup Guide

### 1. Prerequisites
- **Node.js** v18 or newer.
- **FFmpeg**: Must be compiled with `libass` (required for subtitles).
  - **Mac**: `brew tap homebrew-ffmpeg/ffmpeg && brew install homebrew-ffmpeg/ffmpeg/ffmpeg --with-libass`
  - **Linux/Windows**: Ensure `ffmpeg -version` shows `--enable-libass`.

### 2. Configuration
1.  **Clone the Repo**: `git clone https://github.com/3-pr/stremio-discord`
2.  **Install Packages**: `npm install`
3.  **Environment Variables**: Create a `.env` file from the following template:
    ```env
    SELFBOT_TOKEN=your_discord_token_here
    OWNER_ID=your_discord_id
    COMMAND_PREFIX=$
    STREMIO_HOST=localhost
    STREMIO_PORT=11470
    ```

### 3. Running the Bot
1.  **Build**: `npm run build`
2.  **Start**: `npm start`
3.  Join a voice channel and type `$play <movie name>` to start.

---

## 📝 TODO / Roadmap
- [ ] **Extreme Stability**: Refine the transcoding engine for 100% uptime and near-zero latency.
- [ ] **Full Stremio Sync**: Real-time sync for libraries, watchlists, and progress with official Stremio accounts.
- [ ] **Ultra-High Quality**: Future support for 4K streaming and HEVC (H.265) encoding.
- [ ] **Platform Expansion**: Support for external streaming sources and third-party meta-providers.
- [ ] **Web Dashboard**: A professional glassmorphic UI to control playback via browser.

---

## 👨‍💻 Developer
Developed by **YASSER ALHARBI**

- **Website**: [3-pr.github.io](https://3-pr.github.io)
- **Project**: [stremio-discord](https://github.com/3-pr/stremio-discord)

---

## ⚖️ License & Disclaimer
This project is for educational and personal use only. Use at your own risk.
