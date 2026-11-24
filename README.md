# CLI Music Player

A production-quality, lightweight, terminal-based music player built in Node.js for macOS.

It scans a specified directory for audio files, displays an interactive keyboard-driven UI, and manages native background audio playback via `afplay`.

---

## Features

- **Audio File Scanning**: Recursively scans directories for supported audio formats (`.mp3`, `.m4a`, `.wav`, `.aac`, `.aiff`, `.flac`).
- **Interactive Terminal UI**: Tabbed interface featuring Library, Playlists, Favorites, and Recently Played History views with zero flicker.
- **Full Playback Controls**: Play, Pause, Resume, Stop, Next Track, Previous Track.
- **Volume Control**: Real-time volume control (5% intervals).
- **Progress Display**: Visual playback progress bar with track timestamp formatting (`MM:SS` / `HH:MM:SS`).
- **Shuffle & Repeat Modes**: True Fisher-Yates array shuffling without track repetition, plus repeat modes (`OFF`, `ONE`, `ALL`).
- **Search & Filtering**: Live case-insensitive search by song title, artist, album, or filename.
- **Playlists & Favorites**: Create/delete custom playlists, add/remove tracks, and mark tracks as favorites with JSON persistence.
- **Playback History**: Tracks recently played songs with duplicate suppression and size limiting.
- **Clean Architecture**: Strong separation of concerns, 0 third-party production dependencies, modular design, and robust error handling.

---

## Requirements

- **Operating System**: macOS (requires `afplay` and `afinfo`, built into macOS).
- **Runtime**: Node.js v18.0.0 or higher.

---

## Installation

Clone the repository and verify Node.js installation:

```bash
git clone https://github.com/ABUDIYAAAA/cli-music-player.git
cd cli-music-player
```

No external npm packages are required for runtime or testing!

---

## Usage

Run the music player by specifying a directory containing audio files:

```bash
# Play music from your macOS Music folder
npm start -- ~/Music

# Or run directly with node
node src/index.js ./music
```

If no directory is specified, the application defaults to checking `./music` in the project root, or `~/Music` if `./music` does not exist.

### Help & Version

```bash
node src/index.js --help
node src/index.js --version
```

---

## Keyboard Controls

| Key | Action |
| :--- | :--- |
| **`↑` / `↓`** (or `k` / `j`) | Navigate up/down in song or playlist list |
| **`Enter`** | Play selected song / open selected playlist |
| **`Space`** | Pause / Resume playback |
| **`x`** | Stop playback |
| **`N` / `n`** | Next song |
| **`P` / `p`** | Previous song |
| **`+` / `-`** | Volume up / volume down (5% increments) |
| **`S` / `s`** | Toggle Shuffle (ON / OFF) |
| **`R` / `r`** | Cycle Repeat mode (OFF / ONE / ALL) |
| **`/`** | Filter / Search songs (press `Enter` to submit, `Esc` to clear) |
| **`O` / `o`** | Open / Change music directory |
| **`F` / `f`** | Toggle Favorite status for selected song |
| **`A` / `a`** | Add selected song to playlist |
| **`C` / `c`** | Create a new playlist |
| **`D` / `d`** | Delete selected playlist or remove song from playlist |
| **`Tab`** / **`1-4`** | Switch view tabs (Library, Playlists, Favorites, History) |
| **`Q` / `q`** | Quit application cleanly |

---

## Project Structure

```
cli-music-player/
├── src/
│   ├── index.js                     # Main CLI entrypoint & argument parsing
│   ├── app/
│   │   └── MusicPlayerApp.js        # Application orchestrator & state coordinator
│   ├── player/
│   │   ├── AudioPlayer.js           # afplay child process & playback manager
│   │   └── PlaybackState.js         # Playback state enum (STOPPED, PLAYING, PAUSED)
│   ├── library/
│   │   ├── Song.js                  # Song entity model
│   │   ├── FileScanner.js           # Directory scanner & afinfo metadata reader
│   │   └── MusicLibrary.js          # In-memory song collection & search manager
│   ├── playlist/
│   │   ├── PlaylistManager.js       # Playlist & favorites logic
│   │   └── PlaylistRepository.js    # Local JSON storage service
│   ├── history/
│   │   └── PlaybackHistory.js       # Recently played tracks queue
│   ├── ui/
│   │   ├── TerminalUI.js            # Terminal render controller & buffer manager
│   │   └── components/
│   │       ├── Header.js            # Header & tab bar component
│   │       ├── SongList.js          # Scrollable song list component
│   │       ├── ProgressBar.js       # Visual progress bar component
│   │       ├── StatusBar.js         # Playback & volume status bar component
│   │       └── HelpBar.js           # Keyboard shortcut legend component
│   ├── input/
│   │   └── KeyboardController.js    # Raw keypress listener & action translator
│   └── utils/
│       ├── constants.js             # Central configuration constants
│       ├── formatTime.js            # Time formatting helper (MM:SS / HH:MM:SS)
│       ├── shuffle.js               # Fisher-Yates array shuffle utilities
│       └── terminal.js              # ANSI escape sequence wrappers & cleanup handlers
├── test/                            # Unit tests for domain logic
├── music/                           # Sample audio files directory
├── package.json
└── README.md
```

---

## Architecture Overview

The application follows a clean 5-layer decoupled architecture:

1. **Input Layer (`KeyboardController`)**: Listens to raw terminal key events and converts them into semantic actions without containing any business logic.
2. **Orchestrator Layer (`MusicPlayerApp`)**: Coordinates playback, library search, views, and keyboard actions while owning high-level application state.
3. **Domain Layer (`MusicLibrary`, `PlaylistManager`, `PlaybackHistory`, `Song`)**: Handles song metadata, collections, search queries, playlists, and history queues.
4. **Playback & OS Layer (`AudioPlayer`, `FileScanner`)**: Manages the underlying `afplay` process and parses duration metadata via `afinfo`.
5. **Presentation Layer (`TerminalUI`, `components/*`)**: Pure view layer rendering state into ANSI terminal strings with buffer diffing to eliminate screen flicker.

---

## Testing

Unit tests are written using Node.js's native test runner (`node:test` and `node:assert`).

To run the full test suite:

```bash
npm test
```

### Test Coverage Highlights

- **`formatTime`**: Tests formatting for standard, hour+, fractional, and edge-case invalid inputs.
- **`shuffle`**: Verifies Fisher-Yates randomness, non-mutating shuffle, and index locking.
- **`Song`**: Tests model creation, fallbacks, artist formatting, and required field validation.
- **`FileScanner`**: Tests directory traversal, sorting, and error boundaries for missing paths.
- **`MusicLibrary`**: Tests collection management and case-insensitive multi-field search.
- **`AudioPlayer`**: Tests state transitions and volume clamping.
- **`PlaylistManager`**: Tests playlist CRUD operations, song binding, and favorites toggle.
- **`PlaybackHistory`**: Tests history queuing, unshifting, max size limits, and consecutive duplicate prevention.
- **`KeyboardController`**: Tests keypress-to-semantic-action translation and search input buffering.

---

## Known Limitations

- **macOS Exclusive**: Playback depends on macOS's built-in `afplay` CLI utility.
- **Dynamic Volume Adjustment**: `afplay` volume is specified upon track spawn; setting volume takes effect on subsequent tracks or track restarts.

---

## License

[MIT](LICENSE)
