import mongoose from 'mongoose';
import { generateUniqueId } from '../utils/generateId.js';

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true, index: true, default: generateUniqueId },
  username: { type: String, required: true, trim: true, minlength: 2, maxlength: 20,
    validate: { validator: (v) => /^[a-zA-Z0-9_]+$/.test(v), message: props => `${props.value} is not a valid username!` }
  },
  avatar: {
    color: { type: String, default: '#FFFFFF' },
    face: { type: String, default: 'defaultFace' },
    hat: { type: String, default: 'none' },
    accessory: { type: String, default: 'none' }
  },
  currentRoomId: { type: String, ref: 'Room', default: null, index: true },
  socketId: { type: String, default: null, index: true },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;