// controllers/account/forgotpwd.controller.js
// Two endpoints for OTP-based password reset:
//
//   POST /account/sendForgotOtp
//     body: { RegEmailAddress, lang? }   → generates OTP, stores it, sends bilingual email
//
//   POST /account/verifyForgotOtp
//     body: { RegEmailAddress, otp, newPassword }  → verifies OTP, updates password

const crypto  = require('crypto');
const { connectToMongoDB } = require('../../config/db');      // adjust to your DB helper path
const transporter            = require('../email/mail');
const { forgotOtpTemplate }  = require('../emailtemplates/forgotOtpTemplate');

require('dotenv').config();

// ─── helpers ─────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 4-digit numeric OTP */
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Same MD5 hash your existing signin uses */
function makePwdKey(email, password) {
  const buf = crypto
    .createHash('md5')
    .update(email + password, 'utf-8')
    .digest();
  let key = '';
  for (let i = 0; i < buf.length; i++) key += buf[i];
  return key;
}

function sendResponse(res, statusCode, message, data, error) {
  return res.status(statusCode).json({ statusCode, message, data: data || null, error: error || false });
}

// ─── OTP expiry (10 minutes) ──────────────────────────────────────────────────
const OTP_TTL_MS = 10 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// 1) POST /account/sendForgotOtp
// ─────────────────────────────────────────────────────────────────────────────
exports.sendForgotOtp = async (req, res) => {
  try {
    const inputEmail = String(req.body?.RegEmailAddress || '').trim();
    const lang       = String(req.body?.lang || 'en').toLowerCase(); // 'en' | 'ar'

    // ── Validate input ────────────────────────────────────────────────────────
    if (!inputEmail) {
      return sendResponse(res, 400, 'RegEmailAddress is required.', null, 'MISSING_EMAIL');
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(inputEmail)) {
      return sendResponse(res, 400, 'Invalid email address.', null, 'INVALID_EMAIL');
    }

    const db    = await connectToMongoDB();
    const users = db.collection('tblreginfo');

    // ── Find user ─────────────────────────────────────────────────────────────
    let user = await users.findOne({ RegEmailAddress: inputEmail });
    if (!user) {
      user = await users.findOne({
        RegEmailAddress: { $regex: `^${escapeRegex(inputEmail)}$`, $options: 'i' },
      });
    }

    if (!user) {
      // Security: don't reveal whether the email exists
      return sendResponse(res, 200, 'If that email is registered, you will receive an OTP shortly.', { status: 'SENT' });
    }

    // ── Generate & store OTP ──────────────────────────────────────────────────
    const otp       = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await users.updateOne(
      { RegUserID: user.RegUserID },
      {
        $set: {
          ForgotOtp      : otp,
          ForgotOtpExp   : expiresAt,
          ForgotOtpUsed  : false,
          modifiedAt     : new Date(),
        },
      }
    );

    console.log(`📧 Forgot OTP for ${inputEmail}: ${otp}  (expires ${expiresAt.toISOString()})`);

    // ── Build & send email ────────────────────────────────────────────────────
    const storedEmail = String(user.RegEmailAddress || '').trim();
    const { subject, text, html } = forgotOtpTemplate({
      FullName : user.RegFullName || 'Customer',
      OTP      : otp,
      Email    : storedEmail,
      lang,
    });

    await transporter.sendMail({
      from   : `"${process.env.APP_NAME || 'Sigma Paints'}" <${process.env.SMTP_USER}>`,
      to     : storedEmail,
      subject,
      text,
      html,
    });

    return sendResponse(res, 200, 'OTP sent successfully.', { status: 'SENT' });
  } catch (err) {
    console.error('❌ sendForgotOtp error:', err);
    return sendResponse(res, 500, 'Failed to send OTP. Please try again.', null, String(err?.message || err));
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) POST /account/verifyForgotOtp
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyForgotOtp = async (req, res) => {
  try {
    const inputEmail   = String(req.body?.RegEmailAddress || '').trim();
    const inputOtp     = String(req.body?.otp             || '').trim();
    const newPassword  = String(req.body?.newPassword     || '').trim();

    // ── Validate input ────────────────────────────────────────────────────────
    if (!inputEmail || !inputOtp || !newPassword) {
      return sendResponse(res, 400, 'RegEmailAddress, otp, and newPassword are required.', null, 'MISSING_FIELDS');
    }
    if (!/^\d{4}$/.test(inputOtp)) {
      return sendResponse(res, 400, 'OTP must be 4 digits.', null, 'INVALID_OTP_FORMAT');
    }
    if (newPassword.length < 6) {
      return sendResponse(res, 400, 'Password must be at least 6 characters.', null, 'WEAK_PASSWORD');
    }

    const db    = await connectToMongoDB();
    const users = db.collection('tblreginfo');

    // ── Find user ─────────────────────────────────────────────────────────────
    let user = await users.findOne({ RegEmailAddress: inputEmail });
    if (!user) {
      user = await users.findOne({
        RegEmailAddress: { $regex: `^${escapeRegex(inputEmail)}$`, $options: 'i' },
      });
    }

    if (!user) {
      return sendResponse(res, 404, 'User not found.', null, 'USER_NOT_FOUND');
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    if (!user.ForgotOtp) {
      return sendResponse(res, 400, 'No OTP was requested. Please request a new one.', null, 'NO_OTP');
    }

    if (user.ForgotOtpUsed === true) {
      return sendResponse(res, 400, 'This OTP has already been used. Please request a new one.', null, 'OTP_ALREADY_USED');
    }

    if (new Date() > new Date(user.ForgotOtpExp)) {
      return sendResponse(res, 400, 'OTP has expired. Please request a new one.', null, 'OTP_EXPIRED');
    }

    if (String(user.ForgotOtp) !== inputOtp) {
      return sendResponse(res, 400, 'Invalid OTP. Please check and try again.', null, 'OTP_MISMATCH');
    }

    // ── Update password ───────────────────────────────────────────────────────
    const storedEmail = String(user.RegEmailAddress || '').trim();
    const newPwdKey   = makePwdKey(storedEmail, newPassword);

    await users.updateOne(
      { RegUserID: user.RegUserID },
      {
        $set: {
          RegPassword   : newPwdKey,
          ForgotOtpUsed : true,        // mark as consumed
          PwdResetAt    : new Date(),
          modifiedAt    : new Date(),
        },
      }
    );

    console.log(`✅ Password reset for ${storedEmail}`);

    return sendResponse(res, 200, 'Password updated successfully. Please sign in with your new password.', { status: 'OK' });
  } catch (err) {
    console.error('❌ verifyForgotOtp error:', err);
    return sendResponse(res, 500, 'Server error. Please try again.', null, String(err?.message || err));
  }
};
