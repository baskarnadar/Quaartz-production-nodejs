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

// ---------------------------------------------------------------------------
// Registration OTP email
// ---------------------------------------------------------------------------
const { registrationOtpTemplate } = require('../emailtemplates/registrationOtpTemplate');

/**
 * Sends the account-verification (OTP) email after a successful registration.
 * @param {string} toEmail
 * @param {object} ctx - { fullName, otp }
 */
async function sendRegistrationOtpEmail(toEmail, ctx = {}) {
  const to = String(toEmail || '').trim().toLowerCase();
  if (!to) throw new Error('Recipient email is required');

  const otp = String(ctx.otp ?? '').trim();
  if (!otp) throw new Error('otp is required');

  const appName = String(process.env.APP_NAME || 'Sigma Paints');

  const appUrl = String(process.env.APP_URL || 'https://sigmapaints.com').trim();
  let host = 'sigmapaints.com';
  try {
    host = new URL(appUrl).host || host;
  } catch (e) {
    // keep default host
  }

  const from =
    String(process.env.MAIL_FROM || '').trim() ||
    `"${appName}" <no-reply@${host}>`;

  const { subject, text, html } = registrationOtpTemplate({
    FullName: ctx.fullName,
    OTP: otp,
  });

  const info = await transporter.sendMail({ from, to, subject, text, html });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

// ---------------------------------------------------------------------------
// Order emails (customer + admin)
// ---------------------------------------------------------------------------
const {
  customerOrderTemplate,
  adminOrderTemplate,
} = require('../emailtemplates/orderEmailTemplate');

const ADMIN_EMAIL_COLLECTION = String(process.env.ADMIN_EMAIL_COLLECTION || 'tblsetting').trim();
const ADMIN_EMAIL_API =
  String(process.env.ADMIN_EMAIL_API || 'https://api.sigmapaints.com/api/common/getadminemails').trim();

function splitEmails(value) {
  return String(value || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}

/**
 * Resolves the admin recipient list.
 *
 * Order of preference:
 *   1. the getadminemails API   (POST - the source of truth)
 *   2. the tblsetting collection in Mongo (fallback if the API is down)
 *   3. ADMIN_EMAILS in .env               (last resort)
 *
 * Never throws - returns [] if nothing can be resolved.
 *
 * @param {import('mongodb').Db} [db]
 * @returns {Promise<string[]>}
 */
async function getAdminEmails(db) {
  // 1. the API -----------------------------------------------------------
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(ADMIN_EMAIL_API, {
      method: 'POST',                                   // <- POST, not GET
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const fromApi = rows.flatMap((row) => splitEmails(row?.adminemails));

    if (fromApi.length) return [...new Set(fromApi)];

    console.warn('ADMIN EMAIL API returned no usable addresses.');
  } catch (err) {
    console.error('ADMIN EMAIL API LOOKUP FAILED:', err?.message || err);
  }

  // 2. the database ------------------------------------------------------
  if (db) {
    try {
      const rows = await db.collection(ADMIN_EMAIL_COLLECTION).find({}).toArray();
      const fromDb = rows.flatMap((row) => splitEmails(row?.adminemails));
      if (fromDb.length) return [...new Set(fromDb)];
    } catch (err) {
      console.error('ADMIN EMAIL DB LOOKUP FAILED:', err?.message || err);
    }
  }

  // 3. environment -------------------------------------------------------
  const fromEnv = splitEmails(process.env.ADMIN_EMAILS);
  if (fromEnv.length) return [...new Set(fromEnv)];

  return [];
}

function resolveFrom() {
  const appName = String(process.env.APP_NAME || 'Sigma Paints');
  const appUrl = String(process.env.APP_URL || 'https://sigmapaints.com').trim();

  let host = 'sigmapaints.com';
  try {
    host = new URL(appUrl).host || host;
  } catch (e) {
    // keep default host
  }

  return String(process.env.MAIL_FROM || '').trim() || `"${appName}" <no-reply@${host}>`;
}

/**
 * Sends the order confirmation to the customer AND the notification to admins.
 * Each send is isolated - one failing does not stop the other.
 *
 * @param {object} ctx  - the order context (see orderEmailTemplate.js)
 * @param {object} opts - { customerEmail, adminEmails }
 * @returns {Promise<{customerSent:boolean, adminSent:boolean, adminRecipients:string[], errors:string[]}>}
 */
async function sendOrderEmails(ctx = {}, opts = {}) {
  const from = resolveFrom();
  const out = { customerSent: false, adminSent: false, adminRecipients: [], errors: [] };

  // --- customer -------------------------------------------------------
  const customerEmail = String(opts.customerEmail || ctx.CustomerEmail || '').trim().toLowerCase();

  if (!customerEmail) {
    out.errors.push('No customer email address on the order.');
  } else {
    try {
      const mail = customerOrderTemplate(ctx);
      await transporter.sendMail({
        from,
        to: customerEmail,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      out.customerSent = true;
    } catch (err) {
      console.error('ORDER CUSTOMER EMAIL ERROR:', err?.message || err);
      out.errors.push('Customer email failed.');
    }
  }

  // --- admins ---------------------------------------------------------
  const adminEmails = Array.isArray(opts.adminEmails) ? opts.adminEmails : [];
  out.adminRecipients = adminEmails;

  if (!adminEmails.length) {
    out.errors.push('No admin email addresses configured.');
  } else {
    try {
      const mail = adminOrderTemplate(ctx);
      await transporter.sendMail({
        from,
        to: adminEmails,
        replyTo: customerEmail || undefined,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      out.adminSent = true;
    } catch (err) {
      console.error('ORDER ADMIN EMAIL ERROR:', err?.message || err);
      out.errors.push('Admin email failed.');
    }
  }

  return out;
}

module.exports = {
  sendForgotPasswordEmail,
  sendRegistrationOtpEmail,
  getAdminEmails,
  sendOrderEmails,
};

