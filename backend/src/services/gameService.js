import mongoose from 'mongoose';
import Room from '../models/room.js';
import Round from '../models/round.js';
import User from '../models/user.js';
import logger from '../utils/logger.js';
import { getIo } from '../socket/socketManager.js';
import * as wordService from './wordService.js';
import * as scoreService from './scoreService.js';
import config from '../config/index.js';
import createError from 'http-errors';

const gameTimers = new Map(); // roomId -> NodeJS.Timeout instance

export const initializeGame = async (roomId) => {
  const room = await Room.findOne({ roomId }).populate({
    path: 'players',
    model: User,
    select: 'userId username socketId',
    localField: 'players',
    foreignField: 'userId'
  });

  if (!room || room.status === 'playing') {
    throw createError(400, `Game initialization failed for room ${roomId}: Room not found or game already in progress.`);
  }

  if (room.players.length < config.gameplay.minPlayersToStart) {
    throw createError(400, `Not enough players to start (min ${config.gameplay.minPlayersToStart}).`);
  }

  room.status = 'playing';
  room.currentRoundNumber = 0;
  room.gameHistoryRounds = [];
  room.playerDrawOrder = room.players.map(p => p.userId).sort(() => Math.random() - 0.5);
  room.nextDrawerIndex = 0;
  await room.save();

  await scoreService.setupScoresForGame(roomId, room.players.map(p => ({ userId: p.userId, username: p.username })));

  logger.info(`Game initialized for room ${roomId}. Draw order: ${room.playerDrawOrder.join(', ')}`);
  const io = getIo();
  io.to(roomId).emit('gameStarted', {
    roomId,
    settings: room.settings,
    players: room.players.map(p => ({ userId: p.userId, username: p.username, avatar: p.avatar })),
    playerDrawOrder: room.playerDrawOrder
  });

  await startNextRound(roomId);
};

const selectNextDrawer = (room) => {
  if (!room.playerDrawOrder || room.playerDrawOrder.length === 0) return null;
  if (room.nextDrawerIndex >= room.playerDrawOrder.length || room.nextDrawerIndex < 0) {
    room.nextDrawerIndex = 0;
  }
  const drawerId = room.playerDrawOrder[room.nextDrawerIndex];
  room.nextDrawerIndex = (room.nextDrawerIndex + 1) % room.playerDrawOrder.length;
  return drawerId;
};

export const startNextRound = async (roomId) => {
  const room = await Room.findOne({ roomId }).populate({
    path: 'players',
    model: User,
    select: 'userId username socketId',
    localField: 'players',
    foreignField: 'userId'
  });

  if (!room || room.status !== 'playing') {
    logger.warn(`Cannot start next round for ${roomId}: Game not active.`);
    return;
  }

  if (room.currentRoundNumber >= room.settings.rounds) {
    await endGame(roomId, 'all_rounds_completed');
    return;
  }

  room.currentRoundNumber += 1;
  const drawerId = selectNextDrawer(room);
  if (!drawerId) {
    logger.error(`Could not select a drawer for room ${roomId}. Ending game.`);
    await endGame(roomId, 'drawer_selection_failed');
    return;
  }

  const drawerUser = room.players.find(p => String(p.userId) === String(drawerId));
  if (!drawerUser) {
    logger.error(`Drawer user object not found for ID ${drawerId} in room ${roomId}. Ending game.`);
    await endGame(roomId, 'drawer_user_not_found');
    return;
  }

  room.currentDrawerId = drawerId;
  room.currentWord = null;
  const wordChoices = await wordService.getWordChoices(room.settings.wordOptions);

  const round = new Round({
    roomId: room.roomId,
    currentRoundNumber: room.currentRoundNumber,
    drawerId: room.currentDrawerId,
    wordToGuess: 'TBD',
    status: 'pending_word_selection'
  });

  await round.save();
  room.gameHistoryRounds.push(round._id);
  await room.save();

  logger.info(`Round ${room.currentRoundNumber} starting in room ${roomId}. Drawer: ${drawerUser.username} (ID: ${drawerId}).`);
  const io = getIo();
  
  console.log('START NEXT ROUND DEBUG:', {
    drawerUser: {
      userId: drawerUser.userId,
      username: drawerUser.username,
      socketId: drawerUser.socketId
    },
    wordChoices: wordChoices,
    roomId: roomId
  });

  if (drawerUser.socketId) {
    // Verify exact payload being sent
    const wordChoicePayload = { wordChoices };
    console.log('WORD CHOICE PAYLOAD:', JSON.stringify(wordChoicePayload));

    try {
      setTimeout(() => {
        io.to(drawerUser.socketId).emit('yourTurnToDraw', wordChoicePayload, (ackResponse) => {
          if (ackResponse !== 'received') {
        logger.warn(`Drawer ${drawerUser.username} did not acknowledge word choices.`);
          } else {
        logger.info(`Drawer ${drawerUser.username} acknowledged word choices.`);
          }
        });
      }, 2000);
      logger.info(`Emitted yourTurnToDraw to ${drawerUser.username} (socketId: ${drawerUser.socketId})`);
    } catch (error) {
      console.error('FAILED TO EMIT yourTurnToDraw:', error);
      logger.error(`Failed to emit yourTurnToDraw: ${error}`, { 
        socketId: drawerUser.socketId, 
        userId: drawerUser.userId 
      });
    }
  } else {
    console.warn(`NO SOCKET ID for drawer ${drawerUser.username} (ID: ${drawerId})`);
    logger.warn(`No socketId for drawer ${drawerUser.username} (ID: ${drawerId})`);
  }
};

export const handleWordSelection = async (roomId, userId, selectedWord, clientVectorClock) => {
  const room = await Room.findOne({ roomId });
  if (!room || String(room.currentDrawerId) !== String(userId) || room.status !== 'playing') {
    throw createError(403, 'Not allowed to select word or game not active.');
  }
  if (!selectedWord || typeof selectedWord !== 'string' || selectedWord.trim() === '') {
      throw createError(400, 'Invalid word selected.');
  }

  room.currentWord = selectedWord.trim();
  const currentRoundEntry = await Round.findOneAndUpdate(
    { roomId: room.roomId, currentRoundNumber: room.currentRoundNumber, status: 'pending_word_selection' },
    { $set: { wordToGuess: room.currentWord, startTime: new Date(), status: 'drawing' } },
    { new: true }
  );

  if (!currentRoundEntry) {
    throw createError(500, 'Could not update round with selected word. Round may have already started or ended.');
  }
  await room.save(); // Save currentWord to room doc as well for quick access

  logger.info(`Drawer ${userId} in room ${roomId} selected word: ${room.currentWord}. Drawing phase begins.`);
  const io = getIo();
  io.to(roomId).emit('drawingPhaseStarted', {
    roomId,
    drawerId: userId,
    wordHint: wordService.generateHint(room.currentWord),
    drawTime: room.settings.drawTime,
    currentRoundId: currentRoundEntry.roundId,
  });

  if (gameTimers.has(roomId)) clearTimeout(gameTimers.get(roomId));
  gameTimers.set(roomId, setTimeout(() => {
    logger.info(`Round timer expired for room ${roomId}.`);
    endRound(roomId, currentRoundEntry.roundId, 'timer_expired');
  }, room.settings.drawTime * 1000));
};

export const saveDrawingAction = async (roomId, roundId, userId, drawingActionPayload) => {
  // Validation of drawingActionPayload should occur before this call or here.
  // drawingActionPayload = { action: {type, ...}, vectorTimestamp, clientTimestamp }
  const room = await Room.findOne({ roomId }); // Quick check for drawer and game status
  if (!room || String(room.currentDrawerId) !== String(userId) || room.status !== 'playing') {
    logger.warn(`Drawing action rejected for room ${roomId}, user ${userId}. Not drawer or game not active.`);
    return;
  }

  const updatedRound = await Round.findOneAndUpdate(
    { roundId, roomId, status: 'drawing' },
    { $push: { drawingEvents: { userId, ...drawingActionPayload } } },
    { new: false } // Don't need to return the large document
  );

  if (!updatedRound) {
    logger.warn(`Could not save drawing action: Round ${roundId} not found or not in drawing state.`);
  }
  // No need to log every drawing event unless debugging, it's too verbose.
};

export const processGuess = async (roomId, roundId, userId, guessPayload) => {
  // guessPayload = { guess: string, vectorTimestamp, clientTimestamp }
  const room = await Room.findOne({ roomId }).populate({
    path: 'players',
    model: User,
    select: 'userId username socketId',
    localField: 'players',
    foreignField: 'userId'
  }); // For username
  const user = room.players.find(p => String(p.userId) === String(userId));

  if (!room || !user || room.status !== 'playing' || !room.currentWord) {
    return { error: "Guess rejected: Game not active or word not set." };
  }
  if (String(userId) === String(room.currentDrawerId)) {
    return { error: "Drawer cannot guess." };
  }

  const currentRound = await Round.findOne({ roundId, roomId, status: 'drawing'});
  if (!currentRound) {
      return { error: "Guess rejected: Round not found or not active for guessing."};
  }
  // Check if user already guessed correctly this round
  if (currentRound.guessEvents.some(g => String(g.userId) === String(userId) && g.isCorrect)) {
      return { error: "You have already guessed correctly.", alreadyGuessed: true };
  }

  const isCorrect = guessPayload.guess.trim().toLowerCase() === room.currentWord.toLowerCase();
  let pointsAwarded = 0;
  const guessEventData = {
    userId,
    username: user.username,
    guess: guessPayload.guess,
    vectorTimestamp: guessPayload.vectorTimestamp,
    clientTimestamp: guessPayload.clientTimestamp, // Optional
    isCorrect,
  };

  if (isCorrect) {
    pointsAwarded = scoreService.calculatePointsForGuess(room, user, currentRound.startTime, room.settings.drawTime);
    guessEventData.pointsAwarded = pointsAwarded;
    await scoreService.awardPoints(userId, roomId, pointsAwarded, 'guesser');
    await scoreService.awardPoints(room.currentDrawerId, roomId, scoreService.POINTS_FOR_DRAWER_CORRECT_GUESS, 'drawer');
    logger.info(`User ${user.username} guessed correctly in room ${roomId}. Word: ${room.currentWord}`);
  }

  currentRound.guessEvents.push(guessEventData);
  await currentRound.save();

  const io = getIo();
  io.to(roomId).emit('playerGuessed', {
    roomId, roundId,
    userId, username: user.username,
    guess: guessPayload.guess, // Send the raw guess for display
    isCorrect,
    pointsAwarded: isCorrect ? pointsAwarded : 0,
    vectorTimestamp: guessPayload.vectorTimestamp, // Echo back for client ordering if needed
  });

  if (isCorrect) {
    const nonDrawerPlayers = room.players.filter(p => String(p.userId) !== String(room.currentDrawerId));
    const correctGuessersThisRound = new Set(currentRound.guessEvents.filter(g => g.isCorrect).map(g => String(g.userId)));
    if (nonDrawerPlayers.every(p => correctGuessersThisRound.has(String(p.userId)))) {
      logger.info(`All players guessed correctly in room ${roomId}, round ${currentRound.currentRoundNumber}. Ending round.`);
      await endRound(roomId, roundId, 'all_guessed');
    }
  }
  return { isCorrect, pointsAwarded: isCorrect ? pointsAwarded : 0, guess: guessPayload.guess };
};

export const processChatMessage = async (roomId, roundId, userId, chatPayload) => {
    // chatPayload = { message: string, vectorTimestamp, clientTimestamp, messageType? }
    const room = await Room.findOne({ roomId });
    const user = await User.findOne({userId}).select('username');

    if(!room || !user) return { error: "Cannot send chat: room or user not found."};
    if(room.status !== 'playing' && room.status !== 'waiting') return {error: "Chat not allowed in current room state."};

    const currentRound = roundId ? await Round.findOne({roundId, roomId}) : null;
    const chatData = {
        userId,
        username: user.username,
        message: chatPayload.message,
        vectorTimestamp: chatPayload.vectorTimestamp,
        clientTimestamp: chatPayload.clientTimestamp,
        messageType: chatPayload.messageType || 'player_chat',
    };

    if(currentRound && room.status === 'playing') {
        currentRound.chatMessages.push(chatData);
        await currentRound.save();
    } else if (room.status === 'waiting') {
        // For waiting room, maybe store chat on Room document or a separate collection
        // For simplicity, not storing pre-game chat in this example, just broadcasting
        logger.info(`[Room ${roomId}] Lobby chat from ${user.username}: ${chatPayload.message}`);
    }


    const io = getIo();
    io.to(roomId).emit('newChatMessage', {
        roomId, roundId,
        ...chatData
    });
    return chatData;
};


export const endRound = async (roomId, roundId, reason) => {
  if (gameTimers.has(roomId)) {
    clearTimeout(gameTimers.get(roomId));
    gameTimers.delete(roomId);
  }

  const room = await Room.findOne({ roomId });
  const round = await Round.findOneAndUpdate(
    { roundId, roomId, status: 'drawing' }, // Only end if it was actively drawing
    { $set: { endTime: new Date(), status: `ended_${reason}` } },
    { new: true }
  );

  if (!room || !round) {
    logger.warn(`Cannot end round for ${roomId}/${roundId}: Room or round not found, or round not in drawing state.`);
    return;
  }

  logger.info(`Round ${round.currentRoundNumber} ended in room ${roomId}. Reason: ${reason}. Word was: ${round.wordToGuess}`);
  const scores = await scoreService.getScoresForRoom(roomId);

  const io = getIo();
  io.to(roomId).emit('roundOver', {
    roomId, roundId,
    roundNumber: round.currentRoundNumber,
    word: round.wordToGuess,
    reason,
    scores,
    drawingEvents: round.drawingEvents, // For replay if desired by clients
  });

  setTimeout(async () => {
    const freshRoomState = await Room.findOne({roomId}); // Re-fetch to ensure status is current
    if (freshRoomState.status === 'playing') { // Check if game hasn't been ended by other means (e.g. player disconnect)
        if (freshRoomState.currentRoundNumber >= freshRoomState.settings.rounds) {
          await endGame(roomId, 'all_rounds_completed');
        } else {
          await startNextRound(roomId);
        }
    }
  }, 4000); // 5-second delay before next round or game end
};

export const endGame = async (roomId, reason) => {
  if (gameTimers.has(roomId)) {
      clearTimeout(gameTimers.get(roomId));
      gameTimers.delete(roomId);
  }
  const room = await Room.findOneAndUpdate(
    { roomId, status: 'playing' }, // Only end if playing
    { $set: { status: 'finished', currentDrawerId: null, currentWord: null } },
    { new: true }
  );

  if (!room) {
    logger.warn(`Cannot end game for ${roomId}: Game not found or not active.`);
    return;
  }

  logger.info(`Game ended in room ${roomId}. Reason: ${reason}`);
  const finalScores = await scoreService.getScoresForRoom(roomId); // Get final scores

  const io = getIo();
  io.to(roomId).emit('gameOver', { roomId, finalScores, reason });
  // Scores are reset when a new game starts in the same room, or can be cleared here if transient
  // await scoreService.resetScoresForRoom(roomId);
};

export const handlePlayerDisconnectInGame = async (roomId, userId) => {
    const room = await Room.findOne({ roomId });
    if (!room || room.status !== 'playing') {
      // If room not playing or not found, roomService.leaveRoom handles general departure
      return;
    }

    logger.info(`Player ${userId} disconnected from active game in room ${roomId}.`);
    const wasDrawer = String(room.currentDrawerId) === String(userId);

    // Update playerDrawOrder: remove the disconnected player
    room.playerDrawOrder = room.playerDrawOrder.filter(pid => String(pid) !== String(userId));

    if (room.players.length -1 < config.gameplay.minPlayersToStart) { // Check remaining players after this one leaves
        logger.info(`Not enough players in room ${roomId} after disconnect. Ending game.`);
        await room.save(); // save updated draw order first
        await endGame(roomId, 'not_enough_players');
    } else if (wasDrawer) {
        logger.info(`Drawer ${userId} disconnected from room ${roomId}. Ending current round.`);
        const currentRound = await Round.findOne({roomId, currentRoundNumber: room.currentRoundNumber, status: 'drawing'});
        if (currentRound) {
            await room.save(); // save updated draw order
            await endRound(roomId, currentRound.roundId, 'drawer_left');
        } else {
            // If no active round for the drawer, perhaps just proceed to next round logic
            // This case should be rare if status is 'playing' and drawer was set.
            logger.warn(`Drawer ${userId} left, but no active drawing round found. Proceeding with game state.`);
            await room.save();
            // Potentially call startNextRound if appropriate, or let endRound's timeout handle it.
        }
    } else {
        // Player was not the drawer, game continues. Just save updated draw order.
        await room.save();
        logger.info(`Player ${userId} (not drawer) left room ${roomId}. Game continues.`);
        const io = getIo();
        // Notify clients about player list change, gameService.leaveRoom handles DB player list
        io.to(roomId).emit('playerLeftMidGame', { roomId, userId, newPlayerDrawOrder: room.playerDrawOrder });
    }
};