const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireCounsellorAuth } = require('../middleware/auth');

router.get('/:id', requireCounsellorAuth, bookingController.getBookingById);
router.get('/:id/call-token', requireCounsellorAuth, bookingController.getCallToken);
router.post('/:id/call/end', requireCounsellorAuth, bookingController.endCall);
router.get('/:id/chat-channel', requireCounsellorAuth, bookingController.getChatChannel);
router.patch('/:id/reschedule', requireCounsellorAuth, bookingController.rescheduleBookingAsCounsellor);
router.post('/:id/chat-notify', requireCounsellorAuth, bookingController.notifyClientOfChat);

module.exports = router;
