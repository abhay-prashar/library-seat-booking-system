const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: true,
      index: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'expired', 'no_show'],
      default: 'active',
      index: true,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkInRequired: {
      type: Boolean,
      default: true,
    },
    checkInDeadline: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Critical compound index to prevent double bookings at the DB level (last line of defense)
bookingSchema.index(
  { seat: 1, status: 1, startTime: 1, endTime: 1 },
  { name: 'seat_booking_overlap_check' }
);
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ startTime: 1, endTime: 1 });
bookingSchema.index({ status: 1, endTime: 1 }); // For cron job expiry queries

// Virtual: duration in minutes
bookingSchema.virtual('durationMinutes').get(function () {
  return Math.round((this.endTime - this.startTime) / 1000 / 60);
});

// Validate endTime > startTime
bookingSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error('End time must be after start time'));
  }
  // Set checkInDeadline to startTime + grace period (default 15 min)
  if (!this.checkInDeadline && this.checkInRequired) {
    const gracePeriod = parseInt(process.env.CHECKIN_GRACE_PERIOD_MINUTES || '15', 10);
    this.checkInDeadline = new Date(this.startTime.getTime() + gracePeriod * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
