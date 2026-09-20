import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_PLAYLIST_FILE } from '../utils/constants.js';

export class PlaylistRepository {
  /**
   * @param {string} [filePath]
   */
  constructor(filePath) {
    this.filePath = filePath || path.join(process.cwd(), DEFAULT_PLAYLIST_FILE);
  }

  /**
   * Loads playlist and favorites data from disk.
   * @returns {Promise<{ playlists: Object<string, string[]>, favorites: string[] }>}
   */
  async loadData() {
    try {
      const dataStr = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(dataStr);
      return {
        playlists: parsed.playlists || {},
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : []
      };
    } catch (err) {
      // File missing, inaccessible, or invalid JSON -> return empty state
      return { playlists: {}, favorites: [] };
    }
  }

  /**
   * Saves playlist and favorites data to disk.
   * @param {{ playlists: Object<string, string[]>, favorites: string[] }} data
   * @returns {Promise<boolean>}
   */
  async saveData(data) {
    try {
      const jsonContent = JSON.stringify(
        {
          playlists: data.playlists || {},
          favorites: data.favorites || []
        },
        null,
        2
      );
      await fs.writeFile(this.filePath, jsonContent, 'utf-8');
      return true;
    } catch (err) {
      return false;
    }
  }
}
