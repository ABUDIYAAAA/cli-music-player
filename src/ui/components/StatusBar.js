import { ANSI } from '../../utils/terminal.js';
import { PlaybackState } from '../../player/PlaybackState.js';

export class StatusBar {
  /**
   * Renders status bar lines.
   * @param {Object} options
   * @param {string} options.playbackState
   * @param {import('../../library/Song.js').Song|null} options.currentSong
   * @param {number} options.volume
   * @param {boolean} options.shuffleEnabled
   * @param {string} options.repeatMode
   * @param {string} [options.notification='']
   * @param {string} [options.promptLabel='']
   * @param {string} [options.inputBuffer='']
   * @param {number} [width=80]
   * @returns {string[]} Lines of rendered text
   */
  static render(
    {
      playbackState,
      currentSong,
      volume,
      shuffleEnabled,
      repeatMode,
      notification = '',
      promptLabel = '',
      inputBuffer = ''
    },
    width = 80
  ) {
    const lines = [];
    const divider = `${ANSI.FG_CYAN}${'-'.repeat(width)}${ANSI.RESET}`;
    lines.push(divider);

    // Track Title Line
    let trackInfo = `${ANSI.DIM}No track playing${ANSI.RESET}`;
    if (currentSong) {
      const stateBadge =
        playbackState === PlaybackState.PLAYING
          ? `${ANSI.FG_GREEN}[PLAYING]${ANSI.RESET}`
          : playbackState === PlaybackState.PAUSED
          ? `${ANSI.FG_YELLOW}[PAUSED]${ANSI.RESET}`
          : `${ANSI.FG_RED}[STOPPED]${ANSI.RESET}`;

      trackInfo = `${stateBadge} ${ANSI.BOLD}${ANSI.FG_WHITE}${currentSong.displayName}${ANSI.RESET}`;
    }

    lines.push(` Track: ${trackInfo}`);

    // Volume & Settings Badges
    const shuffleStr = shuffleEnabled
      ? `${ANSI.FG_GREEN}ON${ANSI.RESET}`
      : `${ANSI.DIM}OFF${ANSI.RESET}`;
    const repeatStr =
      repeatMode === 'ONE'
        ? `${ANSI.FG_YELLOW}ONE${ANSI.RESET}`
        : repeatMode === 'ALL'
        ? `${ANSI.FG_GREEN}ALL${ANSI.RESET}`
        : `${ANSI.DIM}OFF${ANSI.RESET}`;

    const volStr = `${ANSI.BOLD}${volume}%${ANSI.RESET}`;

    lines.push(
      ` Vol: ${volStr} | Shuffle: ${shuffleStr} | Repeat: ${repeatStr}`
    );

    // Prompt Line (Search / Playlist Name / Directory Path) or Notification Line
    if (promptLabel) {
      lines.push(
        ` ${ANSI.BOLD}${ANSI.FG_YELLOW}${promptLabel}:${ANSI.RESET} ${inputBuffer}${ANSI.BOLD}_${ANSI.RESET}`
      );
    } else if (notification) {
      lines.push(` ${ANSI.FG_CYAN}ℹ ${notification}${ANSI.RESET}`);
    } else {
      lines.push('');
    }

    return lines;
  }
}
