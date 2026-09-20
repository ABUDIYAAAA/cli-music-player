/**
 * Formats time in seconds into MM:SS or HH:MM:SS format.
 * @param {number} seconds
 * @returns {string} Formatted time string (e.g., "03:42")
 */
export function formatTime(seconds) {
  if (seconds === undefined || seconds === null || typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '--:--';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}
