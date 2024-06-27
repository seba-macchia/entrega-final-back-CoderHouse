const express = require('express');
const { Router } = express;
const route = Router();
const {
  getAllMessages,
  createMessage,
  renderChatPage,
} = require("../controllers/chatControllers.js");

const {isPremiumOrUser} = require("../middleware/authMiddleware.js");

route.get('/allMessages',isPremiumOrUser, getAllMessages);
route.post('/createMessage',isPremiumOrUser, createMessage);
route.get('/',isPremiumOrUser, renderChatPage);

module.exports = route;
