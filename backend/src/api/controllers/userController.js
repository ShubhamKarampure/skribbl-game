import createError from 'http-errors';
import * as authService from '../../services/authService.js';
import User from '../../models/user.js'; // For direct fetching if needed

export const registerUser = async (req, res, next) => {
  try {
    const { username } = req.body;
    const { avatarDetails } = req.body; 
    const user = await authService.registerOrIdentifyUser(username,avatarDetails);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    if (error.message.includes('Username can only contain')) return next(createError(400, error.message));
    if (error.message.includes('already exists')) return next(createError(409, error.message)); // More specific error from service needed for this
    next(createError(500, error.message || 'Error registering user'));
  }
};


export const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).select('-__v -createdAt -updatedAt');
    if (!user) return next(createError(404, 'User not found'));
    res.status(200).json(user);
  } catch (error) {
    next(createError(500, 'Error fetching user details'));
  }
};