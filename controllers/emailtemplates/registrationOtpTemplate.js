// controllers/emailtemplates/registrationOtpTemplate.js
// Builds the "verify your account" email sent right after registration.

const LOGO_URL =
  process.env.MAIL_LOGO_URL ||
  "https://cdn-hbplh.nitrocdn.com/DSoKKEUpkuXHKWBOHxmTTJqWRIdWLhWb/assets/images/optimized/rev-4bc013f/sigmapaints.com/wp-content/uploads/2019/02/Sigma-Paint_Logo-021.png";

const APP_NAME = process.env.APP_NAME || "Sigma Paints";
const APP_URL = process.env.APP_URL || "https://sigmapaints.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * @param {Object} ctx
 * @param {string} ctx.FullName
 * @param {string|number} ctx.OTP
 * @returns {{subject: string, text: string, html: string}}
 */
function registrationOtpTemplate({ FullName, OTP }) {
  const safeName = escapeHtml(FullName || "Customer");
  const safeOtp = escapeHtml(OTP || "");
  const year = new Date().getFullYear();

  const subject = `${APP_NAME} – Your verification code`;

  const text = [
    `Hello ${FullName || "Customer"},`,
    ``,
    `Thank you for registering with ${APP_NAME}.`,
    ``,
    `Your verification code is: ${OTP}`,
    ``,
    `Enter this code in the app to activate your account.`,
    `This code is valid for a limited time. Please do not share it with anyone.`,
    ``,
    `If you did not create this account, you can safely ignore this email.`,
    ``,
    `${APP_NAME} Team`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;">
  <!-- preheader: shown in inbox preview, hidden in body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your ${escapeHtml(APP_NAME)} verification code is ${safeOtp}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f8;">
    <tr>
      <td align="center" style="padding:28px 12px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e3e8ee;">

          <!-- HEADER / LOGO -->
          <tr>
            <td align="center" style="padding:28px 24px 18px 24px;background:#ffffff;border-bottom:1px solid #eef2f6;">
              <a href="${escapeHtml(APP_URL)}" target="_blank" style="text-decoration:none;">
                <img src="${escapeHtml(LOGO_URL)}"
                     alt="${escapeHtml(APP_NAME)}"
                     width="180"
                     style="display:block;width:180px;max-width:70%;height:auto;border:0;outline:none;" />
              </a>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:30px 34px 10px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:25px;color:#22354f;">
              <p style="margin:0 0 16px 0;">Hello <strong>${safeName}</strong>,</p>

              <p style="margin:0 0 20px 0;">
                Thank you for registering with ${escapeHtml(APP_NAME)}.
                Please use the verification code below to activate your account.
              </p>

              <div style="text-align:center;margin:26px 0;">
                <div style="display:inline-block;padding:16px 32px;background:#f5f8fb;border:1px solid #d9e3ec;border-radius:10px;">
                  <div style="font-size:11px;line-height:16px;color:#5d7186;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px;">
                    Verification Code
                  </div>
                  <div style="font-size:32px;line-height:40px;letter-spacing:8px;font-weight:800;color:#0b62b0;">
                    ${safeOtp}
                  </div>
                </div>
              </div>

              <p style="margin:0 0 10px 0;">
                Enter this code on the verification screen to complete your registration.
                Please do not share it with anyone.
              </p>

              <p style="margin:20px 0 0 0;font-size:13px;line-height:21px;color:#66758a;">
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center"
                style="padding:24px 24px 26px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#8494a6;border-top:1px solid #eef2f6;">
              &copy; ${year} ${escapeHtml(APP_NAME)}. All rights reserved.<br />
              This is an automated message, please do not reply.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

module.exports = {
  registrationOtpTemplate,
  escapeHtml,
};
