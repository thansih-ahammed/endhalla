const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireClientAuth } = require('../middleware/auth');

router.get('/token', requireClientAuth, chatController.getChatToken);
router.post('/notify', requireClientAuth, chatController.notifyCounsellor);

module.exports = router;
