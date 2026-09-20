import fs from 'fs';
import path from 'path';
import { PlaylistRepository } from './PlaylistRepository.js';
import { Song } from '../library/Song.js';

export class PlaylistManager {
  /**
   * @param {PlaylistRepository} [repository]
   */
  constructor(repository = new PlaylistRepository()) {
    this.repository = repository;
    /** @type {Map<string, string[]>} Playlist name -> Array of song IDs */
    this.playlists = new Map();
    /** @type {Set<string>} Set of song IDs marked as favorite */
    this.favorites = new Set();
  }

  /**
   * Loads saved playlists & favorites from repository.
   */
  async init() {
    const data = await this.repository.loadData();
    this.playlists.clear();
    for (const [name, songIds] of Object.entries(data.playlists)) {
      this.playlists.set(name, Array.isArray(songIds) ? songIds : []);
    }
    this.favorites = new Set(data.favorites);
  }

  /**
   * Saves current state to repository.
   */
  async save() {
    const playlistsObj = {};
    for (const [name, songIds] of this.playlists.entries()) {
      playlistsObj[name] = songIds;
    }
    await this.repository.saveData({
      playlists: playlistsObj,
      favorites: Array.from(this.favorites)
    });
  }

  /**
   * Creates a new empty playlist.
   * @param {string} name
   * @returns {boolean} True if created, false if already exists or invalid.
   */
  createPlaylist(name) {
    if (!name || typeof name !== 'string' || !name.trim()) return false;
    const cleanName = name.trim();
    if (this.playlists.has(cleanName)) return false;
    this.playlists.set(cleanName, []);
    this.save();
    return true;
  }

  /**
   * Deletes a playlist.
   * @param {string} name
   * @returns {boolean}
   */
  deletePlaylist(name) {
    const result = this.playlists.delete(name);
    if (result) this.save();
    return result;
  }

  /**
   * Returns list of playlist names.
   * @returns {string[]}
   */
  getPlaylistNames() {
    return Array.from(this.playlists.keys());
  }

  /**
   * Adds a song to a playlist.
   * @param {string} playlistName
   * @param {Song} song
   * @returns {boolean}
   */
  addSongToPlaylist(playlistName, song) {
    if (!song || (!song.id && !song.path)) return false;
    const targetId = song.path || song.id;
    const list = this.playlists.get(playlistName);
    if (!list) return false;
    if (!list.includes(targetId)) {
      list.push(targetId);
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Removes a song from a playlist.
   * @param {string} playlistName
   * @param {string} songId
   * @returns {boolean}
   */
  removeSongFromPlaylist(playlistName, songId) {
    const list = this.playlists.get(playlistName);
    if (!list) return false;
    const idx = list.indexOf(songId);
    if (idx !== -1) {
      list.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Resolves songs for a playlist given full library songs or from disk.
   * @param {string} playlistName
   * @param {Song[]} allSongs
   * @returns {Song[]}
   */
  getPlaylistSongs(playlistName, allSongs = []) {
    const songIds = this.playlists.get(playlistName) || [];
    const songMap = new Map();
    for (const s of allSongs) {
      if (s) {
        if (s.id) songMap.set(s.id, s);
        if (s.path) songMap.set(s.path, s);
      }
    }
    const result = [];
    for (const idOrPath of songIds) {
      if (songMap.has(idOrPath)) {
        result.push(songMap.get(idOrPath));
      } else if (fs.existsSync(idOrPath)) {
        const filename = path.basename(idOrPath);
        const song = new Song({
          id: idOrPath,
          path: idOrPath,
          filename
        });
        result.push(song);
      }
    }
    return result;
  }

  /**
   * Toggles favorite status of a song.
   * @param {Song|string} songOrId
   * @returns {boolean} New favorite state
   */
  toggleFavorite(songOrId) {
    const id = typeof songOrId === 'string' ? songOrId : (songOrId?.path || songOrId?.id);
    if (!id) return false;

    let isFav;
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      isFav = false;
    } else {
      this.favorites.add(id);
      isFav = true;
    }
    this.save();
    return isFav;
  }

  /**
   * Checks if a song is favorite.
   * @param {string} songId
   * @returns {boolean}
   */
  isFavorite(songId) {
    if (!songId) return false;
    return this.favorites.has(songId);
  }

  /**
   * Resolves all favorite songs from full library or from disk.
   * @param {Song[]} allSongs
   * @returns {Song[]}
   */
  getFavoriteSongs(allSongs = []) {
    const songMap = new Map();
    for (const s of allSongs) {
      if (s) {
        if (s.id) songMap.set(s.id, s);
        if (s.path) songMap.set(s.path, s);
      }
    }

    const result = [];
    for (const idOrPath of this.favorites) {
      if (songMap.has(idOrPath)) {
        result.push(songMap.get(idOrPath));
      } else if (fs.existsSync(idOrPath)) {
        const filename = path.basename(idOrPath);
        const song = new Song({
          id: idOrPath,
          path: idOrPath,
          filename
        });
        result.push(song);
      }
    }
    return result;
  }
}
