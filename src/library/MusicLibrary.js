import { Song } from './Song.js';

export class MusicLibrary {
  /**
   * @param {Song[]} [songs=[]]
   */
  constructor(songs = []) {
    this.setSongs(songs);
  }

  /**
   * @param {Song[]} songs
   */
  setSongs(songs) {
    this._songs = Array.isArray(songs) ? songs : [];
  }

  /**
   * @returns {Song[]}
   */
  getAllSongs() {
    return [...this._songs];
  }

  /**
   * Search/filter songs by query against title, artist, album, and filename.
   * @param {string} [query='']
   * @returns {Song[]}
   */
  getFilteredSongs(query = '') {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return this.getAllSongs();
    }
    const cleanQuery = query.toLowerCase().trim();
    return this._songs.filter((song) => {
      const titleMatch = song.title.toLowerCase().includes(cleanQuery);
      const artistMatch = song.artist.toLowerCase().includes(cleanQuery);
      const albumMatch = song.album.toLowerCase().includes(cleanQuery);
      const filenameMatch = song.filename.toLowerCase().includes(cleanQuery);
      return titleMatch || artistMatch || albumMatch || filenameMatch;
    });
  }

  /**
   * @param {string} id
   * @returns {Song|null}
   */
  getSongById(id) {
    return this._songs.find((song) => song.id === id) || null;
  }

  /**
   * @param {number} index
   * @returns {Song|null}
   */
  getSongByIndex(index) {
    if (typeof index !== 'number' || index < 0 || index >= this._songs.length) {
      return null;
    }
    return this._songs[index];
  }

  get count() {
    return this._songs.length;
  }

  isEmpty() {
    return this._songs.length === 0;
  }
}
