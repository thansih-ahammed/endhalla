const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireClientAuth } = require('../middleware/auth');

router.get('/', requireClientAuth, bookingController.getFreeSessions);

module.exports = router;
