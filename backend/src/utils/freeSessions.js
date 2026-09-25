const Booking = require('../models/Booking');

/**
 * A booking counts as "free" purely by its price.
 *
 * Deliberately NOT keyed on paymentMethod: createBooking never persists that
 * field from the request, so the schema default ('free') applies to every
 * booking at creation time — it's only corrected to 'razorpay' later by
 * verifyRazorpayPayment. Trusting it would count paid sessions against the
 * free quota.
 */
const FREE_BOOKING_FILTER = {
  status: { $ne: 'cancelled' },
  price: { $regex: /^\s*free\s*$/i },
};

/**
 * How many free sessions a user has left.
 *
 * `used` is always counted from their bookings rather than stored on the user,
 * so a cancelled session gives the free slot back and there is no counter to
 * drift out of sync. Cancelled bookings are excluded by FREE_BOOKING_FILTER.
 */
async function getFreeSessionQuota(user) {
  const allowance = typeof user?.freeSessionsAllowance === 'number' ? user.freeSessionsAllowance : 2;

  const match = { ...FREE_BOOKING_FILTER };
  if (user?._id) {
    match.$and = [{ $or: [{ clientId: user._id }, { clientPhone: user.phone }] }];
  } else {
    match.clientPhone = user?.phone;
  }

  const used = await Booking.countDocuments(match);
  return {
    allowance,
    used,
    remaining: Math.max(0, allowance - used),
  };
}

/** True when this booking request is asking for a free session. */
function isFreeBookingRequest({ price }) {
  return String(price).trim().toLowerCase() === 'free';
}

module.exports = { getFreeSessionQuota, isFreeBookingRequest, FREE_BOOKING_FILTER };
