// services/emailservice.js
// Sends a simple "Forgot Password" email with the new password

const nodemailer = require('nodemailer');

// Configure transporter from .env
// Recommended env:
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_SECURE=false
// SMTP_USER=...
// SMTP_PASS=...
// MAIL_FROM="Sigma Paints" <no-reply@sigmapaints.com>
// APP_URL=https://sigmapaints.com

const SMTP_HOST = String(process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').trim().toLowerCase() === 'true';
const SMTP_USER = String(process.env.SMTP_USER || '').trim();
const SMTP_PASS = String(process.env.SMTP_PASS || '').trim();

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true for 465, false for 587/STARTTLS
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  // Helps in some environments (optional)
  tls: {
    rejectUnauthorized: false,
  },
});

// Optional: verify transporter on startup (safe)
// Comment if you don't want it to run at boot time
transporter.verify((err, success) => {
  if (err) {
    console.error('❌ SMTP verify failed:', err?.message || err);
  } else {
    console.log('✅ SMTP transporter is ready');
  }
});

/**
 * Sends a forgot password email containing the new password.
 * @param {string} toEmail
 * @param {object} ctx - { fullName, newPassword, appName }
 */
async function sendForgotPasswordEmail(toEmail, ctx = {}) {
  const to = String(toEmail || '').trim().toLowerCase();
  if (!to) throw new Error('Recipient email is required');

  const fullName = String(ctx.fullName || 'Customer');
  const newPassword = String(ctx.newPassword || '');
  const appName = String(ctx.appName || 'Our App');

  if (!newPassword) throw new Error('newPassword is required');

  // ✅ Better default "from"
  // Use MAIL_FROM if provided, otherwise build it from APP_URL host
  const appUrl = String(process.env.APP_URL || 'https://example.com').trim();
  let host = 'example.com';
  try {
    host = new URL(appUrl).host || 'example.com';
  } catch (e) {
    host = 'example.com';
  }

  const from =
    String(process.env.MAIL_FROM || '').trim() ||
    `"${escapeHtml(appName)}" <no-reply@${host}>`;

  const subject = `${appName} – Password Reset`;

  const text = [
    `Hello ${fullName},`,
    ``,
    `You requested to reset your password.`,
    `Your new password is:`,
    ``,
    `    ${newPassword}`,
    ``,
    `Please log in and change your password immediately after signing in.`,
    ``,
    `If you did not request this password reset, please contact our support team.`,
    ``,
    `Thanks,`,
    `${appName} Team`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; color:#222;">
      <p>Hello <strong>${escapeHtml(fullName)}</strong>,</p>
      <p>You requested to reset your password.</p>
      <p>Your new password is:</p>
      <div style="font-size:20px; font-weight:bold; letter-spacing:2px; padding:10px 16px; border:1px dashed #888; display:inline-block; background:#f9f9f9;">
        ${escapeHtml(newPassword)}
      </div>
      <p style="margin-top:12px;">Please log in and change your password immediately after signing in.</p>
      <p>If you did not request this password reset, please contact our support team.</p>
      <p>Thanks,<br/>${escapeHtml(appName)} Team</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return info;
}

// Escape HTML to prevent injection
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  sendForgotPasswordEmail,
};