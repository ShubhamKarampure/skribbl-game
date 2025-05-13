import mongoose from 'mongoose';
import { generateUniqueId } from '../utils/generateId.js'; // Assuming this path is correct

const PointSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true }
}, { _id: false });

const DrawingActionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['LINE_START', 'LINE_DRAW', 'LINE_END', 'FILL', 'CLEAR', 'UNDO'], 
    required: true 
  },
  points: { type: [PointSchema], default: undefined }, // For LINE_START, LINE_DRAW, LINE_END
  color: { type: String },                            // For LINE actions and FILL actions
  brushSize: { type: Number },                        // For LINE actions
  point: { type: PointSchema, default: undefined },   // For FILL (start point)
  // fillColor field removed for consistency; 'color' property will be used for fills.
}, { _id: false });

const DrawingEventSchema = new mongoose.Schema({
  userId: { type: String, ref: 'User', required: true },
  action: { type: DrawingActionSchema, required: true },
  vectorTimestamp: { type: Object, required: true }, // Or a more specific schema if you have one for vector timestamps
  clientTimestamp: { type: Date }, 
  roundId: { type: String } // Consider adding index: true if queried often
}, { _id: false });

const GuessEventSchema = new mongoose.Schema({
  userId: { type: String, ref: 'User', required: true },
  username: { type: String, required: true },
  serverTimestamp: { type: Date, default: Date.now },
  clientTimestamp: { type: Date }, 
  vectorTimestamp: { type: Object, required: true }, 
  guess: { type: String, required: true, trim: true },
  isCorrect: { type: Boolean, default: false },
  pointsAwarded: { type: Number, default: 0 }
}, { _id: false });

const ChatMessageSchema = new mongoose.Schema({
  userId: { type: String, ref: 'User', required: true },
  username: { type: String, required: true },
  serverTimestamp: { type: Date, default: Date.now },
  clientTimestamp: { type: Date },
  vectorTimestamp: { type: Object, required: true },
  message: { type: String, required: true, trim: true },
  messageType: { type: String, enum: ['system', 'player_chat'], default: 'player_chat'}
}, { _id: false });

const roundSchema = new mongoose.Schema({
  roundId: { 
    type: String, 
    unique: true, 
    required: true, 
    index: true, 
    default: () => `round_${generateUniqueId()}` 
  },
  roomId: { type: String, ref: 'Room', required: true, index: true },
  currentRoundNumber: { type: Number, required: true },
  drawerId: { type: String, ref: 'User', required: true },
  wordToGuess: { type: String, required: true }, // This is the actual word
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  drawingEvents: [DrawingEventSchema],
  guessEvents: [GuessEventSchema],
  chatMessages: [ChatMessageSchema],
  status: { 
    type: String, 
    enum: [
      'pending_word_selection', 
      'drawing', 
      'ended_timer', 
      'ended_all_guessed', 
      'ended_drawer_left'
    ], 
    default: 'pending_word_selection'
  },
  // You might also store wordHint and wordChoices here if they are determined when the round is created/word selected
  // wordHint: { type: String },
  // wordChoices: { type: [String] },
}, { timestamps: true });

const Round = mongoose.model('Round', roundSchema);

export default Round;
