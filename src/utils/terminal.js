export const ANSI = {
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  CLEAR_SCREEN: '\x1b[2J\x1b[3J\x1b[H',
  CLEAR_LINE: '\x1b[2K',
  MOVE_HOME: '\x1b[H',
  
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERLINE: '\x1b[4m',
  INVERSE: '\x1b[7m',

  FG_BLACK: '\x1b[30m',
  FG_RED: '\x1b[31m',
  FG_GREEN: '\x1b[32m',
  FG_YELLOW: '\x1b[33m',
  FG_BLUE: '\x1b[34m',
  FG_MAGENTA: '\x1b[35m',
  FG_CYAN: '\x1b[36m',
  FG_WHITE: '\x1b[37m',
  FG_GRAY: '\x1b[90m',

  BG_BLUE: '\x1b[44m',
  BG_GRAY: '\x1b[100m'
};

export class Terminal {
  static hideCursor() {
    if (process.stdout.isTTY) {
      process.stdout.write(ANSI.HIDE_CURSOR);
    }
  }

  static showCursor() {
    if (process.stdout.isTTY) {
      process.stdout.write(ANSI.SHOW_CURSOR);
    }
  }

  static clearScreen() {
    if (process.stdout.isTTY) {
      process.stdout.write(ANSI.CLEAR_SCREEN);
    }
  }

  static moveTo(row, col) {
    if (process.stdout.isTTY) {
      process.stdout.write(`\x1b[${row};${col}H`);
    }
  }

  static getDimensions() {
    return {
      rows: process.stdout.rows || 24,
      columns: process.stdout.columns || 80
    };
  }

  static setupCleanup(cleanupFn) {
    let cleanedUp = false;

    const performCleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      Terminal.showCursor();
      process.stdout.write(ANSI.RESET + '\n');
      if (typeof cleanupFn === 'function') {
        cleanupFn();
      }
    };

    process.on('SIGINT', () => {
      performCleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      performCleanup();
      process.exit(0);
    });

    process.on('exit', () => {
      performCleanup();
    });

    return performCleanup;
  }
}
