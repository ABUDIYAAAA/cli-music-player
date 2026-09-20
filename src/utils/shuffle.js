/**
 * Returns a new array with elements shuffled randomly using Fisher-Yates algorithm.
 * Does not mutate original array.
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates shuffled array of indices for a given array length.
 * Optionally keeps targetIndex at position 0.
 * @param {number} length
 * @param {number} [targetIndex=-1]
 * @returns {number[]}
 */
export function getShuffledIndices(length, targetIndex = -1) {
  if (length <= 0) return [];
  const indices = Array.from({ length }, (_, i) => i);
  const shuffled = shuffleArray(indices);

  if (targetIndex >= 0 && targetIndex < length) {
    const existingPos = shuffled.indexOf(targetIndex);
    if (existingPos > 0) {
      shuffled.splice(existingPos, 1);
      shuffled.unshift(targetIndex);
    }
  }

  return shuffled;
}
