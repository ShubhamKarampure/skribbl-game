import logger from '../utils/logger.js';
import { registerSocketEventHandlers } from './eventHandlers.js';
import { socketAuthMiddleware } from './middleware.js';
import * as authService from '../services/authService.js';
import * as roomService from '../services/roomService.js';
import * as gameService from '../services/gameService.js'; 
import User from '../models/user.js';

let ioInstance;

export const initSocketIO = (io) => {
  ioInstance = io;
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    logger.info(`Client connected: ${socket.id}. UserID via auth: ${socket.userId}`);
    if (socket.userId) {
      await authService.updateUserSocket(socket.userId, socket.id);
      if (socket.roomId) { // roomId from auth middleware if user was in a room
          socket.join(socket.roomId);
          logger.info(`User ${socket.username} (Socket: ${socket.id}) auto-rejoined room: ${socket.roomId}`);
          // Optionally, confirm re-join to client or update lobby status
          const room = await roomService.getRoomWithPopulatedPlayers(socket.roomId);
          if (room) {
              socket.emit('rejoinedRoom', { roomDetails: room });
              socket.to(socket.roomId).emit('playerReconnected', {
                  userId: socket.userId,
                  username: socket.username,
                  socketId: socket.id
              });
          }
      }
    }

    registerSocketEventHandlers(io, socket);

    socket.on('disconnect', async (reason) => {
      logger.info(`Client disconnected: ${socket.id}. UserID: ${socket.userId}. Reason: ${reason}`);
      if (socket.userId) {
        const user = await User.findOne({userId: socket.userId}).select('currentRoomId username');
        await authService.updateUserSocket(socket.userId, null); // Mark as disconnected
        if (user && user.currentRoomId) {
          // Notify gameService first if in active game
          await gameService.handlePlayerDisconnectInGame(user.currentRoomId, socket.userId);
          // General room departure logic, handles election if creator leaves, etc.
          await roomService.leaveRoom(user.currentRoomId, socket.userId);
        }
      }
    });
    socket.on('error', (error) => logger.error(`Socket error for ${socket.id} (User: ${socket.userId}):`, error));
  });
  logger.info('Socket.IO initialized.');
};

export const getIo = () => {
  if (!ioInstance) throw new Error("Socket.IO not initialized!");
  return ioInstance;
};

export const emitToUser = async (userId, eventName, data) => {
  const user = await User.findOne({ userId }).select('socketId');
  if (user && user.socketId && ioInstance) {
    ioInstance.to(user.socketId).emit(eventName, data);
    return true;
  }
  logger.warn(`Could not emit to user ${userId} (event: ${eventName}): User not found or no active socket.`);
  return false;
};