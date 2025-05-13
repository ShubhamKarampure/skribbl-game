import mongoose from 'mongoose';
import Room from '../models/room.js';
import User from '../models/user.js';
import logger from '../utils/logger.js';
import { getIo } from '../socket/socketManager.js';
import config from '../config/index.js';
import createError from 'http-errors';
import { publishAnalyticsEvent } from '../queue/analyticsProducer.js';

const electNewLeader = async (roomId) => {
  try {
    const room = await Room.findOne({ roomId });
    if (!room || room.players.length === 0) {
      logger.warn(`[Room ${roomId}] Cannot elect leader: Room not found or empty.`);
      return null;
    }

    const newLeaderId = room.players[0];
    room.creatorId = newLeaderId;
    await room.save();

    logger.info(`[Room ${roomId}] New creator elected: ${newLeaderId}`);

    const io = getIo();
    if (io) {
      const newLeaderUser = await User.findOne({ userId: newLeaderId }).select('userId username');
      io.to(roomId).emit('roomCreatorChanged', {
        roomId,
        newCreatorId: newLeaderId,
        newCreatorUsername: newLeaderUser?.username || null,
      });
    }

    return newLeaderId;
  } catch (error) {
    logger.error(`[Room ${roomId}] Error in electNewLeader: ${error.message}`, error);
    return null;
  }
};

export const createRoom = async ({ creatorUserId }) => {
  const creator = await User.findOne({ userId: creatorUserId });
  if (!creator) throw createError(400, 'Creator user not found.');

  const room = new Room({
    creatorId: creatorUserId,
    players: [creatorUserId],
  });

  await room.save();

  creator.currentRoomId = room.roomId;
  await creator.save();

  logger.info(`Room created (ID: ${room.roomId}) by ${creator.username}.`);
  
  try {
    publishAnalyticsEvent('room_created', {
      roomId: room.roomId,
      creatorUserId,
      creatorUsername: creator.username,
      initialSettings: room.settings
    });
  } catch (error) {
    logger.error(`Failed to publish analytics for room creation: ${error.message}`, error);
    // Continue execution even if analytics fails
  }
  
  return room;
};

export const listAvailableRooms = async () => {
  return Room.find({ status: 'waiting' })
    .select('roomId players maxPlayers currentRoundNumber settings.rounds creatorId')
    .populate({
      path: 'players',
      model: User,
      select: 'userId username',
      localField: 'players',
      foreignField: 'userId'
    })
    .sort({ createdAt: -1 });
};

export const joinRoom = async (roomId, userId) => {
  const room = await Room.findOne({ roomId });
  const user = await User.findOne({ userId });

  if (!room) throw createError(400, 'Room not found.');
  if (!user) throw createError(400, 'User not found.');
  if (room.players.length >= room.maxPlayers) throw createError(400, 'Room is full.');

  if (room.players.includes(userId)) {
    logger.warn(`User ${user.username} is already in room ${roomId}.`);
    user.currentRoomId = roomId;
    await user.save();
  } else {
    room.players.push(userId);
    await room.save();
    user.currentRoomId = roomId;
    await user.save();
  }

  const populatedRoom = await Room.findById(room._id).populate([
    {
      path: 'players',
      model: User,
      select: 'userId username avatar',
      localField: 'players',
      foreignField: 'userId'
    }
  ]);

  const io = getIo();
  if (io) {
    const userForEmit = { userId: user.userId, username: user.username, avatar: user.avatar };
    io.to(roomId).emit('playerJoined', { roomId, user: userForEmit, players: populatedRoom.players });
  }

  try {
    publishAnalyticsEvent('player_joined', {
      roomId,
      userId,
      username: user.username
    });
  } catch (error) {
    logger.error(`Failed to publish analytics for player join: ${error.message}`, error);
    // Continue execution even if analytics fails
  }

  return { roomDetails: populatedRoom, userDetails: user };
};

export const leaveRoom = async (roomId, userId) => {
  const [room, user] = await Promise.all([
    Room.findOne({ roomId }),
    User.findOne({ userId })
  ]);

  if (!user) {
    logger.warn(`LeaveRoom: User ${userId} not found.`);
    return;
  }

  const wasPlayerInRoom = room?.players.includes(userId) ?? false;

  // Clear user's current room
  if (user.currentRoomId === roomId) {
    user.currentRoomId = null;
    await user.save();
  }

  if (!room) {
    logger.warn(`LeaveRoom: Room ${roomId} not found for user ${userId}.`);
    return;
  }

  // Remove user from room players
  room.players = room.players.filter(pid => pid !== userId);
  logger.info(`User ${user.username} left room ${roomId}. Was in room: ${wasPlayerInRoom}`);

  let triggerNewElection = false;

  // Handle creator leaving
  if (wasPlayerInRoom && room.creatorId === userId && room.status === 'waiting') {
    if (room.players.length > 0) {
      triggerNewElection = true;
    } else {
      room.creatorId = null;
      logger.info(`Creator ${user.username} left empty room ${roomId}.`);
    }
  }

  const io = getIo();

  if (room.players.length === 0) {
    await Room.deleteOne({ roomId });
    logger.info(`Room ${roomId} deleted as no players remain.`);
  } else {
    await room.save();
  }

  // Notify clients
  if (wasPlayerInRoom && io) {
    io.to(roomId).emit('playerLeft', {
      roomId,
      userId,
      username: user.username,
      newCreatorId: room.creatorId,
      playersCount: room.players.length
    });
  }

  // Elect new leader if needed
  if (triggerNewElection) {
    const newLeaderId = await electNewLeader(roomId);
    logger.info(`New leader elected for room ${roomId}: ${newLeaderId}`);
  }

  try {
    if (wasPlayerInRoom) {
      publishAnalyticsEvent('player_left', {
        roomId,
        userId,
        username: user.username
      });
    }
  } catch (error) {
    logger.error(`Failed to publish analytics for player leave: ${error.message}`, error);
    // Continue execution even if analytics fails
  }
};

export const updateRoomSettings = async (roomId, requestingUserId, newSettings) => {
  const room = await Room.findOne({ roomId });
  if (!room) throw createError(404, 'Room not found.');
  if (room.creatorId !== requestingUserId) throw createError(403, 'Only the room creator can change settings.');
  if (room.status !== 'waiting') throw createError(403, 'Settings can only be changed before the game starts.');

  Object.assign(room.settings, newSettings);
  await room.save();

  logger.info(`Room ${roomId} settings updated by ${requestingUserId}.`);

  const io = getIo();
  if (io) io.to(roomId).emit('roomSettingsUpdated', { roomId, settings: room.settings });

  try {
    publishAnalyticsEvent('room_settings_updated', {
      roomId,
      updatedBy: requestingUserId,
      newSettings
    });
  } catch (error) {
    logger.error(`Failed to publish analytics for room settings update: ${error.message}`, error);
    // Continue execution even if analytics fails
  }

  return room;
};

export const getRoomWithPopulatedPlayers = async (roomId) => {
  return Room.findOne({ roomId })
    .populate({
      path: 'players',
      model: User,
      select: 'userId username avatar',
      localField: 'players',
      foreignField: 'userId'
    });
};