const express = require('express');
const { Router } = express;
const route = Router();
const {
  getAllMessages,
  createMessage,
  renderChatPage,
} = require("../controllers/chatControllers.js");

const {authenticateToken, isPremiumOrUser} = require("../middleware/authMiddleware.js");

route.get('/allMessages', authenticateToken, isPremiumOrUser, getAllMessages);
route.post('/createMessage', authenticateToken, isPremiumOrUser, createMessage);
route.get('/', authenticateToken, isPremiumOrUser, renderChatPage);

module.exports = route;
