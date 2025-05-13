import logger from '../utils/logger.js';
import Room from '../models/room.js';
import User from '../models/user.js';

const roomScores = new Map(); // roomId -> Map<userId, { score: number, username: string }>

export const POINTS_FOR_GUESSER_BASE = 100;
export const POINTS_FOR_DRAWER_CORRECT_GUESS = 50;
export const MAX_TIME_BONUS = 50; // Max additional points for speed

// Helper function to get user by userId (string field)
const getUserByUserId = async (userId) => {
  try {
    return await User.findOne({ userId }).select('username userId');
  } catch (err) {
    logger.error(`Error fetching user with userId ${userId}: ${err.message}`);
    return null;
  }
};

export const setupScoresForGame = async (roomId, players) => {
  const scores = new Map();
  players.forEach(player => {
    scores.set(player.userId, { score: 0, username: player.username });
  });
  roomScores.set(roomId, scores);
  logger.info(`Scores initialized for room ${roomId} with ${players.length} players.`);
};

export const awardPoints = async (userId, roomId, points, role) => {
  if (!roomScores.has(roomId)) {
    logger.warn(`Scores not initialized for room ${roomId}. Cannot award points to ${userId}.`);
    return;
  }

  const roomScoreMap = roomScores.get(roomId);

  if (!roomScoreMap.has(userId)) {
    const user = await getUserByUserId(userId);
    const username = user ? user.username : 'Unknown Player';

    roomScoreMap.set(userId, { score: 0, username });
    logger.warn(`User ${userId} not found in scores for room ${roomId}. Added with 0 points.`);
  }

  const playerData = roomScoreMap.get(userId);
  playerData.score += points;

  logger.info(
    `Awarded ${points} points to ${playerData.username} (${userId}, role: ${role}) in room ${roomId}. New score: ${playerData.score}`
  );

  return playerData.score;
};

export const calculatePointsForGuess = (room, user, roundStartTime, roundDrawTime) => {
  if (!roundStartTime) return POINTS_FOR_GUESSER_BASE;

  const timeTakenMs = Date.now() - new Date(roundStartTime).getTime();
  const timeTakenSec = Math.max(0, timeTakenMs / 1000);
  const drawTimeSec = roundDrawTime;

  const timeRatio = Math.max(0, (drawTimeSec - timeTakenSec) / drawTimeSec);
  const timeBonus = Math.round(timeRatio * MAX_TIME_BONUS);

  return POINTS_FOR_GUESSER_BASE + timeBonus;
};

export const getScoresForRoom = async (roomId) => {
  if (!roomScores.has(roomId)) {
    logger.warn(`Scores requested for room ${roomId} but not found in memory. Attempting to rebuild if room active.`);

    const room = await Room.findOne({ roomId }).populate({
      path: 'players',
      model: User,
      select: 'userId username',
      localField: 'players',
      foreignField: 'userId',
      justOne: false,
    });

    if (room && room.players && room.players.length > 0) {
      await setupScoresForGame(
        roomId,
        room.players.map(p => ({
          userId: p.userId,
          username: p.username,
        }))
      );
    } else {
      return []; // No scores and cannot populate
    }
  }

  const scoresMap = roomScores.get(roomId) || new Map();
  return Array.from(scoresMap.values()).sort((a, b) => b.score - a.score);
};

export const resetScoresForRoom = async (roomId) => {
  if (roomScores.has(roomId)) {
    roomScores.delete(roomId);
    logger.info(`Scores reset for room ${roomId}.`);
  }
  // Extend here to clear persistent scores (e.g. DB/Redis) if applicable
};
