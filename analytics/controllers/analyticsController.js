// analytics_consumer_service/controllers/analyticsController.js
import DailyGameStats from '../models/DailyGameStatsModel.js';
import RawEvent from '../models/RawEventModel.js';
import logger from '../logger.js'; // Use your existing logger

/**
 * Get daily statistics for a specific date.
 * Date is expected in YYYY-MM-DD format from URL parameters.
 */
export const getDailyStatsByDate = async (req, res) => {
  try {
    const { date } = req.params; // Expects YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      logger.warn(`Invalid date format requested: ${date}`);
      return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
    }

    const stats = await DailyGameStats.findOne({ date });
    if (!stats) {
      logger.info(`No daily stats found for date: ${date}`);
      return res.status(404).json({ message: `No statistics found for date: ${date}` });
    }
    logger.debug(`Successfully fetched daily stats for date: ${date}`);
    res.status(200).json(stats);
  } catch (error) {
    logger.error(`Error fetching daily stats for date ${req.params.date}: ${error.message}`, { error });
    res.status(500).json({ message: 'Error fetching daily statistics.' });
  }
};

/**
 * Get daily statistics for a date range.
 * Expects startDate and endDate (YYYY-MM-DD) as query parameters.
 */
export const getStatsForDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      logger.warn('Missing startDate or endDate for stats range request.');
      return res.status(400).json({ message: 'Both startDate and endDate query parameters are required (YYYY-MM-DD).' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        logger.warn(`Invalid date format in range request: startDate=${startDate}, endDate=${endDate}`);
        return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD for both startDate and endDate.' });
    }

    const stats = await DailyGameStats.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ date: 'asc' });

    if (!stats || stats.length === 0) {
      logger.info(`No daily stats found for range: ${startDate} to ${endDate}`);
      return res.status(404).json({ message: `No statistics found for the date range: ${startDate} to ${endDate}` });
    }
    logger.debug(`Successfully fetched daily stats for range: ${startDate} to ${endDate}`);
    res.status(200).json(stats);
  } catch (error)
 {
    logger.error(`Error fetching stats for date range ${req.query.startDate}-${req.query.endDate}: ${error.message}`, { error });
    res.status(500).json({ message: 'Error fetching statistics for date range.' });
  }
};

/**
 * Get recent raw events.
 * Optional query parameters: limit (default 20), page (default 1)
 * Optional query parameters: eventName, roomId, userId for filtering
 */
export const getRecentRawEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.eventName) filter.eventName = req.query.eventName;
    if (req.query.roomId) filter.roomId = req.query.roomId;
    if (req.query.userId) filter.userId = req.query.userId;


    const events = await RawEvent.find(filter)
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalEvents = await RawEvent.countDocuments(filter);

    if (!events || events.length === 0) {
      logger.info('No raw events found matching criteria.');
      // Return empty array rather than 404 if filter might just yield no results
      // If page is out of bounds, it will also return empty.
    }
    logger.debug(`Successfully fetched ${events.length} raw events.`);
    res.status(200).json({
        data: events,
        page,
        limit,
        totalPages: Math.ceil(totalEvents / limit),
        totalEvents
    });
  } catch (error) {
    logger.error(`Error fetching recent raw events: ${error.message}`, { error });
    res.status(500).json({ message: 'Error fetching raw events.' });
  }
};