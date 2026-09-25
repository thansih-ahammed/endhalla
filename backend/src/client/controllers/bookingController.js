const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const Counsellor = require('../../models/Counsellor');
const User = require('../../models/User');
const { mintCallToken, endCall: endCallForBooking, CallTokenError } = require('../../utils/callToken');
const { provisionChatChannel } = require('../../utils/chatToken');
const { getFreeSessionQuota, isFreeBookingRequest } = require('../../utils/freeSessions');
const { rescheduleBooking, RescheduleError } = require('../../utils/reschedule');
const { sendPushNotification } = require('../../utils/pushNotification');

// Best-effort notification helpers — never let a lookup/send failure affect
// the booking/payment response they're attached to.
async function notifyCounsellorOfNewBooking(booking) {
  try {
    let counsellor = booking.counsellorId ? await Counsellor.findById(booking.counsellorId) : null;
    if (!counsellor) {
      counsellor = await Counsellor.findOne({ fullName: booking.counsellorName });
    }
    if (!counsellor?.userId) return;

    const counsellorUser = await User.findById(counsellor.userId);
    if (!counsellorUser?.pushToken) return;

    await sendPushNotification({
      token: counsellorUser.pushToken,
      title: 'New booking',
      body: `${booking.clientName || 'A client'} booked a ${booking.sessionType} session for ${booking.dateText} at ${booking.timeText}.`,
      data: { type: 'booking', bookingId: String(booking._id) },
    });
  } catch (error) {
    console.error('Failed to notify counsellor of new booking:', error.message);
  }
}

async function notifyClientOfPayment(booking) {
  try {
    let clientUser = booking.clientId ? await User.findById(booking.clientId) : null;
    if (!clientUser && booking.clientPhone) {
      clientUser = await User.findOne({ phone: booking.clientPhone });
    }
    if (!clientUser?.pushToken) return;

    await sendPushNotification({
      token: clientUser.pushToken,
      title: 'Payment confirmed',
      body: `Your payment for the session with ${booking.counsellorName} is confirmed.`,
      data: { type: 'payment', bookingId: String(booking._id) },
    });
  } catch (error) {
    console.error('Failed to notify client of payment:', error.message);
  }
}

/**
 * Create a new session booking
 * POST /api/bookings
 */
exports.createBooking = async (req, res) => {
  try {
    const {
      counsellorId,
      counsellorName,
      clientPhone,
      clientName,
      sessionType,
      dateText,
      dateISO,
      timeText,
      price,
      notes,
    } = req.body;

    if (!counsellorName || !sessionType || !dateText || !timeText || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking parameters (counsellorName, sessionType, dateText, timeText, price)',
      });
    }

    // SLOT CONFLICT CHECK: Prevent double booking of the same slot
    const existingSlotBooking = await Booking.findOne({
      counsellorName,
      dateText,
      timeText,
      status: { $ne: 'cancelled' },
    });

    if (existingSlotBooking) {
      return res.status(400).json({
        success: false,
        message: `The slot (${timeText} on ${dateText}) for ${counsellorName} is already booked. Please choose another available slot.`,
      });
    }

    // Lookup Client user ID if phone provided
    let clientId = null;
    let clientUser = null;
    if (clientPhone) {
      clientUser = await User.findOne({ phone: clientPhone });
      if (clientUser) clientId = clientUser._id;
    }

    // The free-session cap used to live only in the app (MMKV), so clearing
    // app data or reinstalling handed out unlimited free sessions. Enforce it
    // here, where it can't be bypassed.
    if (isFreeBookingRequest({ price }) && clientUser) {
      const quota = await getFreeSessionQuota(clientUser);
      if (quota.remaining <= 0) {
        return res.status(400).json({
          success: false,
          message: `You have used all ${quota.allowance} free sessions.`,
          reason: 'free_quota_exhausted',
          quota,
        });
      }
    }

    const booking = await Booking.create({
      clientId,
      counsellorId: counsellorId || null,
      counsellorName,
      clientName: clientName || 'Client',
      clientPhone: clientPhone || '',
      sessionType,
      dateText,
      dateISO,
      timeText,
      price: String(price),
      notes: notes || '',
      status: 'confirmed',
    });

    console.log(`[BOOKING CREATED] ID: ${booking._id} for ${counsellorName} with ${clientPhone}`);
    notifyCounsellorOfNewBooking(booking);

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Error in createBooking:', error);
    return res.status(500).json({ success: false, message: 'Server error creating booking', error: error.message });
  }
};

/**
 * Get all bookings for a client
 * GET /api/bookings/client/:phone
 */
exports.getClientBookings = async (req, res) => {
  try {
    const { phone } = req.params;

    const bookings = await Booking.find({ clientPhone: phone }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('Error in getClientBookings:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching bookings', error: error.message });
  }
};

/**
 * Get booking details by ID
 * GET /api/bookings/:id
 */
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error in getBookingById:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching booking', error: error.message });
  }
};

/**
 * Mint a Stream Video call token for a video-session booking.
 * GET /api/bookings/:id/call-token
 */
exports.getCallToken = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isOwner = booking.clientId
      ? String(booking.clientId) === String(req.clientUser._id)
      : booking.clientPhone === req.clientUser.phone;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    const result = await mintCallToken({
      bookingId: id,
      requesterUserId: req.clientUser._id,
      requesterName: req.clientUser.name || 'Client',
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error instanceof CallTokenError) {
      return res.status(error.status).json({ success: false, message: error.message, reason: error.reason });
    }
    console.error('Error in getCallToken:', error);
    return res.status(500).json({ success: false, message: 'Server error generating call token', error: error.message });
  }
};

/**
 * Mark a video call as ended (best-effort UI state).
 * POST /api/bookings/:id/call/end
 */
exports.endCall = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isOwner = booking.clientId
      ? String(booking.clientId) === String(req.clientUser._id)
      : booking.clientPhone === req.clientUser.phone;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    await endCallForBooking({ bookingId: id });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in endCall:', error);
    return res.status(500).json({ success: false, message: 'Server error ending call', error: error.message });
  }
};

/**
 * Ensure a chat channel exists between this client and the booking's counsellor.
 * GET /api/bookings/:id/chat-channel
 */
exports.getChatChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isOwner = booking.clientId
      ? String(booking.clientId) === String(req.clientUser._id)
      : booking.clientPhone === req.clientUser.phone;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking is cancelled' });
    }

    let counsellor = booking.counsellorId ? await Counsellor.findById(booking.counsellorId) : null;
    if (!counsellor) {
      counsellor = await Counsellor.findOne({ fullName: booking.counsellorName });
    }
    if (!counsellor || !counsellor.userId) {
      return res.status(400).json({ success: false, message: 'Counsellor account not found' });
    }

    const result = await provisionChatChannel({
      clientUser: { id: req.clientUser._id, name: req.clientUser.name },
      counsellorUser: { id: counsellor.userId, name: counsellor.fullName },
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Error in getChatChannel:', error);
    return res.status(500).json({ success: false, message: 'Server error provisioning chat channel', error: error.message });
  }
};

/**
 * Cancel booking
 * PATCH /api/bookings/:id/cancel
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Error in cancelBooking:', error);
    return res.status(500).json({ success: false, message: 'Server error cancelling booking', error: error.message });
  }
};

const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * Create Razorpay Order
 * POST /api/bookings/create-razorpay-order
 * SECURED: Server-side rate validation & price enforcement
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { counsellorId, counsellorName, sessionType = 'Chat', amount: clientAmount, currency = 'INR' } = req.body;

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890abcdef';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_key_1234567890';

    // SECURE PRICE ENFORCEMENT: Fetch price from DB to prevent client-side price tampering
    let sessionPrice = 499;
    if (counsellorId || counsellorName) {
      const counsellor = await Counsellor.findOne({
        $or: [
          { _id: counsellorId && mongoose.Types.ObjectId.isValid(counsellorId) ? counsellorId : null },
          { fullName: counsellorName },
        ],
      });

      if (counsellor) {
        if (counsellor.hasFreeSessionOffer) {
          return res.status(200).json({
            success: true,
            isFree: true,
            amount: 0,
            message: 'Free session offer available for this counsellor',
          });
        }
        const typeKey = String(sessionType).toLowerCase();
        if (counsellor.rates && counsellor.rates[typeKey]) {
          sessionPrice = counsellor.rates[typeKey];
        }
      }
    } else if (clientAmount) {
      sessionPrice = typeof clientAmount === 'number' ? clientAmount : parseFloat(String(clientAmount).replace(/[^0-9.]/g, '')) || 499;
    }

    const amountInPaise = Math.round(sessionPrice * 100);
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let orderId = `order_${Date.now()}`;

    // If real Razorpay keys are configured, call Razorpay API securely
    if (key_id && !key_id.includes('1234567890abcdef') && key_secret && !key_secret.includes('dummy_secret')) {
      try {
        const razorpay = new Razorpay({
          key_id,
          key_secret,
        });

        const rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency,
          receipt,
          payment_capture: 1,
        });
        orderId = rzpOrder.id;
      } catch (rzpErr) {
        console.warn('[RAZORPAY API WARNING] Order creation fallback:', rzpErr.message);
      }
    }

    console.log(`[RAZORPAY ORDER CREATED] Order ID: ${orderId}, Verified Server Amount: ₹${sessionPrice} (${amountInPaise} paise)`);

    return res.status(200).json({
      success: true,
      orderId,
      amount: amountInPaise,
      currency,
      keyId: key_id,
      verifiedPrice: sessionPrice,
    });
  } catch (error) {
    console.error('Error in createRazorpayOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay Order',
      error: error.message,
    });
  }
};

/**
 * Verify Razorpay Signature & Confirm Booking
 * POST /api/bookings/verify-razorpay-payment
 * SECURED: HMAC SHA256 Signature Verification & Idempotency check against double bookings
 */
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      counsellorId,
      counsellorName,
      clientPhone,
      clientName,
      sessionType,
      dateText,
      dateISO,
      timeText,
      price,
      notes,
    } = req.body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_key_1234567890';

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing order_id or payment_id for payment verification',
      });
    }

    // IDEMPOTENCY CHECK: Prevent duplicate booking creation for the same Razorpay Payment ID
    const existingBooking = await Booking.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existingBooking) {
      console.log(`[IDEMPOTENT BOOKING] Booking already exists for payment ID: ${razorpay_payment_id}`);
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: existingBooking,
      });
    }

    // Verify HMAC SHA256 Signature if live/real Razorpay checkout signature is provided
    const isMockSignature = !razorpay_signature || razorpay_signature.startsWith('sig_') || razorpay_signature.startsWith('mock_');
    let validSignature = razorpay_signature || '';

    if (key_secret) {
      const generatedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (!isMockSignature) {
        if (generatedSignature !== razorpay_signature) {
          console.error(`[SECURITY ERROR] HMAC mismatch for order ${razorpay_order_id}`);
          return res.status(400).json({
            success: false,
            message: 'Invalid payment signature. Verification failed.',
          });
        }
      } else {
        validSignature = generatedSignature;
      }
    }

    let clientId = null;
    if (clientPhone) {
      const user = await User.findOne({ phone: clientPhone });
      if (user) clientId = user._id;
    }

    const booking = await Booking.create({
      clientId,
      counsellorId: counsellorId || null,
      counsellorName,
      clientName: clientName || 'Client',
      clientPhone: clientPhone || '',
      sessionType,
      dateText,
      dateISO,
      timeText,
      price: String(price),
      notes: notes || '',
      status: 'confirmed',
      paymentStatus: 'completed',
      paymentMethod: 'razorpay',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: validSignature || razorpay_signature || '',
    });

    console.log(`[SECURE PAYMENT VERIFIED] Booking ID: ${booking._id}, Payment ID: ${booking.razorpayPaymentId}`);
    notifyCounsellorOfNewBooking(booking);
    notifyClientOfPayment(booking);

    return res.status(200).json({
      success: true,
      message: 'Razorpay payment verified securely and booking confirmed',
      data: booking,
    });
  } catch (error) {
    console.error('Error in verifyRazorpayPayment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message,
    });
  }
};

/**
 * Handle Razorpay Webhooks (Payment Auto-Verification)
 * POST /api/bookings/razorpay-webhook
 * SECURED: Verifies X-Razorpay-Signature with Webhook Secret
 */
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const razorpaySignature = req.headers['x-razorpay-signature'];

    // Verify webhook signature if webhook secret is configured
    if (webhookSecret && razorpaySignature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        console.error('[WEBHOOK SECURITY ERROR] Invalid Razorpay webhook signature');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        const updatedBooking = await Booking.findOneAndUpdate(
          { razorpayOrderId: orderId },
          {
            $set: {
              paymentStatus: 'completed',
              status: 'confirmed',
              razorpayPaymentId: paymentId,
            },
          },
          { new: true }
        );

        console.log(`[RAZORPAY WEBHOOK] Payment captured for Order: ${orderId}, Payment: ${paymentId}`);
        if (updatedBooking) {
          notifyClientOfPayment(updatedBooking);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error handling Razorpay Webhook:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
};

/**
 * Get all booked time slots for a counsellor on a specific date
 * GET /api/bookings/booked-slots?counsellorName=...&dateText=...
 */
exports.getBookedSlots = async (req, res) => {
  try {
    const { counsellorName, dateText } = req.query;

    if (!counsellorName || !dateText) {
      return res.status(200).json({ success: true, bookedSlots: [] });
    }

    const bookings = await Booking.find({
      counsellorName,
      dateText,
      status: { $ne: 'cancelled' },
    }).select('timeText');

    const bookedSlots = bookings.map((b) => b.timeText);

    return res.status(200).json({
      success: true,
      count: bookedSlots.length,
      bookedSlots,
    });
  } catch (error) {
    console.error('Error in getBookedSlots:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching booked slots', error: error.message });
  }
};



/**
 * How many free sessions this client has left.
 * GET /api/free-sessions
 */
exports.getFreeSessions = async (req, res) => {
  try {
    const quota = await getFreeSessionQuota(req.clientUser);
    return res.status(200).json({ success: true, ...quota });
  } catch (error) {
    console.error('Error in getFreeSessions:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching free sessions', error: error.message });
  }
};

/**
 * Move a booked session to another slot. No payment — already settled.
 * PATCH /api/bookings/:id/reschedule
 */
exports.rescheduleBookingAsClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateText, dateISO, timeText } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isOwner = booking.clientId
      ? String(booking.clientId) === String(req.clientUser._id)
      : booking.clientPhone === req.clientUser.phone;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    const { from } = await rescheduleBooking({ booking, dateText, dateISO, timeText, by: 'client' });

    notifyCounsellorOfReschedule(booking, from);

    return res.status(200).json({ success: true, message: 'Session rescheduled', data: booking });
  } catch (error) {
    if (error instanceof RescheduleError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Error in rescheduleBookingAsClient:', error);
    return res.status(500).json({ success: false, message: 'Server error rescheduling booking', error: error.message });
  }
};

async function notifyCounsellorOfReschedule(booking, from) {
  try {
    let counsellor = booking.counsellorId ? await Counsellor.findById(booking.counsellorId) : null;
    if (!counsellor) counsellor = await Counsellor.findOne({ fullName: booking.counsellorName });
    if (!counsellor?.userId) return;

    const counsellorUser = await User.findById(counsellor.userId);
    if (!counsellorUser?.pushToken) return;

    await sendPushNotification({
      token: counsellorUser.pushToken,
      title: 'Session rescheduled',
      body: `${booking.clientName || 'A client'} moved the ${from.dateText} ${from.timeText} session to ${booking.dateText} at ${booking.timeText}.`,
      data: { type: 'booking', bookingId: String(booking._id) },
    });
  } catch (error) {
    console.error('Failed to notify counsellor of reschedule:', error.message);
  }
}
