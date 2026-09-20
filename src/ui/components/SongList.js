import { ANSI } from '../../utils/terminal.js';
import { formatTime } from '../../utils/formatTime.js';

export class SongList {
  /**
   * Renders scrollable list of songs or items.
   * @param {Object} options
   * @param {import('../../library/Song.js').Song[]|string[]} options.items
   * @param {number} options.selectedIndex
   * @param {import('../../library/Song.js').Song|null} [options.currentPlayingSong]
   * @param {boolean} [options.isFavoriteFn]
   * @param {number} [maxHeight=10]
   * @param {number} [width=80]
   * @returns {string[]} Lines of rendered text
   */
  static render(
    { items, selectedIndex, currentPlayingSong, isFavoriteFn },
    maxHeight = 10,
    width = 80
  ) {
    const lines = [];

    if (!items || items.length === 0) {
      lines.push(`${ANSI.DIM}   (No items available)${ANSI.RESET}`);
      while (lines.length < maxHeight) {
        lines.push('');
      }
      return lines;
    }

    // Calculate viewport window
    const safeIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
    let startIdx = 0;

    if (safeIndex >= maxHeight) {
      startIdx = safeIndex - maxHeight + 1;
    }
    const endIdx = Math.min(items.length, startIdx + maxHeight);

    for (let i = startIdx; i < endIdx; i++) {
      const item = items[i];
      const isSelected = i === safeIndex;

      let itemText = '';
      let isPlaying = false;
      let isFav = false;
      let durationStr = '';

      if (typeof item === 'string') {
        itemText = item;
      } else if (item && typeof item === 'object') {
        itemText = item.displayName || item.title || item.filename;
        isPlaying = currentPlayingSong && currentPlayingSong.id === item.id;
        if (typeof isFavoriteFn === 'function') {
          isFav = isFavoriteFn(item.id);
        }
        if (item.duration > 0) {
          durationStr = ` [${formatTime(item.duration)}]`;
        }
      }

      const cursor = isSelected ? `${ANSI.FG_CYAN}>${ANSI.RESET}` : ' ';
      const playingBadge = isPlaying ? `${ANSI.FG_GREEN}▶ ${ANSI.RESET}` : '  ';
      const favBadge = isFav ? `${ANSI.FG_YELLOW}★ ${ANSI.RESET}` : '  ';

      const lineIndexStr = `${(i + 1).toString().padStart(2, ' ')}.`;

      let content = `${cursor} ${playingBadge}${favBadge}${ANSI.DIM}${lineIndexStr}${ANSI.RESET} ${itemText}${ANSI.DIM}${durationStr}${ANSI.RESET}`;

      if (isSelected) {
        content = `${cursor} ${playingBadge}${favBadge}${ANSI.BOLD}${ANSI.FG_YELLOW}${lineIndexStr} ${itemText}${durationStr}${ANSI.RESET}`;
      }

      lines.push(content);
    }

    // Pad remaining height if items < maxHeight
    while (lines.length < maxHeight) {
      lines.push('');
    }

    return lines;
  }
}
