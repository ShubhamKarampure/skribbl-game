import express from 'express';
import * as userController from './controllers/userController.js';
import * as roomController from './controllers/roomController.js';

const router = express.Router();

// User Routes
router.post('/users/register', userController.registerUser);
router.get('/users/:userId', userController.getUserDetails);

// Room Routes
router.post('/rooms',  roomController.createRoom); 
router.get('/rooms', roomController.listRooms);
router.get('/rooms/:roomId', roomController.getRoomDetails);
router.post('/rooms/:roomId/join',  roomController.joinRoom); 
router.post('/rooms/:roomId/leave', roomController.leaveRoom); 
router.put('/rooms/:roomId/settings',  roomController.updateRoomSettings); 
router.post('/rooms/:roomId/start',  roomController.startGame); 

export default router;