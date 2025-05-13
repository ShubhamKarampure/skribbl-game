// analytics_consumer_service/models/RawEventModel.js
import mongoose from 'mongoose';

const rawEventSchema = new mongoose.Schema({
  eventName: { type: String, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed }, // Stores the original event payload
  eventTimestamp: { type: Date, required: true, index: true }, // Timestamp from the event itself
  receivedAt: { type: Date, default: Date.now, index: true }, // Timestamp when consumer received it
  routingKey: { type: String },
  roomId: { type: String, index: true }, 
  userId: { type: String, index: true }, 
});

// rawEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days

const RawEvent = mongoose.model('RawEvent', rawEventSchema, 'raw_events'); // Explicit collection name

export default RawEvent;