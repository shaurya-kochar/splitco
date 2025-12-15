import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { saveOtp, getOtp, deleteOtp, isOtpExpired } from '../store/otpStore.js';
import { findOrCreateUser, findUserByPhone } from '../store/userStore.js';
import { createSession, getSession, deleteSession } from '../store/sessionStore.js';
import { sendOtpSms } from '../services/sms.js';

const router = Router();

// Fixed OTP for development mode
const DEV_OTP = '123456';

// Generate 6-digit OTP
function generateOtp() {
  // In DEV_MODE, always use fixed OTP
  if (process.env.DEV_MODE === 'true') {
    return DEV_OTP;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate phone number format
function isValidPhone(phone) {
  return /^\+91\d{10}$/.test(phone);
}

// POST /auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
    
    // Generate OTP
    const otp = generateOtp();
    
    // Hash OTP before storing
    const hashedOtp = await bcrypt.hash(otp, 10);
    
    // Store hashed OTP (overwrites previous OTP for this phone)
    saveOtp(phone, hashedOtp);
    
    // Send OTP via SMS
    await sendOtpSms(phone, otp);
    
    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
    
  } catch (error) {
    console.error('Send OTP error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP. Please try again.'
    });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number'
      });
    }
    
    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP format'
      });
    }
    
    // Check if OTP exists
    const otpRecord = getOtp(phone);
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'No OTP found. Please request a new one.'
      });
    }
    
    // Check expiry
    if (isOtpExpired(phone)) {
      deleteOtp(phone);
      return res.status(400).json({
        success: false,
        error: 'Code expired. Request a new one.'
      });
    }
    
    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect code. Try again.'
      });
    }
    
    // Delete OTP after successful verification
    deleteOtp(phone);
    
    // Find or create user
    const user = findOrCreateUser(phone);
    
    // Create session
    const session = createSession(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        createdAt: user.createdAt
      },
      token: session.token,
      expiresAt: session.expiresAt
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Verification failed. Please try again.'
    });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (token) {
    deleteSession(token);
  }
  
  res.json({ success: true });
});

// GET /auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }
  
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Session expired'
    });
  }
  
  // Find user by iterating through users (simplified for in-memory store)
  // In production, store userId in session and lookup directly
  res.json({
    success: true,
    userId: session.userId
  });
});

export default router;
