import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import config from '../config/index.js';

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

// Default word service connection settings (can be configured in config/index.js)
const WORD_SERVICE_HOST = config.wordService?.host || 'localhost';
const WORD_SERVICE_PORT = config.wordService?.port || 50051;

// Create a client once and reuse it
let client = null;

/**
 * Gets or creates the word service client
 */
function getClient() {
  if (!client) {
    const address = `${WORD_SERVICE_HOST}:${WORD_SERVICE_PORT}`;
    client = new wordService.WordService(
      address,
      grpc.credentials.createInsecure(),
      {
        'grpc.keepalive_time_ms': 120000, // Send keepalive ping every 120 seconds
        'grpc.keepalive_timeout_ms': 20000, // 20 seconds timeout for keepalive ping
        'grpc.keepalive_permit_without_calls': 1, // Allow keepalive pings when no calls
        'grpc.http2.min_time_between_pings_ms': 120000, // Minimum time between pings
        'grpc.http2.max_pings_without_data': 0, // Allow pings even without data
      }
    );
    logger.info(`Created word service client connecting to ${address}`);
  }
  return client;
}

/**
 * Gets word choices for the drawing game
 * @param {number} count - Number of word choices to return
 * @returns {Promise<string[]>} - Array of word choices
 */
export const getWordChoices = async (count = 3) => {
  return new Promise((resolve, reject) => {
    try {
      const client = getClient();
      client.getWordChoices({ count }, (err, response) => {
        if (err) {
          logger.error(`Failed to get word choices: ${err.message}`);
          // Fallback to defaults in case of connection issues
          resolve(["fallback", "words", "error"]);
          return;
        }
        resolve(response.words);
      });
    } catch (error) {
      logger.error(`Error in getWordChoices: ${error.message}`);
      // Fallback to defaults in case of connection issues
      resolve(["fallback", "words", "error"]);
    }
  });
};

/**
 * Generates a hint for the given word
 * @param {string} word - The word to generate a hint for
 * @param {number} revealCount - Number of letters to reveal
 * @returns {Promise<string>} - The generated hint
 */
export const generateHint = async (word, revealCount = 1) => {
  if (!word) return "";
  
  return new Promise((resolve, reject) => {
    try {
      const client = getClient();
      client.generateHint({ word, reveal_count: revealCount }, (err, response) => {
        if (err) {
          logger.error(`Failed to generate hint: ${err.message}`);
          // Fallback to local implementation
          const fallbackHint = word.replace(/[a-zA-Z]/g, '_').split('').join(' ');
          resolve(fallbackHint);
          return;
        }
        resolve(response.hint);
      });
    } catch (error) {
      logger.error(`Error in generateHint: ${error.message}`);
      // Fallback to local implementation
      const fallbackHint = word.replace(/[a-zA-Z]/g, '_').split('').join(' ');
      resolve(fallbackHint);
    }
  });
};

/**
 * Adds new words to the pool
 * @param {string[]} newWordsArray - Words to add to the pool
 * @returns {Promise<number>} - The updated size of the word pool
 */
export const addWordsToPool = async (newWordsArray) => {
  if (!Array.isArray(newWordsArray) || newWordsArray.length === 0) {
    logger.warn('Attempted to add empty or invalid word array');
    return 0;
  }
  
  return new Promise((resolve, reject) => {
    try {
      const client = getClient();
      client.addWordsToPool({ words: newWordsArray }, (err, response) => {
        if (err) {
          logger.error(`Failed to add words to pool: ${err.message}`);
          resolve(0);
          return;
        }
        resolve(response.pool_size);
      });
    } catch (error) {
      logger.error(`Error in addWordsToPool: ${error.message}`);
      resolve(0);
    }
  });
};

/**
 * Checks if word service is healthy and connected
 * @returns {Promise<boolean>} - True if connected, false otherwise
 */
export const checkWordServiceHealth = async () => {
  return new Promise((resolve) => {
    try {
      const client = getClient();
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 5);
      
      client.waitForReady(deadline, (err) => {
        if (err) {
          logger.error(`Word service health check failed: ${err.message}`);
          resolve(false);
          return;
        }
        resolve(true);
      });
    } catch (error) {
      logger.error(`Error checking word service health: ${error.message}`);
      resolve(false);
    }
  });
};

// Initial health check
checkWordServiceHealth()
  .then(isHealthy => {
    if (isHealthy) {
      logger.info('Word service connection established successfully');
    } else {
      logger.warn('Word service appears to be offline. Will attempt reconnection as needed.');
    }
  });