import { MAX_HISTORY_SIZE } from '../utils/constants.js';
import { Song } from '../library/Song.js';

export class PlaybackHistory {
  /**
   * @param {number} [maxSize=MAX_HISTORY_SIZE]
   */
  constructor(maxSize = MAX_HISTORY_SIZE) {
    this.maxSize = maxSize;
    this._history = [];
  }

  /**
   * Records a played song into history.
   * Avoids duplicate consecutive entries.
   * @param {Song} song
   */
  add(song) {
    if (!song || !(song instanceof Song)) return;

    // Avoid consecutive duplicates
    if (this._history.length > 0 && this._history[0].id === song.id) {
      return;
    }

    this._history.unshift(song);

    if (this._history.length > this.maxSize) {
      this._history = this._history.slice(0, this.maxSize);
    }
  }

  /**
   * @returns {Song[]}
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * Clears history.
   */
  clear() {
    this._history = [];
  }

  get count() {
    return this._history.length;
  }
}
