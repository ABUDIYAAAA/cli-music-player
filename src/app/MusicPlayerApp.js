import path from 'path';
import os from 'os';
import { AudioPlayer } from '../player/AudioPlayer.js';
import { MusicLibrary } from '../library/MusicLibrary.js';
import { PlaylistManager } from '../playlist/PlaylistManager.js';
import { PlaybackHistory } from '../history/PlaybackHistory.js';
import { KeyboardController } from '../input/KeyboardController.js';
import { TerminalUI } from '../ui/TerminalUI.js';
import { FileScanner } from '../library/FileScanner.js';
import { PlaybackState } from '../player/PlaybackState.js';
import {
  VIEW_MODES,
  REPEAT_MODES,
  SEEK_STEP_SECONDS,
  VOLUME_STEP
} from '../utils/constants.js';
import { formatTime } from '../utils/formatTime.js';
import { shuffleArray, getShuffledIndices } from '../utils/shuffle.js';
import { Terminal } from '../utils/terminal.js';

export class MusicPlayerApp {
  /**
   * @param {Object} [options]
   * @param {AudioPlayer} [options.player]
   * @param {MusicLibrary} [options.library]
   * @param {PlaylistManager} [options.playlistManager]
   * @param {PlaybackHistory} [options.history]
   * @param {KeyboardController} [options.keyboardController]
   * @param {TerminalUI} [options.ui]
   */
  constructor(options = {}) {
    this.player = options.player || new AudioPlayer();
    this.library = options.library || new MusicLibrary();
    this.playlistManager = options.playlistManager || new PlaylistManager();
    this.history = options.history || new PlaybackHistory();
    this.keyboard = options.keyboardController || new KeyboardController();
    this.ui = options.ui || new TerminalUI();

    // App state
    this.activeView = VIEW_MODES.LIBRARY;
    this.selectedIndices = {
      [VIEW_MODES.LIBRARY]: 0,
      [VIEW_MODES.PLAYLISTS]: 0,
      [VIEW_MODES.FAVORITES]: 0,
      [VIEW_MODES.HISTORY]: 0,
      PLAYLIST_SONGS: 0
    };

    this.activePlaylistName = null;
    this.searchQuery = '';
    this.isSearching = false;
    this.promptAction = null; // 'SEARCH' | 'CREATE_PLAYLIST' | 'CREATE_PLAYLIST_AND_ADD' | 'CHANGE_DIRECTORY'
    this.isPickingPlaylist = false;
    this.songToAddToPlaylist = null;

    this.shuffleEnabled = false;
    this.repeatMode = REPEAT_MODES.OFF;

    this.notification = '';
    this._notificationTimer = null;

    this.playbackQueue = [];
    this.queueIndex = -1;
    this.shuffledOrder = [];
  }

  /**
   * Initializes and starts the music player.
   * @param {string} musicDirectory
   */
  async start(musicDirectory) {
    Terminal.setupCleanup(() => this.shutdown());

    try {
      this.showNotification(`Scanning directory: ${musicDirectory}...`);
      const songs = await FileScanner.scanDirectory(musicDirectory);
      this.library.setSongs(songs);
      await this.playlistManager.init();

      if (songs.length === 0) {
        this.showNotification('No supported audio files found in directory.');
      } else {
        this.showNotification(`Loaded ${songs.length} song(s).`);
      }
    } catch (err) {
      this.showNotification(`Error scanning directory: ${err.message}`);
    }

    this._setupListeners();
    this.ui.start();
    this.keyboard.start();
    this.render();
  }

  /**
   * Clean shutdown.
   */
  shutdown() {
    this.player.stop();
    this.keyboard.stop();
    this.ui.stop();
  }

  showNotification(msg) {
    this.notification = msg;
    if (this._notificationTimer) clearTimeout(this._notificationTimer);
    this._notificationTimer = setTimeout(() => {
      this.notification = '';
      this.render();
    }, 4000);
    this.render();
  }

  render() {
    const currentItems = this._getCurrentViewItems();
    const currentViewKey = this._getCurrentViewKey();
    const selectedIndex = this.selectedIndices[currentViewKey] || 0;

    let subTitle = '';
    if (this.isPickingPlaylist && this.songToAddToPlaylist) {
      subTitle = `Add "${this.songToAddToPlaylist.title}" to Playlist`;
    } else if (this.activeView === VIEW_MODES.PLAYLISTS) {
      subTitle = this.activePlaylistName
        ? `Playlist: ${this.activePlaylistName}`
        : 'All Playlists';
    } else if (this.searchQuery) {
      subTitle = `Search: "${this.searchQuery}"`;
    }

    let promptLabel = '';
    let promptHelp = '';

    if (this.keyboard.isInputMode) {
      if (
        this.promptAction === 'CREATE_PLAYLIST' ||
        this.promptAction === 'CREATE_PLAYLIST_AND_ADD'
      ) {
        promptLabel = 'Playlist Name';
        promptHelp = 'Type new playlist name';
      } else if (this.promptAction === 'CHANGE_DIRECTORY') {
        promptLabel = 'Directory Path';
        promptHelp = 'Type directory path';
      } else {
        promptLabel = 'Search';
        promptHelp = 'Type search query';
      }
    }

    this.ui.render({
      activeView: this.activeView,
      totalSongs: this.library.count,
      subTitle,
      items: currentItems,
      selectedIndex,
      currentPlayingSong: this.player.currentSong,
      isFavoriteFn: (id) => this.playlistManager.isFavorite(id),
      currentPosition: this.player.currentPosition,
      duration: this.player.duration,
      playbackState: this.player.state,
      volume: this.player.volume,
      shuffleEnabled: this.shuffleEnabled,
      repeatMode: this.repeatMode,
      notification: this.notification,
      promptLabel,
      promptHelp,
      inputBuffer: this.keyboard.inputBuffer
    });
  }

  _setupListeners() {
    // Audio Player events
    this.player.on('stateChange', () => this.render());
    this.player.on('timeUpdate', () => this.render());
    this.player.on('volumeChange', () => this.render());
    this.player.on('error', (err) => this.showNotification(err.message));

    this.player.on('ended', (song) => {
      if (this.repeatMode === REPEAT_MODES.ONE && song) {
        this.player.play(song);
      } else {
        this.nextTrack();
      }
    });

    // Keyboard Controller actions
    this.keyboard.on('action', (action) => this._handleAction(action));
  }

  _handleAction(action) {
    switch (action.type) {
      case 'SELECT_PREVIOUS':
        this._moveSelection(-1);
        break;
      case 'SELECT_NEXT':
        this._moveSelection(1);
        break;
      case 'PLAY_SELECTED':
        this.playSelected();
        break;
      case 'TOGGLE_PLAYBACK':
        if (this.player.state === PlaybackState.STOPPED) {
          this.playSelected();
        } else {
          this.player.togglePlayPause();
        }
        break;
      case 'STOP_PLAYBACK':
        this.player.stop();
        this.showNotification('Playback stopped.');
        break;
      case 'NEXT_TRACK':
        this.nextTrack();
        break;
      case 'PREVIOUS_TRACK':
        this.previousTrack();
        break;
      case 'SEEK_FORWARD':
        this.player.seek(SEEK_STEP_SECONDS);
        this.showNotification(`Seek: ${formatTime(this.player.currentPosition)}`);
        break;
      case 'SEEK_BACKWARD':
        this.player.seek(-SEEK_STEP_SECONDS);
        this.showNotification(`Seek: ${formatTime(this.player.currentPosition)}`);
        break;
      case 'VOLUME_UP':
        this.player.setVolume(this.player.volume + VOLUME_STEP);
        this.showNotification(`Volume: ${this.player.volume}%`);
        break;
      case 'VOLUME_DOWN':
        this.player.setVolume(this.player.volume - VOLUME_STEP);
        this.showNotification(`Volume: ${this.player.volume}%`);
        break;
      case 'TOGGLE_SHUFFLE':
        this.toggleShuffle();
        break;
      case 'TOGGLE_REPEAT':
        this.toggleRepeat();
        break;
      case 'START_SEARCH':
        this.promptAction = 'SEARCH';
        this.keyboard.enterInputMode(this.searchQuery);
        this.render();
        break;
      case 'CLEAR_SEARCH':
        this.searchQuery = '';
        this.selectedIndices[VIEW_MODES.LIBRARY] = 0;
        this.showNotification('Search cleared.');
        break;
      case 'TOGGLE_FAVORITE':
        this.toggleFavoriteSelected();
        break;
      case 'ADD_TO_PLAYLIST':
        this.addSelectedToPlaylistPrompt();
        break;
      case 'CREATE_PLAYLIST':
        this.promptAction = 'CREATE_PLAYLIST';
        this.keyboard.enterInputMode();
        this.showNotification('Enter new playlist name:');
        break;
      case 'OPEN_DIRECTORY':
        this.promptAction = 'CHANGE_DIRECTORY';
        this.keyboard.enterInputMode();
        this.showNotification('Enter directory path:');
        break;
      case 'DELETE_ITEM':
        this.deleteSelectedItem();
        break;
      case 'CYCLE_VIEW':
        this.cycleView();
        break;
      case 'SET_VIEW':
        this.setViewByNumber(action.payload);
        break;
      case 'INPUT_CHANGE':
        if (this.promptAction === 'SEARCH') {
          this.searchQuery = action.payload;
          this.selectedIndices[VIEW_MODES.LIBRARY] = 0;
        }
        this.render();
        break;
      case 'INPUT_SUBMIT':
        this._handleInputSubmit(action.payload);
        break;
      case 'INPUT_CANCEL':
        this.promptAction = null;
        this.render();
        break;
      case 'QUIT':
        this.shutdown();
        process.exit(0);
        break;
    }
    this.render();
  }

  _handleInputSubmit(text) {
    if (this.promptAction === 'SEARCH') {
      this.searchQuery = text;
      this.showNotification(`Filtering by: "${text}"`);
    } else if (this.promptAction === 'CREATE_PLAYLIST') {
      if (text.trim()) {
        const created = this.playlistManager.createPlaylist(text.trim());
        if (created) {
          this.showNotification(`Created playlist "${text.trim()}".`);
        } else {
          this.showNotification(`Playlist "${text.trim()}" already exists or invalid.`);
        }
      }
    } else if (this.promptAction === 'CREATE_PLAYLIST_AND_ADD') {
      if (text.trim() && this.songToAddToPlaylist) {
        const cleanName = text.trim();
        this.playlistManager.createPlaylist(cleanName);
        this.playlistManager.addSongToPlaylist(cleanName, this.songToAddToPlaylist);
        this.showNotification(`Created playlist "${cleanName}" & added "${this.songToAddToPlaylist.title}".`);
      }
      this.songToAddToPlaylist = null;
    } else if (this.promptAction === 'CHANGE_DIRECTORY') {
      this._changeDirectory(text);
    }
    this.promptAction = null;
    this.isPickingPlaylist = false;
  }

  async _changeDirectory(dirText) {
    if (!dirText || !dirText.trim()) return;
    let dirPath = dirText.trim();
    if (dirPath.startsWith('~')) {
      dirPath = path.join(os.homedir(), dirPath.slice(1));
    }
    dirPath = path.resolve(process.cwd(), dirPath);

    try {
      this.showNotification(`Scanning ${dirPath}...`);
      const songs = await FileScanner.scanDirectory(dirPath);
      this.library.setSongs(songs);
      this.selectedIndices[VIEW_MODES.LIBRARY] = 0;
      this.searchQuery = '';
      if (songs.length === 0) {
        this.showNotification(`No audio files found in: ${dirPath}`);
      } else {
        this.showNotification(`Loaded ${songs.length} song(s) from ${dirPath}`);
      }
    } catch (err) {
      this.showNotification(`Error opening directory: ${err.message}`);
    }
    this.render();
  }

  playSelected() {
    const items = this._getCurrentViewItems();
    const currentViewKey = this._getCurrentViewKey();
    const idx = this.selectedIndices[currentViewKey] || 0;

    if (this.isPickingPlaylist) {
      const selectedOption = items[idx];
      if (selectedOption === '+ Create New Playlist...') {
        this.isPickingPlaylist = false;
        this.promptAction = 'CREATE_PLAYLIST_AND_ADD';
        this.keyboard.enterInputMode();
        this.showNotification('Enter name for new playlist:');
      } else if (selectedOption && this.songToAddToPlaylist) {
        const added = this.playlistManager.addSongToPlaylist(selectedOption, this.songToAddToPlaylist);
        if (added) {
          this.showNotification(`Added "${this.songToAddToPlaylist.title}" to playlist "${selectedOption}".`);
        } else {
          this.showNotification(`Song already in playlist "${selectedOption}".`);
        }
        this.isPickingPlaylist = false;
        this.songToAddToPlaylist = null;
      }
      return;
    }

    if (this.activeView === VIEW_MODES.PLAYLISTS && !this.activePlaylistName) {
      // User pressed enter on a playlist name in the playlist list view
      const playlistName = items[idx];
      if (playlistName) {
        this.activePlaylistName = playlistName;
        this.selectedIndices.PLAYLIST_SONGS = 0;
        this.showNotification(`Opened playlist "${playlistName}".`);
      }
      return;
    }

    const song = this._getSelectedSong();
    if (!song) {
      this.showNotification('No song selected to play.');
      return;
    }

    // Set queue to current view's song list
    this.playbackQueue = items.filter((item) => typeof item !== 'string');

    if (this.shuffleEnabled && this.playbackQueue.length > 0) {
      const indices = Array.from({ length: this.playbackQueue.length }, (_, i) => i);
      this.shuffledOrder = shuffleArray(indices);
      this.queueIndex = this.shuffledOrder[0];
      const randomSong = this.playbackQueue[this.queueIndex];
      if (randomSong) {
        this._updateUISelectionToSong(randomSong);
        this.player.play(randomSong);
        this.history.add(randomSong);
        this.showNotification(`Playing (Shuffle): ${randomSong.title}`);
        return;
      }
    }

    this.queueIndex = this.playbackQueue.findIndex((s) => s.id === song.id);
    this.player.play(song);
    this.history.add(song);
    this.showNotification(`Playing: ${song.title}`);
  }

  _ensurePlaybackQueue() {
    const items = this._getCurrentViewItems().filter((item) => typeof item !== 'string');
    if (items.length === 0) return false;

    if (this.playbackQueue.length === 0 || this.playbackQueue.length !== items.length) {
      this.playbackQueue = items;
      if (this.shuffleEnabled) {
        const indices = Array.from({ length: items.length }, (_, i) => i);
        this.shuffledOrder = shuffleArray(indices);
        this.queueIndex = this.shuffledOrder[0];
      } else {
        const currentViewKey = this._getCurrentViewKey();
        const currentSelected = this.selectedIndices[currentViewKey] || 0;
        this.queueIndex = Math.max(0, Math.min(items.length - 1, currentSelected));
      }
    }
    return true;
  }

  _updateUISelectionToSong(song) {
    if (!song) return;
    const currentItems = this._getCurrentViewItems();
    const idx = currentItems.findIndex((s) => s && typeof s === 'object' && s.id === song.id);
    if (idx !== -1) {
      const currentViewKey = this._getCurrentViewKey();
      this.selectedIndices[currentViewKey] = idx;
    }
  }

  nextTrack() {
    if (!this._ensurePlaybackQueue()) return;

    if (this.shuffleEnabled) {
      if (this.shuffledOrder.length !== this.playbackQueue.length) {
        this.shuffledOrder = getShuffledIndices(this.playbackQueue.length, this.queueIndex);
      }
      let currentShuffledPos = this.shuffledOrder.indexOf(this.queueIndex);
      if (currentShuffledPos === -1) currentShuffledPos = 0;

      let nextShuffledPos = currentShuffledPos + 1;
      if (nextShuffledPos >= this.shuffledOrder.length) {
        if (this.repeatMode === REPEAT_MODES.ALL) {
          // Regenerate a fresh randomized shuffle order for the new loop pass
          const indices = Array.from({ length: this.playbackQueue.length }, (_, i) => i);
          this.shuffledOrder = shuffleArray(indices);
          nextShuffledPos = 0;
        } else {
          this.player.stop();
          this.showNotification('Reached end of playlist queue.');
          return;
        }
      }
      this.queueIndex = this.shuffledOrder[nextShuffledPos];
    } else {
      let nextIndex = this.queueIndex + 1;
      if (nextIndex >= this.playbackQueue.length) {
        if (this.repeatMode === REPEAT_MODES.ALL) {
          nextIndex = 0;
        } else {
          this.player.stop();
          this.showNotification('Reached end of playlist queue.');
          return;
        }
      }
      this.queueIndex = nextIndex;
    }

    const song = this.playbackQueue[this.queueIndex];
    if (song) {
      this._updateUISelectionToSong(song);
      this.player.play(song);
      this.history.add(song);
      this.showNotification(`Next: ${song.title}`);
    }
  }

  previousTrack() {
    if (!this._ensurePlaybackQueue()) return;

    if (this.shuffleEnabled) {
      if (this.shuffledOrder.length !== this.playbackQueue.length) {
        this.shuffledOrder = getShuffledIndices(this.playbackQueue.length, this.queueIndex);
      }
      let currentShuffledPos = this.shuffledOrder.indexOf(this.queueIndex);
      if (currentShuffledPos === -1) currentShuffledPos = 0;

      let prevShuffledPos = currentShuffledPos - 1;
      if (prevShuffledPos < 0) {
        prevShuffledPos = this.shuffledOrder.length - 1;
      }
      this.queueIndex = this.shuffledOrder[prevShuffledPos];
    } else {
      let prevIndex = this.queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = this.playbackQueue.length - 1;
      }
      this.queueIndex = prevIndex;
    }

    const song = this.playbackQueue[this.queueIndex];
    if (song) {
      this._updateUISelectionToSong(song);
      this.player.play(song);
      this.history.add(song);
      this.showNotification(`Previous: ${song.title}`);
    }
  }

  toggleShuffle() {
    this.shuffleEnabled = !this.shuffleEnabled;
    if (this.shuffleEnabled) {
      this.playbackQueue = []; // Force queue refresh & shuffle generation
      this._ensurePlaybackQueue();
    }
    this.showNotification(`Shuffle: ${this.shuffleEnabled ? 'ON' : 'OFF'}`);
  }

  toggleRepeat() {
    if (this.repeatMode === REPEAT_MODES.OFF) {
      this.repeatMode = REPEAT_MODES.ONE;
    } else if (this.repeatMode === REPEAT_MODES.ONE) {
      this.repeatMode = REPEAT_MODES.ALL;
    } else {
      this.repeatMode = REPEAT_MODES.OFF;
    }
    this.showNotification(`Repeat: ${this.repeatMode}`);
  }

  toggleFavoriteSelected() {
    const song = this._getSelectedSong();
    if (!song) return;
    const isFav = this.playlistManager.toggleFavorite(song);
    this.showNotification(
      isFav ? `Added "${song.title}" to Favorites.` : `Removed "${song.title}" from Favorites.`
    );
  }

  addSelectedToPlaylistPrompt() {
    const song = this._getSelectedSong();
    if (!song) {
      this.showNotification('Select a song to add to playlist.');
      return;
    }
    const names = this.playlistManager.getPlaylistNames();
    if (names.length === 0) {
      this.songToAddToPlaylist = song;
      this.promptAction = 'CREATE_PLAYLIST_AND_ADD';
      this.keyboard.enterInputMode();
      this.showNotification('No playlists exist. Enter name for new playlist:');
    } else {
      this.isPickingPlaylist = true;
      this.songToAddToPlaylist = song;
      this.selectedIndices.PLAYLIST_PICKER = 0;
      this.showNotification(`Select playlist for "${song.title}" (↑/↓ Select, Enter Confirm, Esc Cancel):`);
    }
  }

  deleteSelectedItem() {
    const currentViewKey = this._getCurrentViewKey();
    const idx = this.selectedIndices[currentViewKey] || 0;

    if (this.activeView === VIEW_MODES.PLAYLISTS) {
      if (!this.activePlaylistName) {
        // Deleting playlist
        const names = this.playlistManager.getPlaylistNames();
        const playlistName = names[idx];
        if (playlistName) {
          this.playlistManager.deletePlaylist(playlistName);
          this.showNotification(`Deleted playlist "${playlistName}".`);
          this.selectedIndices[currentViewKey] = Math.max(0, idx - 1);
        }
      } else {
        // Removing song from playlist
        const songs = this.playlistManager.getPlaylistSongs(
          this.activePlaylistName,
          this.library.getAllSongs()
        );
        const song = songs[idx];
        if (song) {
          this.playlistManager.removeSongFromPlaylist(this.activePlaylistName, song.id);
          this.showNotification(`Removed "${song.title}" from playlist.`);
          this.selectedIndices[currentViewKey] = Math.max(0, idx - 1);
        }
      }
    }
  }

  cycleView() {
    this.isPickingPlaylist = false;
    this.songToAddToPlaylist = null;
    const modes = [
      VIEW_MODES.LIBRARY,
      VIEW_MODES.PLAYLISTS,
      VIEW_MODES.FAVORITES,
      VIEW_MODES.HISTORY
    ];
    const currentIdx = modes.indexOf(this.activeView);
    const nextIdx = (currentIdx + 1) % modes.length;
    this.activeView = modes[nextIdx];
    this.activePlaylistName = null;
    this.showNotification(`View: ${this.activeView}`);
  }

  setViewByNumber(num) {
    this.isPickingPlaylist = false;
    this.songToAddToPlaylist = null;
    const map = {
      1: VIEW_MODES.LIBRARY,
      2: VIEW_MODES.PLAYLISTS,
      3: VIEW_MODES.FAVORITES,
      4: VIEW_MODES.HISTORY
    };
    if (map[num]) {
      this.activeView = map[num];
      this.activePlaylistName = null;
      this.showNotification(`View: ${this.activeView}`);
    }
  }

  _moveSelection(delta) {
    const items = this._getCurrentViewItems();
    if (items.length === 0) return;

    const currentViewKey = this._getCurrentViewKey();
    const current = this.selectedIndices[currentViewKey] || 0;
    const next = Math.max(0, Math.min(items.length - 1, current + delta));
    this.selectedIndices[currentViewKey] = next;
  }

  _getCurrentViewKey() {
    if (this.isPickingPlaylist) {
      return 'PLAYLIST_PICKER';
    }
    if (this.activeView === VIEW_MODES.PLAYLISTS && this.activePlaylistName) {
      return 'PLAYLIST_SONGS';
    }
    return this.activeView;
  }

  _getCurrentViewItems() {
    if (this.isPickingPlaylist) {
      return [...this.playlistManager.getPlaylistNames(), '+ Create New Playlist...'];
    }
    const allSongs = this.library.getAllSongs();
    switch (this.activeView) {
      case VIEW_MODES.LIBRARY:
        return this.library.getFilteredSongs(this.searchQuery);

      case VIEW_MODES.PLAYLISTS:
        if (this.activePlaylistName) {
          return this.playlistManager.getPlaylistSongs(this.activePlaylistName, allSongs);
        }
        return this.playlistManager.getPlaylistNames();

      case VIEW_MODES.FAVORITES:
        return this.playlistManager.getFavoriteSongs(allSongs);

      case VIEW_MODES.HISTORY:
        return this.history.getHistory();

      default:
        return [];
    }
  }

  _getSelectedSong() {
    const items = this._getCurrentViewItems();
    const currentViewKey = this._getCurrentViewKey();
    const idx = this.selectedIndices[currentViewKey] || 0;
    const item = items[idx];
    if (item && typeof item === 'object') {
      return item;
    }
    return null;
  }
}
