const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Seat = require('../models/Seat');
const Section = require('../models/Section');
const Booking = require('../models/Booking');
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { emitSeatUpdate } = require('../config/socket');

const router = express.Router();

const handleValidation = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));
  next();
};

// GET /api/seats - Get all seats with their availability and optional time-slot status
router.get('/', protect, async (req, res, next) => {
  try {
    const { sectionId, startTime, endTime } = req.query;

    const filter = {};
    if (sectionId) filter.section = sectionId;

    const seats = await Seat.find(filter)
      .populate('section', 'name floor description amenities')
      .populate('currentBooking', 'startTime endTime user')
      .sort({ 'section': 1, seatNumber: 1 });

    // If a time range is provided, check which seats are booked during that window
    let bookedSeatIds = new Set();
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const overlapping = await Booking.find({
        status: 'active',
        $or: [{ startTime: { $lt: end }, endTime: { $gt: start } }],
      }).select('seat');
      bookedSeatIds = new Set(overlapping.map((b) => b.seat.toString()));
    }

    const seatsWithStatus = seats.map((seat) => {
      const obj = seat.toObject();
      if (startTime && endTime) {
        obj.isBookedForSlot = bookedSeatIds.has(seat._id.toString());
      }
      return obj;
    });

    res.json({ success: true, count: seats.length, seats: seatsWithStatus });
  } catch (err) {
    next(err);
  }
});

// GET /api/seats/sections - Get all sections
router.get('/sections', protect, async (_req, res, next) => {
  try {
    const sections = await Section.find({ isActive: true }).sort({ floor: 1, name: 1 });
    res.json({ success: true, sections });
  } catch (err) {
    next(err);
  }
});

// GET /api/seats/:id - Get seat detail
router.get('/:id', protect, async (req, res, next) => {
  try {
    const seat = await Seat.findById(req.params.id)
      .populate('section', 'name floor')
      .populate('currentBooking');
    if (!seat) return next(new AppError('Seat not found.', 404));
    res.json({ success: true, seat });
  } catch (err) {
    next(err);
  }
});

// ---- Admin-only routes ----

// POST /api/seats/sections - Create section
router.post(
  '/sections',
  protect,
  restrictTo('admin'),
  [
    body('name').trim().notEmpty().withMessage('Section name is required'),
    body('floor').optional().isInt({ min: 1 }),
    body('amenities').optional().isArray(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const section = await Section.create(req.body);
      res.status(201).json({ success: true, section });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/seats - Create seat (admin)
router.post(
  '/',
  protect,
  restrictTo('admin'),
  [
    body('seatNumber').trim().notEmpty().withMessage('Seat number is required'),
    body('section').isMongoId().withMessage('Valid section ID required'),
    body('row').optional().isInt({ min: 1 }),
    body('col').optional().isInt({ min: 1 }),
    body('amenities').optional().isArray(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const sectionExists = await Section.findById(req.body.section);
      if (!sectionExists) return next(new AppError('Section not found.', 404));

      const seat = await Seat.create(req.body);
      await seat.populate('section', 'name floor');
      res.status(201).json({ success: true, seat });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/seats/:id - Update seat (admin)
router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  async (req, res, next) => {
    try {
      const allowed = ['isMaintenance', 'maintenanceNote', 'amenities', 'seatNumber'];
      const updates = {};
      allowed.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      if (updates.isMaintenance === true) {
        updates.isAvailable = false;
      } else if (updates.isMaintenance === false) {
        updates.isAvailable = true;
      }

      const seat = await Seat.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
        .populate('section', 'name floor');
      if (!seat) return next(new AppError('Seat not found.', 404));

      emitSeatUpdate({ type: 'UPDATED', seatId: seat._id.toString(), seat });
      res.json({ success: true, seat });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/seats/:id - Delete seat (admin)
router.delete('/:id', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const seat = await Seat.findById(req.params.id);
    if (!seat) return next(new AppError('Seat not found.', 404));
    if (!seat.isAvailable) return next(new AppError('Cannot delete a seat with an active booking.', 400));
    await seat.deleteOne();
    res.json({ success: true, message: 'Seat deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
