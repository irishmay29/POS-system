const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../User');
const RefreshToken = require('../RefreshToken');
const { verifyToken } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_env';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

// Register a new user
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const user = new User({ name, email, password, role });
    await user.save();
    return res.status(201).json({ message: 'User created', user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // create refresh token
    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ token: refreshTokenValue, user: user._id, expiresAt });

    return res.json({ token, refreshToken: refreshTokenValue, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
  try {
    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored) return res.status(401).json({ message: 'Invalid refresh token' });
    if (stored.expiresAt < new Date()) {
      await stored.deleteOne();
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const user = await User.findById(stored.user);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // rotate refresh token
    await stored.deleteOne();
    const newRefresh = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ token: newRefresh, user: user._id, expiresAt });

    res.json({ token, refreshToken: newRefresh });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Logout (revoke refresh token)
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
  try {
    await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
