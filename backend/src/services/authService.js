import User from '../models/user.js';
import { generateUniqueId } from '../utils/generateId.js';
import logger from '../utils/logger.js';

export const registerOrIdentifyUser = async (username, avatarDetails) => {
  let user = await User.findOne({ username });
  if (user) {
    user.avatar = avatarDetails;
    await user.save();
    logger.info(`User ${username} identified and avatar updated.`);
    return user;
  }
  const newUserId = generateUniqueId();
  user = new User({ userId: newUserId, username, avatar: avatarDetails });
  await user.save();
  logger.info(`New user ${username} (ID: ${newUserId}) registered.`);
  return user;
};

export const updateAvatar = async (userId, avatarDetails) => {
  const user = await User.findOneAndUpdate(
    { userId },
    { $set: { avatar: avatarDetails } },
    { new: true, runValidators: true }
  );
  if (user) {
    logger.info(`Avatar updated for user ID: ${userId}`);
  } else {
    logger.warn(`Attempted to update avatar for non-existent user ID: ${userId}`);
  }
  return user;
};

export const findUserById = async (userId) => {
  return User.findOne({ userId });
};

export const updateUserSocket = async (userId, socketId) => {
  if (!userId) {
    logger.warn('updateUserSocket called without userId.');
    return;
  }
  try {
    // Use updateOne for efficiency if you don't need the updated document back.
    // This sets the socketId and updates lastSeen.
    const result = await User.updateOne(
      { userId },
      { $set: { socketId: socketId, lastSeen: new Date() } }
    );

    if (result.matchedCount === 0) {
      logger.warn(`updateUserSocket: User not found with ID ${userId}.`);
    } else if (result.modifiedCount === 0 && result.matchedCount === 1) {
      // This could happen if the socketId and lastSeen were already up-to-date, which is fine.
      // logger.debug(`updateUserSocket: No modification needed for user ${userId} with socket ${socketId}.`);
    } else {
      // logger.debug(`Updated socketId for user ${userId} to ${socketId}.`);
    }
  } catch (error) {
    logger.error(`Error updating socket for user ${userId}: ${error.message}`, error);
  }
};