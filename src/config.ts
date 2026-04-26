import dotenv from 'dotenv';
dotenv.config();

export const config = {
  selfbotToken: process.env.SELFBOT_TOKEN || '',
  ownerId: process.env.OWNER_ID || '',
  commandPrefix: process.env.COMMAND_PREFIX || '$',
  stremioUrl: `http://${process.env.STREMIO_HOST || 'localhost'}:${process.env.STREMIO_PORT || '11470'}`,
  stremioAuthKey: process.env.STREMIO_AUTH_KEY || '',
  defaultVideoHeight: parseInt(process.env.DEFAULT_VIDEO_HEIGHT || '1080', 10),
  defaultFps: parseInt(process.env.DEFAULT_FPS || '24', 10),
  defaultBitrate: parseInt(process.env.DEFAULT_BITRATE || '4000', 10),
};
