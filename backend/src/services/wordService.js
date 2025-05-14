import logger from '../utils/logger.js';

const defaultWordPool = [
  "apple", "banana", "house", "car", "tree", "river", "mountain", "computer", "book", "phone",
  "cat", "dog", "bird", "fish", "sun", "moon", "star", "flower", "bridge", "train", "beach",
  "guitar", "piano", "drum", "chair", "table", "lamp", "door", "window", "cloud", "rain", "pizza",
  "hat", "shoe", "shirt", "pants", "key", "lock", "boat", "ship", "road", "smile", "clock", "bread"
];
let currentWordPool = [...new Set(defaultWordPool)]; // Ensure unique

export const getWordChoices = async (count = 3) => {
  if (currentWordPool.length === 0) {
    logger.warn('Word pool fully depleted, resetting to default words.');
    currentWordPool = [...new Set(defaultWordPool)];
  }
  if (currentWordPool.length < count && currentWordPool.length > 0) {
    count = currentWordPool.length; // Not enough unique words, provide what's available
  } else if (currentWordPool.length === 0) {
    logger.error('Critical: Word pool is empty even after attempting replenishment.');
    return ["error", "empty", "pool"]; // Fallback words
  }

  const choices = [];
  const tempPool = [...currentWordPool];
  for (let i = 0; i < count; i++) {
    if (tempPool.length === 0) break;
    const randomIndex = Math.floor(Math.random() * tempPool.length);
    choices.push(tempPool.splice(randomIndex, 1)[0]);
  }
  // Optional: To prevent immediate reuse, remove chosen words from currentWordPool
  // choices.forEach(choice => {
  //   const indexInMainPool = currentWordPool.indexOf(choice);
  //   if (indexInMainPool > -1) currentWordPool.splice(indexInMainPool, 1);
  // });
  return choices;
};

export const generateHint = (word, revealCount = 1) => {
  if (!word) return "";
  const letters = word.split('');
  const letterIndices = [];

  // Collect indices of letters (a-z, A-Z)
  letters.forEach((char, idx) => {
    if (/[a-zA-Z]/.test(char)) letterIndices.push(idx);
  });

  // Determine how many letters to reveal (at least 1, at most all)
  const toReveal = Math.min(revealCount, letterIndices.length);

  // Randomly pick indices to reveal
  const revealed = new Set();
  while (revealed.size < toReveal) {
    const randomIdx = letterIndices[Math.floor(Math.random() * letterIndices.length)];
    revealed.add(randomIdx);
  }

  // Build the hint string
  const hint = letters.map((char, idx) => {
    if (/[a-zA-Z]/.test(char) && !revealed.has(idx)) {
      return '_';
    }
    return char;
  });

  return hint.join(' ').replace(/ /g, ' ');
};

export const addWordsToPool = (newWordsArray) => {
  if (!Array.isArray(newWordsArray)) {
    logger.error('Failed to add words: input is not an array.');
    return currentWordPool.length;
  }
  const uniqueNewWords = [...new Set(newWordsArray.map(w => String(w).trim().toLowerCase()).filter(w => w.length > 0))];
  currentWordPool.push(...uniqueNewWords);
  currentWordPool = [...new Set(currentWordPool)]; // Ensure overall uniqueness
  logger.info(`Added ${uniqueNewWords.length} new unique words. Pool size: ${currentWordPool.length}`);
  return currentWordPool.length;
};