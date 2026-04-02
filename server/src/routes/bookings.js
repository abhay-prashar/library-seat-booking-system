const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { createBooking, cancelBooking, checkIn } = require('../services/bookingService');
const Booking = require('../models/Booking');

const router = express.Router();

const handleValidation = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));
  next();
};

// POST /api/bookings - Create a booking
router.post(
  '/',
  protect,
  restrictTo('student'),
  [
    body('seatId').isMongoId().withMessage('Valid seat ID required'),
    body('startTime').isISO8601().withMessage('Valid startTime (ISO8601) required'),
    body('endTime').isISO8601().withMessage('Valid endTime (ISO8601) required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const booking = await createBooking({
        userId: req.user._id,
        seatId: req.body.seatId,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
      });
      res.status(201).json({ success: true, booking });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/bookings/my - My booking history
router.get('/my', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('seat', 'seatNumber amenities')
        .populate('section', 'name floor')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.json({ success: true, total, page, pages: Math.ceil(total / limit), bookings });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/active - Get current active booking
router.get('/active', protect, async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ user: req.user._id, status: 'active' })
      .populate('seat', 'seatNumber amenities row col')
      .populate('section', 'name floor description');
    res.json({ success: true, booking: booking || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/checkin - Check in to a booking
router.post('/:id/checkin', protect, async (req, res, next) => {
  try {
    const booking = await checkIn({ bookingId: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Checked in successfully.', booking });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bookings/:id - Cancel a booking
router.delete(
  '/:id',
  protect,
  async (req, res, next) => {
    try {
      const booking = await cancelBooking({
        bookingId: req.params.id,
        requestingUser: req.user,
        reason: req.body.reason || null,
      });
      res.json({ success: true, message: 'Booking cancelled.', booking });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/bookings/:id - Get booking detail
router.get('/:id', protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('seat', 'seatNumber amenities row col')
      .populate('section', 'name floor')
      .populate('user', 'name email studentId');

    if (!booking) return next(new AppError('Booking not found.', 404));

    // Students can only see their own bookings
    if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized.', 403));
    }

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
