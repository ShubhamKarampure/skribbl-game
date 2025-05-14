import mongoose from 'mongoose';
import { generateUniqueId } from '../utils/generateId.js';
import config from '../config/index.js';

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true, index: true, default: () => `room_${generateUniqueId()}` },
  creatorId: { type: String, ref: 'User' }, 
  players: [{ type: String, ref: 'User' }], 
  maxPlayers: { type: Number, default: config.gameplay.maxPlayersPerRoom, min: 2, max: 20 },
  settings: {
    rounds: { type: Number, default: 3, min: 1, max: 10 },
    drawTime: { type: Number, default: 90, min: 30, max: 180 }, 
    wordOptions: { type: Number, default: 3, min: 2, max: 5 }
  },
  status: { type: String, enum: ["waiting", "playing", "finished"], default: "waiting", index: true },
  currentRoundNumber: { type: Number, default: 0 },
  currentDrawerId: { type: String, ref: 'User', default: null },
  currentWord: { type: String, default: null },
  wordPool: [String], 
  gameHistoryRounds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Round' }],
  playerDrawOrder: [{ type: String }],
  nextDrawerIndex: { type: Number, default: 0 }, 
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);
export default Room;