import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the protobuf definition
const PROTO_PATH = path.join(__dirname, './protos/word-service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const wordService = protoDescriptor.wordservice;

// Default word pool
const defaultWordPool = [
  "apple", "banana", "house", "car", "tree", "river", "mountain", "computer", "book", "phone",
  "cat", "dog", "bird", "fish", "sun", "moon", "star", "flower", "bridge", "train", "beach",
  "guitar", "piano", "drum", "chair", "table", "lamp", "door", "window", "cloud", "rain", "pizza",
  "hat", "shoe", "shirt", "pants", "key", "lock", "boat", "ship", "road", "smile", "clock", "bread"
];

let currentWordPool = [...new Set(defaultWordPool)]; // Ensure unique

/**
 * Returns a list of random word choices
 */
function getWordChoices(call, callback) {
  const count = call.request.count || 3;
  
  // Check if word pool needs replenishment
  if (currentWordPool.length === 0) {
    logger.warn('Word pool fully depleted, resetting to default words.');
    currentWordPool = [...new Set(defaultWordPool)];
  }
  
  let actualCount = count;
  if (currentWordPool.length < count && currentWordPool.length > 0) {
    actualCount = currentWordPool.length; // Not enough unique words, provide what's available
    logger.warn(`Requested ${count} words but only ${actualCount} are available in pool`);
  } else if (currentWordPool.length === 0) {
    logger.error('Critical: Word pool is empty even after attempting replenishment.');
    callback(null, { words: ["error", "empty", "pool"] }); // Fallback words
    return;
  }

  const choices = [];
  const tempPool = [...currentWordPool];
  for (let i = 0; i < actualCount; i++) {
    if (tempPool.length === 0) break;
    const randomIndex = Math.floor(Math.random() * tempPool.length);
    choices.push(tempPool.splice(randomIndex, 1)[0]);
  }
  
  // Optional: remove chosen words from current pool to prevent immediate reuse
  // choices.forEach(choice => {
  //   const indexInMainPool = currentWordPool.indexOf(choice);
  //   if (indexInMainPool > -1) currentWordPool.splice(indexInMainPool, 1);
  // });
  
  logger.info(`Provided ${choices.length} word choices. Remaining in pool: ${currentWordPool.length}`);
  callback(null, { words: choices });
}

/**
 * Generates a hint for the given word
 */
function generateHint(call, callback) {
  const word = call.request.word;
  const revealCount = call.request.reveal_count || 1;
  
  if (!word) {
    callback(null, { hint: "" });
    return;
  }
  
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

  const finalHint = hint.join(' ').replace(/ /g, ' ');
  logger.debug(`Generated hint for word "${word}": ${finalHint}`);
  callback(null, { hint: finalHint });
}

/**
 * Adds new words to the pool
 */
function addWordsToPool(call, callback) {
  const newWordsArray = call.request.words;
  
  if (!Array.isArray(newWordsArray)) {
    logger.error('Failed to add words: input is not an array.');
    callback(null, { pool_size: currentWordPool.length });
    return;
  }
  
  const uniqueNewWords = [...new Set(newWordsArray.map(w => String(w).trim().toLowerCase()).filter(w => w.length > 0))];
  currentWordPool.push(...uniqueNewWords);
  currentWordPool = [...new Set(currentWordPool)]; // Ensure overall uniqueness
  
  logger.info(`Added ${uniqueNewWords.length} new unique words. Pool size: ${currentWordPool.length}`);
  callback(null, { pool_size: currentWordPool.length });
}

/**
 * Starts the gRPC server for the word service
 */
export function startWordServiceServer(port = 50051) {
  const server = new grpc.Server();
  server.addService(wordService.WordService.service, {
    getWordChoices: getWordChoices,
    generateHint: generateHint,
    addWordsToPool: addWordsToPool
  });
  
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      logger.error(`Failed to start word service: ${error}`);
      return;
    }
    server.start();
    logger.info(`Word service running on port ${port}`);
  });
  
  return server;
}

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startWordServiceServer();
}``