// analytics_consumer_service/routes/api.js
import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js'; // Import all exported functions

const router = express.Router();

// Route to get daily stats for a specific date
// e.g., GET /api/analytics/stats/daily/2025-05-14
router.get('/stats/daily/:date', analyticsController.getDailyStatsByDate);

// Route to get daily stats for a date range
// e.g., GET /api/analytics/stats/range?startDate=2025-05-01&endDate=2025-05-07
router.get('/stats/range', analyticsController.getStatsForDateRange);

// Route to get recent raw events
// e.g., GET /api/analytics/raw-events?limit=10&page=1&eventName=game_started
router.get('/raw-events', analyticsController.getRecentRawEvents);

export default router;