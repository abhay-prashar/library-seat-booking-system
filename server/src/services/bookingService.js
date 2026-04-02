const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { emitSeatUpdate } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Core booking service with optimistic locking to prevent race conditions.
 * Uses findOneAndUpdate with atomic conditions on the Seat document
 * to guarantee no double bookings even under concurrent requests.
 */
const createBooking = async ({ userId, seatId, startTime, endTime }) => {
  const session = await mongoose.startSession();
  session.startTransaction({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
  });

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    // Basic validations
    if (start < now) throw new AppError('Start time cannot be in the past.', 400);
    if (end <= start) throw new AppError('End time must be after start time.', 400);
    const diffHours = (end - start) / 1000 / 3600;
    if (diffHours > 4) throw new AppError('Maximum booking duration is 4 hours.', 400);
    if (diffHours < 0.5) throw new AppError('Minimum booking duration is 30 minutes.', 400);

    // Check user doesn't already have an active booking
    const user = await User.findById(userId).session(session);
    if (!user) throw new AppError('User not found.', 404);
    if (user.isBlocked) throw new AppError('Your account is blocked.', 403);
    if (user.activeBooking) {
      throw new AppError('You already have an active booking. Cancel it before making a new one.', 409);
    }

    // Atomically lock the seat: set isAvailable=false only if currently available and not in maintenance
    // This is the primary race-condition prevention mechanism
    const seat = await Seat.findOneAndUpdate(
      {
        _id: seatId,
        isAvailable: true,
        isMaintenance: false,
      },
      { $set: { isAvailable: false } },
      { new: true, session }
    ).populate('section');

    if (!seat) {
      throw new AppError('Seat is not available. It may have just been booked.', 409);
    }

    // Secondary overlap check: ensure no active/completed booking overlaps this time window
    const overlapping = await Booking.findOne({
      seat: seatId,
      status: { $in: ['active'] },
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } },
      ],
    }).session(session);

    if (overlapping) {
      // Rollback seat availability
      await Seat.findByIdAndUpdate(seatId, { $set: { isAvailable: true } }, { session });
      throw new AppError('This seat is already booked for the selected time slot.', 409);
    }

    // Create the booking
    const [booking] = await Booking.create(
      [
        {
          user: userId,
          seat: seatId,
          section: seat.section._id,
          startTime: start,
          endTime: end,
          status: 'active',
          checkInRequired: true,
        },
      ],
      { session }
    );

    // Link booking back to seat and user atomically
    await Seat.findByIdAndUpdate(seatId, { $set: { currentBooking: booking._id } }, { session });
    await User.findByIdAndUpdate(userId, { $set: { activeBooking: booking._id } }, { session });

    await session.commitTransaction();

    // Emit real-time update after successful commit
    const populatedBooking = await Booking.findById(booking._id)
      .populate('seat')
      .populate('section', 'name')
      .populate('user', 'name email');

    emitSeatUpdate({
      type: 'BOOKED',
      seatId: seatId,
      bookingId: booking._id,
      seat: populatedBooking.seat,
    });

    logger.info(`Booking created: ${booking._id} for user: ${userId} seat: ${seatId}`);
    return populatedBooking;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Cancel a booking. Supports user self-cancel and admin cancel.
 */
const cancelBooking = async ({ bookingId, requestingUser, reason = null }) => {
  const session = await mongoose.startSession();
  session.startTransaction({ writeConcern: { w: 'majority' } });

  try {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) throw new AppError('Booking not found.', 404);

    if (booking.status !== 'active') {
      throw new AppError(`Cannot cancel a booking with status: ${booking.status}.`, 400);
    }

    // Permissions: only the booking owner or an admin can cancel
    const isOwner = booking.user.toString() === requestingUser._id.toString();
    const isAdmin = requestingUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new AppError('You are not authorized to cancel this booking.', 403);
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.cancelledBy = requestingUser._id;
    booking.cancellationReason = reason;
    await booking.save({ session });

    // Free the seat
    await Seat.findByIdAndUpdate(
      booking.seat,
      { $set: { isAvailable: true, currentBooking: null } },
      { session }
    );

    // Clear user's active booking
    await User.findByIdAndUpdate(
      booking.user,
      { $set: { activeBooking: null } },
      { session }
    );

    await session.commitTransaction();

    emitSeatUpdate({ type: 'AVAILABLE', seatId: booking.seat.toString() });

    logger.info(`Booking ${bookingId} cancelled by user: ${requestingUser._id}`);
    return booking;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Check-in to an active booking.
 */
const checkIn = async ({ bookingId, userId }) => {
  const booking = await Booking.findOne({ _id: bookingId, user: userId, status: 'active' });
  if (!booking) throw new AppError('Active booking not found.', 404);
  if (booking.checkInTime) throw new AppError('Already checked in.', 400);

  const now = new Date();
  if (now < booking.startTime) throw new AppError('Check-in not allowed before booking start time.', 400);

  booking.checkInTime = now;
  await booking.save();
  logger.info(`Check-in: booking ${bookingId} by user ${userId}`);
  return booking;
};

module.exports = { createBooking, cancelBooking, checkIn };
