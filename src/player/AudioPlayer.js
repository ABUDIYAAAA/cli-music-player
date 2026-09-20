import { EventEmitter } from 'events';
import { spawn, execFile, execSync } from 'child_process';
import { PlaybackState } from './PlaybackState.js';
import {
  DEFAULT_VOLUME,
  MIN_VOLUME,
  MAX_VOLUME,
  TICK_INTERVAL_MS
} from '../utils/constants.js';

export class AudioPlayer extends EventEmitter {
  constructor() {
    super();
    this.state = PlaybackState.STOPPED;
    this.currentSong = null;
    this.currentPosition = 0;
    this.duration = 0;
    this.volume = DEFAULT_VOLUME;

    this._afplayProcess = null;
    this._positionTimer = null;
    this._isManualStop = false;
    this._hasFfplay = this._checkFfplay();
  }

  _checkFfplay() {
    try {
      execSync('which ffplay', { stdio: 'ignore' });
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Starts playing a song.
   * @param {import('../library/Song.js').Song} song
   * @param {number} [startPos=0]
   */
  play(song, startPos = 0) {
    if (!song || !song.path) {
      this.emit('error', new Error('Invalid song provided for playback'));
      return;
    }

    this.currentSong = song;
    this.duration = song.duration || 0;
    this.currentPosition = startPos;
    this._spawnPlayerProcess(startPos);
  }

  /**
   * Internal helper to spawn player process (ffplay or afplay).
   * @private
   */
  _spawnPlayerProcess(startPos = 0) {
    this._cleanupProcess();
    this._isManualStop = false;

    let cmd = 'afplay';
    let args = [];
    const volumeRatio = (this.volume / 100).toFixed(2);

    if (this._hasFfplay) {
      cmd = 'ffplay';
      args = [
        '-nodisp',
        '-autoexit',
        '-volume',
        String(this.volume),
        '-ss',
        String(startPos.toFixed(2)),
        this.currentSong.path
      ];
    } else {
      cmd = 'afplay';
      args = ['-v', String(volumeRatio), this.currentSong.path];
    }

    try {
      this._afplayProcess = spawn(cmd, args);
    } catch (err) {
      this.state = PlaybackState.STOPPED;
      this.emit('error', new Error(`Failed to spawn ${cmd} process: ${err.message}`));
      return;
    }

    this.state = PlaybackState.PLAYING;
    this._startPositionTimer();
    this.emit('stateChange', this.state);

    this._afplayProcess.on('error', (err) => {
      this._cleanupProcess();
      this.state = PlaybackState.STOPPED;
      this.emit('error', new Error(`${cmd} playback error: ${err.message}`));
      this.emit('stateChange', this.state);
    });

    const song = this.currentSong;
    this._afplayProcess.on('exit', (code, signal) => {
      const werePlaying = this.state !== PlaybackState.STOPPED;
      const wasManual = this._isManualStop;

      this._cleanupProcess();
      this.state = PlaybackState.STOPPED;
      this.emit('stateChange', this.state);

      if (werePlaying && !wasManual) {
        this.emit('ended', song);
      }
    });
  }

  /**
   * Pauses playback using SIGSTOP.
   */
  pause() {
    if (this.state === PlaybackState.PLAYING && this._afplayProcess) {
      try {
        this._afplayProcess.kill('SIGSTOP');
        this.state = PlaybackState.PAUSED;
        this._stopPositionTimer();
        this.emit('stateChange', this.state);
      } catch (err) {
        this.emit('error', new Error(`Failed to pause playback: ${err.message}`));
      }
    }
  }

  /**
   * Resumes playback using SIGCONT.
   */
  resume() {
    if (this.state === PlaybackState.PAUSED && this._afplayProcess) {
      try {
        this._afplayProcess.kill('SIGCONT');
        this.state = PlaybackState.PLAYING;
        this._startPositionTimer();
        this.emit('stateChange', this.state);
      } catch (err) {
        this.emit('error', new Error(`Failed to resume playback: ${err.message}`));
      }
    }
  }

  /**
   * Toggles between PLAYING and PAUSED.
   */
  togglePlayPause() {
    if (this.state === PlaybackState.PLAYING) {
      this.pause();
    } else if (this.state === PlaybackState.PAUSED) {
      this.resume();
    }
  }

  /**
   * Stops playback and kills process cleanly.
   */
  stop() {
    this._isManualStop = true;
    this._cleanupProcess();
    this.currentSong = null;
    this.currentPosition = 0;
    this.duration = 0;
    this.state = PlaybackState.STOPPED;
    this.emit('stateChange', this.state);
  }

  /**
   * Seeks forward or backward within current track.
   * @param {number} secondsDelta
   */
  seek(secondsDelta) {
    if (this.state === PlaybackState.STOPPED || !this.currentSong) {
      return;
    }

    const targetPos = this.currentPosition + secondsDelta;
    this.currentPosition = Math.max(0, Math.min(this.duration > 0 ? this.duration : targetPos, targetPos));
    this.emit('timeUpdate', this.currentPosition);

    if (this._hasFfplay && this.currentSong && this.state !== PlaybackState.STOPPED) {
      this._spawnPlayerProcess(this.currentPosition);
    }
  }

  /**
   * Sets volume level (0 - 100).
   * @param {number} newVolume
   */
  setVolume(newVolume) {
    if (typeof newVolume !== 'number' || isNaN(newVolume)) return;
    this.volume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, Math.round(newVolume)));
    this.emit('volumeChange', this.volume);

    if (this.currentSong && this.state !== PlaybackState.STOPPED) {
      this._spawnPlayerProcess(this.currentPosition);
    }
  }

  /**
   * Cleans up timer and process.
   * @private
   */
  _cleanupProcess() {
    this._stopPositionTimer();

    if (this._afplayProcess) {
      const proc = this._afplayProcess;
      this._afplayProcess = null;

      try {
        proc.removeAllListeners('exit');
        proc.removeAllListeners('error');
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      } catch (err) {
        // Ignore kill errors
      }
    }
  }

  /**
   * @private
   */
  _startPositionTimer() {
    this._stopPositionTimer();
    const intervalSec = TICK_INTERVAL_MS / 1000;
    this._positionTimer = setInterval(() => {
      if (this.state === PlaybackState.PLAYING) {
        this.currentPosition += intervalSec;
        if (this.duration > 0 && this.currentPosition >= this.duration) {
          this.currentPosition = this.duration;
        }
        this.emit('timeUpdate', this.currentPosition);
      }
    }, TICK_INTERVAL_MS);
  }

  /**
   * @private
   */
  _stopPositionTimer() {
    if (this._positionTimer) {
      clearInterval(this._positionTimer);
      this._positionTimer = null;
    }
  }
}
