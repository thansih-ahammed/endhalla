const Booking = require('../models/Booking');

class RescheduleError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Moves a confirmed booking to a new slot.
 *
 * Deliberately uses booking.save() rather than findByIdAndUpdate: the model's
 * pre('save') hook is what recomputes `scheduledAt` from dateISO/dateText +
 * timeText, and that field is what both apps sort and label by. An update that
 * bypasses the hook leaves the booking showing a new time while scheduledAt
 * still points at the old one.
 *
 * No payment is involved — the session was paid for at booking time, and the
 * price/paymentStatus fields are carried over untouched.
 */
async function rescheduleBooking({ booking, dateText, dateISO, timeText, by }) {
  if (!dateText || !timeText) {
    throw new RescheduleError(400, 'dateText and timeText are required');
  }
  if (booking.status === 'cancelled') {
    throw new RescheduleError(400, 'This booking is cancelled');
  }
  if (booking.status === 'completed') {
    throw new RescheduleError(400, 'This session is already completed');
  }
  if (booking.callStatus === 'ongoing') {
    throw new RescheduleError(400, 'The call is in progress — it cannot be rescheduled');
  }
  if (booking.callStatus === 'ended') {
    throw new RescheduleError(400, 'This session has already taken place');
  }
  if (booking.dateText === dateText && booking.timeText === timeText) {
    throw new RescheduleError(400, 'That is the slot this session is already booked for');
  }

  // Same conflict rule createBooking enforces, so rescheduling can't
  // double-book a counsellor the way the admin update path can.
  const clash = await Booking.findOne({
    _id: { $ne: booking._id },
    counsellorName: booking.counsellorName,
    dateText,
    timeText,
    status: { $ne: 'cancelled' },
  });
  if (clash) {
    throw new RescheduleError(400, `${timeText} on ${dateText} is already booked. Please choose another slot.`);
  }

  const from = { dateText: booking.dateText, timeText: booking.timeText };

  booking.dateText = dateText;
  booking.timeText = timeText;
  if (dateISO) booking.dateISO = dateISO;
  booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;
  booking.lastRescheduledAt = new Date();
  booking.rescheduleHistory.push({
    fromDateText: from.dateText,
    fromTimeText: from.timeText,
    toDateText: dateText,
    toTimeText: timeText,
    by,
    at: new Date(),
  });

  await booking.save();
  return { booking, from };
}

module.exports = { rescheduleBooking, RescheduleError };
