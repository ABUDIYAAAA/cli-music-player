import { Terminal } from '../utils/terminal.js';
import { Header } from './components/Header.js';
import { SongList } from './components/SongList.js';
import { ProgressBar } from './components/ProgressBar.js';
import { StatusBar } from './components/StatusBar.js';
import { HelpBar } from './components/HelpBar.js';

export class TerminalUI {
  constructor() {
    this._lastBuffer = '';
  }

  /**
   * Clears screen and hides cursor.
   */
  start() {
    Terminal.hideCursor();
    Terminal.clearScreen();
  }

  /**
   * Restores terminal cursor and state.
   */
  stop() {
    Terminal.showCursor();
  }

  /**
   * Main render method.
   * Assembles lines from components and outputs to stdout.
   * Avoids unnecessary flicker by updating only when buffer changes.
   * @param {Object} state Application state object
   */
  render(state) {
    const { columns, rows } = Terminal.getDimensions();
    const width = Math.max(40, Math.min(100, columns));

    const lines = [];

    // Header
    lines.push(...Header.render({
      activeView: state.activeView,
      totalSongs: state.totalSongs,
      subTitle: state.subTitle
    }, width));

    // Song List Height (calculate dynamically based on terminal height)
    const listHeight = Math.max(5, Math.min(15, rows - 16));

    lines.push(...SongList.render({
      items: state.items,
      selectedIndex: state.selectedIndex,
      currentPlayingSong: state.currentPlayingSong,
      isFavoriteFn: state.isFavoriteFn
    }, listHeight, width));

    // Progress Bar
    lines.push('');
    lines.push(ProgressBar.render({
      currentPosition: state.currentPosition,
      duration: state.duration
    }, Math.max(15, width - 35)));

    // Status Bar
    lines.push(...StatusBar.render({
      playbackState: state.playbackState,
      currentSong: state.currentPlayingSong,
      volume: state.volume,
      shuffleEnabled: state.shuffleEnabled,
      repeatMode: state.repeatMode,
      notification: state.notification,
      promptLabel: state.promptLabel,
      inputBuffer: state.inputBuffer
    }, width));

    // Help Bar
    lines.push(...HelpBar.render({
      promptHelp: state.promptHelp
    }, width));

    const fullBuffer = lines.map((line) => line + '\x1b[K').join('\n');

    if (fullBuffer !== this._lastBuffer) {
      this._lastBuffer = fullBuffer;
      Terminal.moveTo(1, 1);
      process.stdout.write(fullBuffer);
    }
  }
}
