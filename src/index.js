#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import os from 'os';
import { MusicPlayerApp } from './app/MusicPlayerApp.js';

function printHelp() {
  console.log(`
CLI Music Player - Terminal-based audio player for macOS

Usage:
  music-player [directory]
  node src/index.js [directory]

Options:
  -h, --help     Show help information
  -v, --version  Show application version

Examples:
  node src/index.js ~/Music
  node src/index.js ./music

Controls:
  [↑ / ↓] Navigation         [Enter] Play Selected      [Space] Pause / Resume
  [← / →] Seek (10s)         [N] Next Track             [P] Previous Track
  [+] / [-] Volume           [S] Toggle Shuffle         [R] Toggle Repeat
  [/] Search Songs           [F] Toggle Favorite        [Tab / 1-4] Switch Views
  [A] Add to Playlist        [C] Create Playlist        [D] Delete Playlist/Song
  [X] Stop Playback          [Q] Quit
`);
}

function resolveMusicDirectory(args) {
  let dirArg = args.find((arg) => !arg.startsWith('-'));

  if (!dirArg) {
    // Default to ./music if it exists, otherwise ~/Music
    const localMusic = path.resolve(process.cwd(), 'music');
    if (fs.existsSync(localMusic) && fs.statSync(localMusic).isDirectory()) {
      return localMusic;
    }
    dirArg = path.join(os.homedir(), 'Music');
  }

  // Expand tilde (~) if present
  if (dirArg.startsWith('~')) {
    dirArg = path.join(os.homedir(), dirArg.slice(1));
  }

  return path.resolve(process.cwd(), dirArg);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log('CLI Music Player v1.0.0');
    process.exit(0);
  }

  const targetDir = resolveMusicDirectory(args);

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory does not exist: "${targetDir}"`);
    console.error('Usage: music-player <directory>');
    process.exit(1);
  }

  const app = new MusicPlayerApp();
  await app.start(targetDir);
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
