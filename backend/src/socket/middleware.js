import logger from '../utils/logger.js';
import User from '../models/user.js';
import config from '../config/index.js';

export const socketAuthMiddleware = async (socket, next) => {
  const tokenUserId = socket.handshake.auth.userId; // Assuming client sends this upon connection
  // const tokenRoomId = socket.handshake.auth.roomId; // Optional, if client wants to auto-join a known room

  if (!tokenUserId) {
    logger.warn(`Socket connection rejected (ID: ${socket.id}): No userId provided in auth handshake.`);
    return next(new Error('Authentication error: userId is required.'));
  }

  try {
    const user = await User.findOne({ userId: tokenUserId }).select('userId username currentRoomId avatar');
    if (!user) {
      logger.warn(`Socket connection rejected (ID: ${socket.id}): User not found for userId ${tokenUserId}.`);
      return next(new Error('Authentication error: User not found.'));
    }

    socket.userId = user.userId;
    socket.username = user.username;
    socket.avatar = user.avatar;
    socket.roomId = user.currentRoomId;

    logger.info(`Socket authenticated: User ${user.username} (ID: ${user.userId}), SocketID: ${socket.id}. DB Room: ${user.currentRoomId || 'None'}`);
    next();
  } catch (error) {
    logger.error('Error in socket authentication middleware:', error);
    next(new Error('Authentication error: Server error.'));
  }
};