import { ANSI } from '../../utils/terminal.js';

export class HelpBar {
  /**
   * Renders keyboard controls legend.
   * @param {Object} options
   * @param {string} [options.promptHelp='']
   * @param {number} [width=80]
   * @returns {string[]} Lines of rendered text
   */
  static render({ promptHelp = '' }, width = 80) {
    const lines = [];
    const border = `${ANSI.FG_CYAN}${'-'.repeat(width)}${ANSI.RESET}`;
    lines.push(border);

    if (promptHelp) {
      lines.push(
        ` ${ANSI.BOLD}${promptHelp}${ANSI.RESET} | ${ANSI.BOLD}[Enter]${ANSI.RESET} Submit | ${ANSI.BOLD}[Esc]${ANSI.RESET} Cancel`
      );
      lines.push(`${ANSI.FG_CYAN}${'='.repeat(width)}${ANSI.RESET}`);
      return lines;
    }

    const row1 =
      ` ${ANSI.BOLD}[↑/↓]${ANSI.RESET} Select   ` +
      `${ANSI.BOLD}[Enter]${ANSI.RESET} Play   ` +
      `${ANSI.BOLD}[Space]${ANSI.RESET} Pause/Resume   ` +
      `${ANSI.BOLD}[x]${ANSI.RESET} Stop   ` +
      `${ANSI.BOLD}[N/P]${ANSI.RESET} Next/Prev`;

    const row2 =
      ` ${ANSI.BOLD}[←/→]${ANSI.RESET} Seek     ` +
      `${ANSI.BOLD}[+/-]${ANSI.RESET} Volume ` +
      `${ANSI.BOLD}[S]${ANSI.RESET} Shuffle       ` +
      `${ANSI.BOLD}[R]${ANSI.RESET} Repeat ` +
      `${ANSI.BOLD}[/]${ANSI.RESET} Search`;

    const row3 =
      ` ${ANSI.BOLD}[Tab/1-4]${ANSI.RESET} Views   ` +
      `${ANSI.BOLD}[O]${ANSI.RESET} Open Dir ` +
      `${ANSI.BOLD}[F]${ANSI.RESET} Fav ` +
      `${ANSI.BOLD}[A]${ANSI.RESET} Add Playlist ` +
      `${ANSI.BOLD}[C]${ANSI.RESET} New Playlist ` +
      `${ANSI.BOLD}[Q]${ANSI.RESET} Quit`;

    lines.push(row1);
    lines.push(row2);
    lines.push(row3);
    lines.push(`${ANSI.FG_CYAN}${'='.repeat(width)}${ANSI.RESET}`);

    return lines;
  }
}
