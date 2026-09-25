const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Non-Binary', 'Prefer not to say', 'Other', ''],
      default: '',
    },
    userType: {
      type: String,
      enum: ['client', 'counsellor'],
      default: 'client',
    },
    avatar: {
      type: String,
      default: '',
    },
    pushToken: {
      type: String,
      default: '',
    },
    // How many free sessions this user is entitled to in total. Kept on the
    // user (not hardcoded) so support/admin can grant extras. What's been
    // *used* is always derived from their bookings — see utils/freeSessions.js
    // — so the two can never drift apart.
    freeSessionsAllowance: {
      type: Number,
      default: 2,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
