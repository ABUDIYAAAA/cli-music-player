import { EventEmitter } from 'events';
import readline from 'readline';

export class KeyboardController extends EventEmitter {
  constructor() {
    super();
    this.isInputMode = false;
    this.inputBuffer = '';
    this._rl = null;
    this._keyHandler = this._handleKeypress.bind(this);
  }

  /**
   * Starts listening to raw stdin keypresses.
   */
  start() {
    if (!process.stdin.isTTY) {
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on('keypress', this._keyHandler);
  }

  /**
   * Stops listening to keypresses.
   */
  stop() {
    if (process.stdin.isTTY) {
      process.stdin.removeListener('keypress', this._keyHandler);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    }
  }

  /**
   * Enables text prompt mode (for search or text input).
   * @param {string} [initialText='']
   */
  enterInputMode(initialText = '') {
    this.isInputMode = true;
    this.inputBuffer = initialText;
  }

  /**
   * Exits text prompt mode.
   */
  exitInputMode() {
    this.isInputMode = false;
    this.inputBuffer = '';
  }

  /**
   * Internal keypress translator.
   * @private
   */
  _handleKeypress(str, key) {
    if (!key) return;

    // Standard exit combo Ctrl+C
    if (key.ctrl && key.name === 'c') {
      this.emit('action', { type: 'QUIT' });
      return;
    }

    // Text input mode processing (e.g., search input)
    if (this.isInputMode) {
      if (key.name === 'return') {
        const text = this.inputBuffer;
        this.exitInputMode();
        this.emit('action', { type: 'INPUT_SUBMIT', payload: text });
      } else if (key.name === 'escape') {
        this.exitInputMode();
        this.emit('action', { type: 'INPUT_CANCEL' });
      } else if (key.name === 'backspace') {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.emit('action', { type: 'INPUT_CHANGE', payload: this.inputBuffer });
      } else if (str && str.length === 1 && str.charCodeAt(0) >= 32) {
        this.inputBuffer += str;
        this.emit('action', { type: 'INPUT_CHANGE', payload: this.inputBuffer });
      }
      return;
    }

    // Semantic key mapping
    switch (key.name) {
      case 'up':
      case 'k':
        this.emit('action', { type: 'SELECT_PREVIOUS' });
        break;
      case 'down':
      case 'j':
        this.emit('action', { type: 'SELECT_NEXT' });
        break;
      case 'return':
        this.emit('action', { type: 'PLAY_SELECTED' });
        break;
      case 'space':
        this.emit('action', { type: 'TOGGLE_PLAYBACK' });
        break;
      case 'left':
        this.emit('action', { type: 'SEEK_BACKWARD' });
        break;
      case 'right':
        this.emit('action', { type: 'SEEK_FORWARD' });
        break;
      case 'tab':
        this.emit('action', { type: 'CYCLE_VIEW' });
        break;
      case 'escape':
        this.emit('action', { type: 'CLEAR_SEARCH' });
        break;
      default:
        // Character key mappings
        if (str) {
          const char = str.toLowerCase();
          if (char === 'n') {
            this.emit('action', { type: 'NEXT_TRACK' });
          } else if (char === 'p') {
            this.emit('action', { type: 'PREVIOUS_TRACK' });
          } else if (char === 's') {
            this.emit('action', { type: 'TOGGLE_SHUFFLE' });
          } else if (char === 'r') {
            this.emit('action', { type: 'TOGGLE_REPEAT' });
          } else if (char === '+' || str === '=') {
            this.emit('action', { type: 'VOLUME_UP' });
          } else if (char === '-' || str === '_') {
            this.emit('action', { type: 'VOLUME_DOWN' });
          } else if (char === '/') {
            this.emit('action', { type: 'START_SEARCH' });
          } else if (char === 'f') {
            this.emit('action', { type: 'TOGGLE_FAVORITE' });
          } else if (char === 'a') {
            this.emit('action', { type: 'ADD_TO_PLAYLIST' });
          } else if (char === 'c') {
            this.emit('action', { type: 'CREATE_PLAYLIST' });
          } else if (char === 'd') {
            this.emit('action', { type: 'DELETE_ITEM' });
          } else if (char === 'o') {
            this.emit('action', { type: 'OPEN_DIRECTORY' });
          } else if (char === 'x') {
            this.emit('action', { type: 'STOP_PLAYBACK' });
          } else if (char === 'q') {
            this.emit('action', { type: 'QUIT' });
          } else if (['1', '2', '3', '4'].includes(char)) {
            this.emit('action', { type: 'SET_VIEW', payload: parseInt(char, 10) });
          }
        }
        break;
    }
  }
}
