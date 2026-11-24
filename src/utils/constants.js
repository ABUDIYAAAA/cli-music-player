export const DEFAULT_VOLUME = 80;
export const MIN_VOLUME = 0;
export const MAX_VOLUME = 100;
export const VOLUME_STEP = 5;

export const MAX_HISTORY_SIZE = 20;

export const SUPPORTED_EXTENSIONS = [
  '.mp3',
  '.m4a',
  '.wav',
  '.aac',
  '.aiff',
  '.flac'
];

export const PROGRESS_BAR_WIDTH = 28;
export const TICK_INTERVAL_MS = 200;

export const VIEW_MODES = Object.freeze({
  LIBRARY: 'LIBRARY',
  PLAYLISTS: 'PLAYLISTS',
  FAVORITES: 'FAVORITES',
  HISTORY: 'HISTORY'
});

export const REPEAT_MODES = Object.freeze({
  OFF: 'OFF',
  ONE: 'ONE',
  ALL: 'ALL'
});

export const DEFAULT_PLAYLIST_FILE = '.cli-music-player-playlists.json';
