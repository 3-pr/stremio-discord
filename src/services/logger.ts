import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logToFile(type: 'ERROR' | 'INFO' | 'FFMPEG', message: string) {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `${dateStr}_${type.toLowerCase()}.log`);
  
  const formattedMessage = `[${timestamp}] ${message}\n`;
  
  fs.appendFileSync(logFile, formattedMessage);
  console.log(formattedMessage.trim());
}

export function logCrash(err: any, context: string) {
  const timestamp = new Date().toISOString();
  const crashLog = path.join(LOG_DIR, `crash_${timestamp.replace(/[:.]/g, '-')}.log`);
  
  const content = `Crash Context: ${context}\n` +
                  `Message: ${err.message}\n` +
                  `Stack: ${err.stack}\n` +
                  `Full Error: ${JSON.stringify(err, null, 2)}`;
  
  fs.writeFileSync(crashLog, content);
  logToFile('ERROR', `CRASH in ${context}: ${err.message}. Full log saved to ${path.basename(crashLog)}`);
}
