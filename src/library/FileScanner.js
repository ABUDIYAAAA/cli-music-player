import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Song } from './Song.js';
import { SUPPORTED_EXTENSIONS } from '../utils/constants.js';

const execFileAsync = promisify(execFile);

export class FileScanner {
  /**
   * Scans directory recursively for supported audio files.
   * @param {string} dirPath
   * @param {string[]} [extensions=SUPPORTED_EXTENSIONS]
   * @returns {Promise<Song[]>}
   */
  static async scanDirectory(dirPath, extensions = SUPPORTED_EXTENSIONS) {
    let stats;
    try {
      stats = await fs.stat(dirPath);
    } catch (err) {
      throw new Error(`Directory does not exist or cannot be accessed: ${dirPath}`);
    }

    if (!stats.isDirectory()) {
      throw new Error(`Specified path is not a directory: ${dirPath}`);
    }

    const audioFiles = await FileScanner._findFiles(dirPath, extensions);

    const songs = await Promise.all(
      audioFiles.map(async (filePath, i) => {
        const filename = path.basename(filePath);
        const duration = await FileScanner.extractDuration(filePath);

        return new Song({
          id: filePath,
          path: filePath,
          filename,
          duration
        });
      })
    );

    // Sort songs deterministically by title/filename
    return songs.sort((a, b) => a.title.localeCompare(b.title));
  }

  /**
   * Helper to find files recursively.
   * @param {string} dirPath
   * @param {string[]} extensions
   * @returns {Promise<string[]>}
   */
  static async _findFiles(dirPath, extensions) {
    let results = [];
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          // Ignore hidden directories (e.g. .git, .DS_Store)
          if (!entry.name.startsWith('.')) {
            const subFiles = await FileScanner._findFiles(fullPath, extensions);
            results = results.concat(subFiles);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Permission errors or unreadable dirs are handled gracefully
    }
    return results;
  }

  /**
   * Extracts duration in seconds using afinfo tool on macOS, or returns 0 on failure.
   * @param {string} filePath
   * @returns {Promise<number>}
   */
  static async extractDuration(filePath) {
    try {
      const { stdout } = await execFileAsync('afinfo', [filePath], { timeout: 1000 });
      const match = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/i);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    } catch (err) {
      // afinfo unavailable or failed to parse file
    }
    return 0;
  }
}
