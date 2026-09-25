const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireClientAuth } = require('../middleware/auth');

router.post('/', bookingController.createBooking);
router.post('/create-razorpay-order', bookingController.createRazorpayOrder);
router.post('/verify-razorpay-payment', bookingController.verifyRazorpayPayment);
router.post('/razorpay-webhook', bookingController.handleRazorpayWebhook);
router.get('/booked-slots', bookingController.getBookedSlots);
router.get('/client/:phone', bookingController.getClientBookings);
router.get('/:id', requireClientAuth, bookingController.getBookingById);
router.patch('/:id/cancel', bookingController.cancelBooking);
router.get('/:id/call-token', requireClientAuth, bookingController.getCallToken);
router.post('/:id/call/end', requireClientAuth, bookingController.endCall);
router.get('/:id/chat-channel', requireClientAuth, bookingController.getChatChannel);
router.patch('/:id/reschedule', requireClientAuth, bookingController.rescheduleBookingAsClient);

module.exports = router;
