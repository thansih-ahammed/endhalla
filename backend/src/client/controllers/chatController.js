const { mintChatToken } = require('../../utils/chatToken');
const Booking = require('../../models/Booking');
const Counsellor = require('../../models/Counsellor');
const User = require('../../models/User');
const { sendPushNotification } = require('../../utils/pushNotification');

/**
 * Mint a Stream Chat identity token for the logged-in client.
 * GET /api/chat/token
 */
exports.getChatToken = async (req, res) => {
  try {
    const result = mintChatToken({
      requesterUserId: req.clientUser._id,
      requesterName: req.clientUser.name || 'Client',
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error in getChatToken:', error);
    return res.status(500).json({ success: false, message: 'Server error generating chat token', error: error.message });
  }
};

/**
 * Push a "new message" notification to the counsellor on this booking.
 *
 * Stream's own chat push is disabled on this app (firebase.enabled = false,
 * no push providers registered), so chat notifications go through the same
 * Firebase Admin path that already delivers booking/call notifications.
 * The sender's app calls this right after the message is sent.
 *
 * POST /api/chat/notify
 */
exports.notifyCounsellor = async (req, res) => {
  try {
    const { bookingId, text } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isOwner = booking.clientId
      ? String(booking.clientId) === String(req.clientUser._id)
      : booking.clientPhone === req.clientUser.phone;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    let counsellor = booking.counsellorId ? await Counsellor.findById(booking.counsellorId) : null;
    if (!counsellor) counsellor = await Counsellor.findOne({ fullName: booking.counsellorName });
    if (!counsellor?.userId) {
      return res.status(400).json({ success: false, message: 'Counsellor account not found' });
    }

    const counsellorUser = await User.findById(counsellor.userId);
    if (!counsellorUser?.pushToken) {
      // Not an error the sender should see as a failure — the message itself
      // was delivered by Stream regardless.
      return res.status(200).json({ success: true, delivered: false, reason: 'no_push_token' });
    }

    await sendPushNotification({
      token: counsellorUser.pushToken,
      title: req.clientUser.name || 'New message',
      body: String(text || '').slice(0, 140) || 'Sent you a message',
      data: { type: 'chat', bookingId: String(booking._id) },
    });

    return res.status(200).json({ success: true, delivered: true });
  } catch (error) {
    console.error('Error in notifyCounsellor:', error);
    return res.status(500).json({ success: false, message: 'Server error sending chat notification', error: error.message });
  }
};
