const cron = require('node-cron');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const User = require('../models/User');
const { emitSeatUpdate } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Expires bookings whose endTime has passed.
 * Runs every minute.
 */
const expireEndedBookings = async () => {
  const session = await mongoose.startSession();
  session.startTransaction({ writeConcern: { w: 'majority' } });

  try {
    const now = new Date();

    const expiredBookings = await Booking.find({
      status: 'active',
      endTime: { $lte: now },
    }).session(session);

    if (expiredBookings.length === 0) {
      await session.abortTransaction();
      return;
    }

    const bookingIds = expiredBookings.map((b) => b._id);
    const seatIds = expiredBookings.map((b) => b.seat);
    const userIds = expiredBookings.map((b) => b.user);

    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { $set: { status: 'expired' } },
      { session }
    );

    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { isAvailable: true, currentBooking: null } },
      { session }
    );

    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { activeBooking: null } },
      { session }
    );

    await session.commitTransaction();

    // Emit seat updates
    seatIds.forEach((seatId) => {
      emitSeatUpdate({ type: 'AVAILABLE', seatId: seatId.toString() });
    });

    logger.info(`Expired ${expiredBookings.length} booking(s).`);
  } catch (err) {
    await session.abortTransaction();
    logger.error('Error in expireEndedBookings cron:', err);
  } finally {
    session.endSession();
  }
};

/**
 * Auto-cancels bookings where check-in deadline has passed without a check-in.
 * Runs every minute.
 */
const cancelNoShows = async () => {
  const session = await mongoose.startSession();
  session.startTransaction({ writeConcern: { w: 'majority' } });

  try {
    const now = new Date();

    const noShows = await Booking.find({
      status: 'active',
      checkInRequired: true,
      checkInTime: null,
      checkInDeadline: { $lte: now },
    }).session(session);

    if (noShows.length === 0) {
      await session.abortTransaction();
      return;
    }

    const bookingIds = noShows.map((b) => b._id);
    const seatIds = noShows.map((b) => b.seat);
    const userIds = noShows.map((b) => b.user);

    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { $set: { status: 'no_show', cancellationReason: 'Auto-cancelled: no check-in within grace period' } },
      { session }
    );

    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { isAvailable: true, currentBooking: null } },
      { session }
    );

    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { activeBooking: null } },
      { session }
    );

    await session.commitTransaction();

    seatIds.forEach((seatId) => {
      emitSeatUpdate({ type: 'AVAILABLE', seatId: seatId.toString() });
    });

    logger.info(`Auto-cancelled ${noShows.length} no-show booking(s).`);
  } catch (err) {
    await session.abortTransaction();
    logger.error('Error in cancelNoShows cron:', err);
  } finally {
    session.endSession();
  }
};

const startCronJobs = () => {
  // Every minute
  cron.schedule('* * * * *', async () => {
    await expireEndedBookings();
    await cancelNoShows();
  });

  logger.info('Cron jobs started: booking expiry + no-show cancellation (every 1 minute)');
};

module.exports = { startCronJobs };
