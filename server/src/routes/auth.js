const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const handleValidation = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }
  next();
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('studentId').optional().trim(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { name, email, password, studentId } = req.body;
      const exists = await User.findOne({ email });
      if (exists) return next(new AppError('Email already registered.', 409));

      const user = await User.create({ name, email, password, studentId });
      const token = signToken(user._id);

      res.status(201).json({ success: true, token, user: user.toSafeObject() });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        return next(new AppError('Invalid email or password.', 401));
      }
      if (user.isBlocked) {
        return next(new AppError(`Account blocked: ${user.blockedReason || 'Contact admin.'}`, 403));
      }

      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      const token = signToken(user._id);
      res.json({ success: true, token, user: user.toSafeObject() });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('activeBooking');
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
