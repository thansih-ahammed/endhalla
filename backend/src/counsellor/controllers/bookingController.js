const Booking = require('../../models/Booking');
const User = require('../../models/User');
const { mintCallToken, endCall: endCallForBooking, CallTokenError } = require('../../utils/callToken');
const { provisionChatChannel } = require('../../utils/chatToken');
const { rescheduleBooking, RescheduleError } = require('../../utils/reschedule');
const { sendPushNotification } = require('../../utils/pushNotification');

function isOwnedByCounsellor(booking, counsellor) {
  if (booking.counsellorId) {
    return String(booking.counsellorId) === String(counsellor._id);
  }
  return (booking.counsellorName || '').toLowerCase() === (counsellor.fullName || '').toLowerCase();
}

/**
 * Get booking details by ID (counsellor side)
 * GET /api/counsellor/bookings/:id
 */
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isOwnedByCounsellor(booking, req.counsellor)) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error in getBookingById:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching booking', error: error.message });
  }
};

/**
 * Mint a Stream Video call token for a video-session booking.
 * GET /api/counsellor/bookings/:id/call-token
 */
exports.getCallToken = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isOwnedByCounsellor(booking, req.counsellor)) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    const result = await mintCallToken({
      bookingId: id,
      requesterUserId: req.counsellor.userId || req.counsellor._id,
      requesterName: req.counsellor.fullName || 'Counsellor',
      isCounsellor: true,
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
 * POST /api/counsellor/bookings/:id/call/end
 */
exports.endCall = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isOwnedByCounsellor(booking, req.counsellor)) {
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
 * Ensure a chat channel exists between this counsellor and the booking's client.
 * GET /api/counsellor/bookings/:id/chat-channel
 */
exports.getChatChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isOwnedByCounsellor(booking, req.counsellor)) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking is cancelled' });
    }

    let clientUser = booking.clientId ? await User.findById(booking.clientId) : null;
    if (!clientUser && booking.clientPhone) {
      clientUser = await User.findOne({ phone: booking.clientPhone });
    }
    if (!clientUser) {
      return res.status(400).json({ success: false, message: 'Client account not found' });
    }

    const result = await provisionChatChannel({
      clientUser: { id: clientUser._id, name: clientUser.name || booking.clientName },
      counsellorUser: { id: req.counsellor.userId || req.counsellor._id, name: req.counsellor.fullName },
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
 * Counsellor moves a session to another slot.
 * PATCH /api/counsellor/bookings/:id/reschedule
 */
exports.rescheduleBookingAsCounsellor = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateText, dateISO, timeText } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (!isOwnedByCounsellor(booking, req.counsellor)) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    const { from } = await rescheduleBooking({ booking, dateText, dateISO, timeText, by: 'counsellor' });

    notifyClientOfReschedule(booking, from, req.counsellor.fullName);

    return res.status(200).json({ success: true, message: 'Session rescheduled', data: booking });
  } catch (error) {
    if (error instanceof RescheduleError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Error in rescheduleBookingAsCounsellor:', error);
    return res.status(500).json({ success: false, message: 'Server error rescheduling booking', error: error.message });
  }
};

async function resolveClientUser(booking) {
  let clientUser = booking.clientId ? await User.findById(booking.clientId) : null;
  if (!clientUser && booking.clientPhone) clientUser = await User.findOne({ phone: booking.clientPhone });
  return clientUser;
}

async function notifyClientOfReschedule(booking, from, counsellorName) {
  try {
    const clientUser = await resolveClientUser(booking);
    if (!clientUser?.pushToken) return;
    await sendPushNotification({
      token: clientUser.pushToken,
      title: 'Session rescheduled',
      body: `${counsellorName || 'Your counsellor'} moved the ${from.dateText} ${from.timeText} session to ${booking.dateText} at ${booking.timeText}.`,
      data: { type: 'booking', bookingId: String(booking._id) },
    });
  } catch (error) {
    console.error('Failed to notify client of reschedule:', error.message);
  }
}

/**
 * Push a "new message" notification to the client on this booking.
 * POST /api/counsellor/chat/notify
 */
exports.notifyClientOfChat = async (req, res) => {
  try {
    const { bookingId, text } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (!isOwnedByCounsellor(booking, req.counsellor)) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    const clientUser = await resolveClientUser(booking);
    if (!clientUser?.pushToken) {
      return res.status(200).json({ success: true, delivered: false, reason: 'no_push_token' });
    }

    await sendPushNotification({
      token: clientUser.pushToken,
      title: req.counsellor.fullName || 'New message',
      body: String(text || '').slice(0, 140) || 'Sent you a message',
      data: { type: 'chat', bookingId: String(booking._id) },
    });

    return res.status(200).json({ success: true, delivered: true });
  } catch (error) {
    console.error('Error in notifyClientOfChat:', error);
    return res.status(500).json({ success: false, message: 'Server error sending chat notification', error: error.message });
  }
};
