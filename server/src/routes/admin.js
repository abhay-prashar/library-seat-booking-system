const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { cancelBooking } = require('../services/bookingService');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');

const router = express.Router();

// All admin routes are protected and admin-only
router.use(protect, restrictTo('admin'));

const handleValidation = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));
  next();
};

// GET /api/admin/bookings - All bookings with filters
router.get('/bookings', async (req, res, next) => {
  try {
    const { status, userId, seatId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.user = userId;
    if (seatId) filter.seat = seatId;

    const lim = Math.min(parseInt(limit), 100);
    const skip = (parseInt(page) - 1) * lim;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'name email studentId')
        .populate('seat', 'seatNumber')
        .populate('section', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      Booking.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / lim), bookings });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/bookings/:id - Admin cancel any booking
router.delete('/bookings/:id', async (req, res, next) => {
  try {
    const booking = await cancelBooking({
      bookingId: req.params.id,
      requestingUser: req.user,
      reason: req.body.reason || 'Cancelled by admin',
    });
    res.json({ success: true, message: 'Booking cancelled.', booking });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users - All users
router.get('/users', async (req, res, next) => {
  try {
    const { role, isBlocked, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';

    const lim = Math.min(parseInt(limit), 100);
    const skip = (parseInt(page) - 1) * lim;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / lim), users });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/block - Block or unblock a user
router.put(
  '/users/:id/block',
  [
    body('isBlocked').isBoolean().withMessage('isBlocked must be a boolean'),
    body('reason').if(body('isBlocked').equals('true')).notEmpty().withMessage('Reason required when blocking'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { isBlocked, reason } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return next(new AppError('User not found.', 404));
      if (user.role === 'admin') return next(new AppError('Cannot block an admin.', 400));

      user.isBlocked = isBlocked;
      user.blockedReason = isBlocked ? reason : null;
      user.blockedAt = isBlocked ? new Date() : null;
      await user.save({ validateBeforeSave: false });

      res.json({ success: true, message: `User ${isBlocked ? 'blocked' : 'unblocked'}.`, user });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/analytics - Dashboard analytics
router.get('/analytics', async (_req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000);

    const [
      totalSeats,
      availableSeats,
      activeBookings,
      todayBookings,
      weekBookings,
      totalUsers,
      blockedUsers,
      statusBreakdown,
    ] = await Promise.all([
      Seat.countDocuments(),
      Seat.countDocuments({ isAvailable: true, isMaintenance: false }),
      Booking.countDocuments({ status: 'active' }),
      Booking.countDocuments({ createdAt: { $gte: todayStart } }),
      Booking.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ isBlocked: true }),
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      analytics: {
        seats: { total: totalSeats, available: availableSeats, occupied: totalSeats - availableSeats },
        bookings: {
          active: activeBookings,
          today: todayBookings,
          thisWeek: weekBookings,
          statusBreakdown: statusBreakdown.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        },
        users: { total: totalUsers, blocked: blockedUsers },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
