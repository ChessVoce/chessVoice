const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/email');
const { sendPasswordResetSMS } = require('../utils/sms');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.'
});

// Multer setup for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/profile-pictures'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user._id + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// Sign up
router.post('/signup', authLimiter, [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please enter a valid email'),
    body('phoneNumber')
        .optional()
        .matches(/^\+?[\d\s-()]+$/)
        .withMessage('Please enter a valid phone number'),
    body('gender')
        .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
        .withMessage('Please select a valid gender option'),
    body('avatar')
        .optional()
        .isString()
        .withMessage('Avatar must be a valid emoji'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
    try {
        // Check if database is connected
        if (!req.app.locals.isDatabaseConnected) {
            return res.status(503).json({ 
                error: 'Database not available. Please install MongoDB or use MongoDB Atlas.',
                details: 'The application requires a database connection for user registration.'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, phoneNumber, gender, avatar, password } = req.body;

        // Check if at least one contact method is provided
        if (!email && !phoneNumber) {
            return res.status(400).json({ error: 'Email or phone number is required' });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Check if email already exists
        if (email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already registered' });
            }
        }

        // Check if phone number already exists
        if (phoneNumber) {
            const existingPhone = await User.findOne({ phoneNumber });
            if (existingPhone) {
                return res.status(400).json({ error: 'Phone number already registered' });
            }
        }

        // Create user
        const user = new User({
            username,
            email,
            phoneNumber,
            gender,
            avatar: avatar || '👤',
            password
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                gender: user.gender,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                gameStats: user.gameStats
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        if (error.name === 'MongooseError' || error.name === 'MongoError') {
            res.status(503).json({ 
                error: 'Database error. Please try again later.',
                details: 'Unable to connect to the database.'
            });
        } else {
            res.status(500).json({ error: 'Server error' });
        }
    }
});

// Login
router.post('/login', authLimiter, [
    body('identifier')
        .notEmpty()
        .withMessage('Email, phone number, or username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], async (req, res) => {
    try {
        // Check if database is connected
        if (!req.app.locals.isDatabaseConnected) {
            return res.status(503).json({ 
                error: 'Database not available. Please install MongoDB or use MongoDB Atlas.',
                details: 'The application requires a database connection for user login.'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { identifier, password } = req.body;

        // Find user by email, phone, or username
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { phoneNumber: identifier },
                { username: identifier }
            ]
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last active and online status
        user.lastActive = new Date();
        user.isOnline = true;
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                gender: user.gender,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
                gameStats: user.gameStats,
                preferences: user.preferences
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        if (error.name === 'MongooseError' || error.name === 'MongoError') {
            res.status(503).json({ 
                error: 'Database error. Please try again later.',
                details: 'Unable to connect to the database.'
            });
        } else {
            res.status(500).json({ error: 'Server error' });
        }
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                phoneNumber: req.user.phoneNumber,
                isEmailVerified: req.user.isEmailVerified,
                isPhoneVerified: req.user.isPhoneVerified,
                gameStats: req.user.gameStats,
                preferences: req.user.preferences,
                profilePicture: req.user.profilePicture
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
router.post('/logout', auth, async (req, res) => {
    try {
        req.user.isOnline = false;
        req.user.lastActive = new Date();
        await req.user.save();

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Forgot Password - Request reset
router.post('/forgot-password', authLimiter, [
    body('identifier')
        .notEmpty()
        .withMessage('Email, phone number, or username is required'),
    body('method')
        .optional()
        .isIn(['email', 'sms'])
        .withMessage('Method must be either email or sms')
], async (req, res) => {
    try {
        // Check if database is connected
        if (!req.app.locals.isDatabaseConnected) {
            return res.status(503).json({ 
                error: 'Database not available. Please try again later.',
                details: 'The application requires a database connection for password reset.'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { identifier, method } = req.body;

        // Find user by email, phone, or username
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { phoneNumber: identifier },
                { username: identifier }
            ]
        });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If an account exists with that information, a reset code has been sent.' });
        }

        // Check if user has email for password reset
        if (!user.email && method === 'email') {
            return res.status(400).json({ error: 'Email address not found for this account. Try SMS instead.' });
        }
        if (!user.phoneNumber && method === 'sms') {
            return res.status(400).json({ error: 'Phone number not found for this account. Try email instead.' });
        }

        // Determine reset method
        let resetMethod = method;
        if (!resetMethod) {
            // Auto-detect method based on identifier
            if (identifier.includes('@')) {
                resetMethod = 'email';
            } else if (identifier.match(/^\+?[\d\s-()]+$/)) {
                resetMethod = 'sms';
            } else {
                // For username, prefer email if available, otherwise SMS
                resetMethod = user.email ? 'email' : 'sms';
            }
        }

        // Validate method availability
        if (resetMethod === 'email' && !user.email) {
            return res.status(400).json({ error: 'Email address not found for this account. Try SMS instead.' });
        }
        if (resetMethod === 'sms' && !user.phoneNumber) {
            return res.status(400).json({ error: 'Phone number not found for this account. Try email instead.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        let codeSent = false;

        // Send reset code via chosen method
        if (resetMethod === 'email') {
            codeSent = await sendPasswordResetEmail(user.email, resetToken);
        } else if (resetMethod === 'sms') {
            codeSent = await sendPasswordResetSMS(user.phoneNumber, resetToken);
        }
        
        if (codeSent) {
            res.json({ 
                message: 'If an account exists with that information, a reset code has been sent.',
                method: resetMethod
            });
        } else {
            // Reset the token if sending failed
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            res.status(500).json({ 
                error: `Failed to send reset code via ${resetMethod}. Please try again later.`,
                method: resetMethod
            });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reset Password - Verify code and set new password
router.post('/reset-password', authLimiter, [
    body('identifier')
        .notEmpty()
        .withMessage('Email, phone number, or username is required'),
    body('resetToken')
        .notEmpty()
        .withMessage('Reset code is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
    try {
        // Check if database is connected
        if (!req.app.locals.isDatabaseConnected) {
            return res.status(503).json({ 
                error: 'Database not available. Please try again later.',
                details: 'The application requires a database connection for password reset.'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { identifier, resetToken, newPassword } = req.body;

        // Find user by email, phone, or username
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { phoneNumber: identifier },
                { username: identifier }
            ]
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid reset request' });
        }

        // Check if reset token is valid and not expired
        if (!user.resetPasswordToken || 
            user.resetPasswordToken !== resetToken.toUpperCase() ||
            user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }

        // Update password
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user info (username, email, phone number)
const { auth: requireAuth } = require('../middleware/auth');
router.put('/update-info', requireAuth, async (req, res) => {
  try {
    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.phoneNumber) updates.phoneNumber = req.body.phoneNumber;
    // Validate uniqueness for username, email, phone
    if (updates.username) {
      const exists = await User.findOne({ username: updates.username, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ error: 'Username already taken' });
    }
    if (updates.email) {
      const exists = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ error: 'Email already in use' });
    }
    if (updates.phoneNumber) {
      const exists = await User.findOne({ phoneNumber: updates.phoneNumber, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ error: 'Phone number already in use' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile picture endpoint
router.post('/upload-profile-picture', requireAuth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let filePath = '/uploads/profile-pictures/' + req.file.filename;
    // Normalize to forward slashes for browser compatibility
    filePath = filePath.replace(/\\/g, '/');
    const user = await User.findByIdAndUpdate(req.user._id, { profilePicture: filePath }, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password endpoint
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 