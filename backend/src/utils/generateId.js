import { customAlphabet } from 'nanoid';
import logger from './logger.js';

// Create a custom ID generator using only alphanumeric characters
// This is safer for URLs and easier to read for users
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 8); // 8-character IDs

export const generateUniqueId = () => {
  try {
    // Generate the ID
    const id = nanoid();
    
    // Log and verify the generated ID
    logger.info(`Generated ID: ${id}`);
    
    // Validate the generated ID
    if (!id || typeof id !== 'string' || id.length === 0) {
      logger.error('Generated ID is invalid');
      // Fallback to a simple random ID
      return Math.random().toString(36).substring(2, 10);
    }
    
    return id;
  } catch (error) {
    logger.error(`Error generating ID: ${error.message}`);
    // Fallback in case of any error
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  }
};
