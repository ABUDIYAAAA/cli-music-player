import { ANSI } from '../../utils/terminal.js';
import { formatTime } from '../../utils/formatTime.js';
import { PROGRESS_BAR_WIDTH } from '../../utils/constants.js';

export class ProgressBar {
  /**
   * Renders progress bar block.
   * @param {Object} options
   * @param {number} options.currentPosition
   * @param {number} options.duration
   * @param {number} [barWidth=PROGRESS_BAR_WIDTH]
   * @returns {string}
   */
  static render({ currentPosition = 0, duration = 0 }, barWidth = PROGRESS_BAR_WIDTH) {
    const curTimeStr = formatTime(currentPosition);
    const durTimeStr = formatTime(duration);

    let fillRatio = 0;
    if (duration > 0) {
      fillRatio = Math.max(0, Math.min(1, currentPosition / duration));
    }

    const filledLength = Math.round(fillRatio * barWidth);
    const emptyLength = Math.max(0, barWidth - filledLength);

    const filledChar = '█';
    const emptyChar = '░';

    const barStr = `${ANSI.FG_CYAN}${filledChar.repeat(filledLength)}${ANSI.RESET}${ANSI.DIM}${emptyChar.repeat(emptyLength)}${ANSI.RESET}`;

    return ` Progress: [${barStr}] ${ANSI.BOLD}${curTimeStr}${ANSI.RESET} / ${ANSI.DIM}${durTimeStr}${ANSI.RESET}`;
  }
}
