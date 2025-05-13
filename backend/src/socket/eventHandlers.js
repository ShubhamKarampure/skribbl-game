import logger from '../utils/logger.js';
import * as roomService from '../services/roomService.js';
import * as gameService from '../services/gameService.js';
import * as scoreService from '../services/scoreService.js';
import User from '../models/user.js';
import Round from '../models/round.js';
import createError from 'http-errors';

export const registerSocketEventHandlers = (io, socket) => {
  socket.on('joinRoom', async (payload, callback) => {
    if (typeof callback !== 'function') {
        logger.warn(`joinRoom event from ${socket.id} missing callback.`);
        return;
    }
    try {
      if (!socket.userId) {
        return callback({ error: 'User not authenticated for this socket.' });
      }
      if (!payload || !payload.roomId) {
        return callback({ error: 'Room ID is required for joinRoom event.' });
      }

      const userId = socket.userId;
      const { roomId } = payload;

      await User.findOneAndUpdate({ userId }, { $set: { socketId: socket.id, currentRoomId: roomId } });

      socket.join(roomId);
      socket.roomId = roomId;
      logger.info(`User ${socket.username} (Socket: ${socket.id}) successfully subscribed to Socket.IO room: ${roomId}`);

      let roomDetailsFromDB = await roomService.getRoomWithPopulatedPlayers(roomId);
      if (!roomDetailsFromDB) {
        return callback({ error: `Room ${roomId} not found or no longer available.` });
      }

      let currentRoundDataForAck = null;
      let scoresArrayForAck = [];

      if (roomDetailsFromDB.status === 'playing') {
        currentRoundDataForAck = await Round.findOne({
          roomId: roomId,
          currentRoundNumber: roomDetailsFromDB.currentRoundNumber,
        }).lean();
      }

      scoresArrayForAck = await scoreService.getScoresForRoom(roomId);
      
      const mappedPlayers = (roomDetailsFromDB.players || []).map(p => ({
          userId: p.userId,
          username: p.username,
          avatar: p.avatar || { color: '#CCCCCC', face: 'neutral', hat: 'none', accessory: 'none' },
          score: scoresArrayForAck.find(s => s.userId === p.userId)?.score || 0,
          isCreator: String(p.userId) === String(roomDetailsFromDB.creatorId?.userId || roomDetailsFromDB.creatorId),
      }));

      const scoresRecord = scoresArrayForAck.reduce((acc, s) => {
          acc[s.username] = s.score;
          return acc;
      }, {});

      const ackPayloadStructure = {
        roomDetails: {
          roomId: roomDetailsFromDB.roomId,
          creatorId: roomDetailsFromDB.creatorId?.userId || roomDetailsFromDB.creatorId,
          players: mappedPlayers,
          maxPlayers: roomDetailsFromDB.maxPlayers,
          settings: roomDetailsFromDB.settings,
          status: roomDetailsFromDB.status,
          currentRoundNumberOverall: roomDetailsFromDB.currentRoundNumberOverall || roomDetailsFromDB.currentRoundNumber,
          playerDrawOrder: roomDetailsFromDB.playerDrawOrder || [],
        },
        currentRoundData: currentRoundDataForAck,
        scores: scoresRecord,
      };

      callback({ success: true, data: ackPayloadStructure });

      socket.to(roomId).emit('playerReconnected', {
        roomId: roomId,
        userId: socket.userId,
        username: socket.username,
        avatar: socket.avatar,
      });

    } catch (error) {
      logger.error(`Error in socket 'joinRoom' event for user ${socket.username} to room ${payload?.roomId}:`, error);
      callback({ error: error.message || 'Failed to join room channel' });
    }
  });

  socket.on('leaveCurrentRoom', async (payload, callback) => {
    if (typeof callback !== 'function') {
        logger.warn(`leaveCurrentRoom event from ${socket.id} missing callback.`);
        return;
    }
    try {
      if (!socket.userId) return callback({ error: 'User not authenticated.' });

      const roomIdToLeave = payload?.roomId || socket.roomId;
      if (!roomIdToLeave) return callback({ error: 'Room context not found for leaving.' });

      await gameService.handlePlayerDisconnectInGame(roomIdToLeave, socket.userId);
      await roomService.leaveRoom(roomIdToLeave, socket.userId);

      socket.leave(roomIdToLeave);
      if (socket.roomId === roomIdToLeave) {
        socket.roomId = null;
      }
      logger.info(`User ${socket.username} explicitly left room channel: ${roomIdToLeave} via socket event.`);
      callback({ success: true, message: `Left room ${roomIdToLeave}` });
    } catch (error) {
      logger.error(`Error in socket leaveCurrentRoom for user ${socket.username}:`, error);
      callback({ error: error.message || 'Failed to leave room' });
    }
  });

  socket.on('wordSelectedByDrawer', async (payload, callback) => {
    if (typeof callback !== 'function') return;

    try {
      if (!socket.userId || socket.roomId !== payload.roomId) {
        throw createError(403, "Not authorized for this room or action.");
      }
      await gameService.handleWordSelection(
        payload.roomId,
        socket.userId,
        payload.word,
        payload.vectorTimestamp,
        payload.clientTimestamp
      );
      callback({ success: true });
    } catch (error) {
      logger.error(`Error handling word selection by ${socket.username} for room ${payload.roomId}:`, error);
      callback({ error: error.message || "Failed to process word selection." });
    }
  });

  socket.on('drawingAction', (payload) => {
    if (!socket.userId || socket.roomId !== payload.roomId) {
      return logger.warn(`DrawingAction rejected: ${socket.username} not authorized or not in room ${payload.roomId}.`);
    }

    socket.to(payload.roomId).emit('newDrawingAction', { 
      userId: socket.userId,
      username: socket.username,
      roomId: payload.roomId,
      roundId: payload.roundId,
      action: payload.action,
      vectorTimestamp: payload.vectorTimestamp,
      clientTimestamp: payload.clientTimestamp,
    });

    gameService.saveDrawingAction(
        payload.roomId,
        payload.roundId,
        socket.userId,
        { action: payload.action, vectorTimestamp: payload.vectorTimestamp, clientTimestamp: payload.clientTimestamp }
    ).catch(err => logger.error(`Error saving drawing action for room ${payload.roomId}, round ${payload.roundId}: ${err.message}`));
  });

  socket.on('submitGuess', async (payload, callback) => {
    if (typeof callback !== 'function') return;

    try {
        if (!socket.userId || socket.roomId !== payload.roomId) {
            throw createError(403, "Not authorized for this room or action.");
        }
        const result = await gameService.processGuess(
            payload.roomId,
            payload.roundId,
            socket.userId,
            { guess: payload.message, vectorTimestamp: payload.vectorTimestamp, clientTimestamp: payload.clientTimestamp }
        );
        callback(result);
    } catch (error) {
        logger.error(`Error processing guess for ${socket.username} in room ${payload.roomId}:`, error);
        callback({ error: error.message || "Failed to process guess." });
    }
  });

  socket.on('sendChatMessage', async (payload, callback) => {
    if (typeof callback !== 'function') return;

    try {
        if (!socket.userId || socket.roomId !== payload.roomId) {
            throw createError(403, "Not authorized for this room or action.");
        }
        const chatData = await gameService.processChatMessage(
            payload.roomId,
            payload.roundId,
            socket.userId,
            { message: payload.message, vectorTimestamp: payload.vectorTimestamp, clientTimestamp: payload.clientTimestamp, messageType: payload.messageType }
        );
        callback({success: true, sentMessage: chatData});
    } catch (error) {
        logger.error(`Error processing chat message for ${socket.username} in room ${payload.roomId}:`, error);
        callback({ error: error.message || "Failed to send chat message." });
    }
  });
};