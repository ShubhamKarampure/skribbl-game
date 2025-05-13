import createError from 'http-errors';
import * as roomService from '../../services/roomService.js';
import * as gameService from '../../services/gameService.js';
import Room from '../../models/room.js';
import User from '../../models/user.js';
import config from '../../config/index.js';
import { generateUniqueId } from '../../utils/generateId.js';

export const createRoom = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const room = await roomService.createRoom({ creatorUserId: userId });
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    if (error.message.includes('Creator user not found')) return next(createError(400, error.message));
    next(createError(500, error.message || 'Error creating room'));
  }
};

export const listRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.listAvailableRooms();
    res.status(200).json(rooms);
  } catch (error) {
    next(createError(500, error.message || 'Error listing rooms'));
  }
};

export const getRoomDetails = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId })
      .populate({
        path: 'players',
        model: User,
        select: 'userId username avatar',
        localField: 'players',
        foreignField: 'userId'
      })
      .select('-gameHistoryRounds -wordPool');

    if (!room) return next(createError(404, 'Room not found'));
    res.status(200).json(room);
  } catch (error) {
    next(createError(500, 'Error fetching room details'));
  }
};

export const joinRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const result = await roomService.joinRoom(roomId, userId);
    res.status(200).json({ message: 'Joined room successfully', room: result.roomDetails, user: result.userDetails });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('full') || error.message.includes('not available')) {
      return next(createError(400, error.message));
    }
    next(createError(500, error.message || 'Error joining room'));
  }
};

export const leaveRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    await roomService.leaveRoom(roomId, userId);
    res.status(200).json({ message: `User ${userId} left room ${roomId}` });
  } catch (error) {
    if (error.message.includes('not found')) return next(createError(404, error.message));
    next(createError(500, error.message || 'Error leaving room'));
  }
};

export const updateRoomSettings = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { settings, userId } = req.body;
    const updatedRoom = await roomService.updateRoomSettings(roomId, userId, settings);
    res.status(200).json({ message: 'Room settings updated', room: updatedRoom });
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('Cannot change settings')) {
      return next(createError(403, error.message));
    }
    next(createError(500, error.message || 'Error updating room settings'));
  }
};

export const startGame = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    const room = await Room.findOne({ roomId });
    
    if (!room) return next(createError(404, 'Room not found.'));
    if (String(room.creatorId) !== String(userId)) return next(createError(403, 'Only the room creator can start the game.'));
    if (room.status === 'playing') return next(createError(400, 'Game already in progress.'));
    if (room.players.length < config.gameplay.minPlayersToStart) {
      return next(createError(400, `Need at least ${config.gameplay.minPlayersToStart} players to start.`));
    }

    await gameService.initializeGame(roomId);
    
    res.status(200).json({ message: 'Game started successfully' });
  } catch (error) {
    next(createError(500, `Game initialization failed for room ${req.params.roomId}: ${error.message}`));
  }
};

