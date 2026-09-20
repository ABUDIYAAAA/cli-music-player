export class Song {
  /**
   * @param {Object} options
   * @param {string} options.id
   * @param {string} options.path
   * @param {string} options.filename
   * @param {string} [options.title]
   * @param {string} [options.artist]
   * @param {string} [options.album]
   * @param {number} [options.duration]
   */
  constructor({ id, path: filePath, filename, title, artist, album, duration = 0 }) {
    if (!filePath || !filename) {
      throw new Error('Song requires path and filename');
    }
    this.path = filePath;
    this.id = id || filePath;
    this.filename = filename;

    // Derive fallback title from filename without extension if not provided
    const lastDotIndex = filename.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;

    this.title = title && title.trim() ? title : nameWithoutExt;
    this.artist = artist && artist.trim() ? artist : 'Unknown Artist';
    this.album = album && album.trim() ? album : 'Unknown Album';
    this.duration = typeof duration === 'number' && !isNaN(duration) && duration >= 0 ? duration : 0;
  }

  get displayName() {
    if (this.artist && this.artist !== 'Unknown Artist') {
      return `${this.title} - ${this.artist}`;
    }
    return this.title;
  }
}
