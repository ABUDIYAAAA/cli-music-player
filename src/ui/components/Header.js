import { ANSI } from "../../utils/terminal.js";
import { VIEW_MODES } from "../../utils/constants.js";

export class Header {
  /**
   * Renders header block.
   * @param {Object} options
   * @param {string} options.activeView
   * @param {number} options.totalSongs
   * @param {string} [options.subTitle='']
   * @param {number} [width=80]
   * @returns {string[]} Lines of rendered text
   */
  static render({ activeView, totalSongs, subTitle = "" }, width = 80) {
    const lines = [];
    const title = "CLI MUSIC PLAYER ";
    const borderChar = "=";

    const topBorder = borderChar.repeat(width);

    // View Tabs
    const tabs = [
      { mode: VIEW_MODES.LIBRARY, label: "[1] Library" },
      { mode: VIEW_MODES.PLAYLISTS, label: "[2] Playlists" },
      { mode: VIEW_MODES.FAVORITES, label: "[3] Favorites" },
      { mode: VIEW_MODES.HISTORY, label: "[4] History" },
    ];

    const tabString = tabs
      .map((tab) => {
        if (tab.mode === activeView) {
          return `${ANSI.BOLD}${ANSI.FG_CYAN}${ANSI.INVERSE} ${tab.label} ${ANSI.RESET}`;
        }
        return `${ANSI.DIM} ${tab.label} ${ANSI.RESET}`;
      })
      .join("  ");

    const subInfo = subTitle ? ` (${subTitle})` : "";
    const infoLine = `${ANSI.BOLD}${ANSI.FG_WHITE}Count: ${totalSongs} songs${subInfo}${ANSI.RESET}`;

    lines.push(`${ANSI.FG_CYAN}${topBorder}${ANSI.RESET}`);
    lines.push(` ${ANSI.BOLD}${ANSI.FG_MAGENTA}${title}${ANSI.RESET}`);
    lines.push(` Tabs: ${tabString}`);
    lines.push(` ${infoLine}`);
    lines.push(`${ANSI.FG_CYAN}${"-".repeat(width)}${ANSI.RESET}`);

    return lines;
  }
}
