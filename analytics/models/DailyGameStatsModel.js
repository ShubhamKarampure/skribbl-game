// analytics_consumer_service/models/DailyGameStatsModel.js
import mongoose from 'mongoose';

const dailyGameStatsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true, index: true }, // Format: YYYY-MM-DD
  gamesStarted: { type: Number, default: 0 },
  gamesFinished: { type: Number, default: 0 },
  roundsPlayed: { type: Number, default: 0 },
  totalPlayersJoinedRooms: { type: Number, default: 0 }, // Total joins, not unique players
  uniquePlayersActive: { type: [String], default: [] }, // Array of unique userIds for the day
  totalScorePointsAwarded: { type: Number, default: 0 },
  totalGuessesMade: { type: Number, default: 0 },
  totalCorrectGuesses: { type: Number, default: 0 },
  chatMessagesSent: { type: Number, default: 0 }, // If you track chat
}, { timestamps: true }); // Adds createdAt and updatedAt

const DailyGameStats = mongoose.model('DailyGameStats', dailyGameStatsSchema, 'daily_game_stats');

export default DailyGameStats;