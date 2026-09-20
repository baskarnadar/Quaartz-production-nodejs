// controllers/emailtemplates/registrationOtpTemplate.js
// Account-verification email sent after a successful registration.
// Table-based layout, inline CSS only - safe in Outlook, Gmail and Apple Mail.

const LOGO_URL =
  process.env.MAIL_LOGO_URL ||
  "https://cdn-hbplh.nitrocdn.com/DSoKKEUpkuXHKWBOHxmTTJqWRIdWLhWb/assets/images/optimized/rev-4bc013f/sigmapaints.com/wp-content/uploads/2019/02/Sigma-Paint_Logo-021.png";

const APP_NAME = process.env.APP_NAME || "Sigma Paints";
const APP_URL = process.env.APP_URL || "https://sigmapaints.com";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@sigmapaints.com";

// Brand palette
const BRAND = {
  blue: "#00529B",
  navy: "#12283F",
  ink: "#33475B",
  muted: "#7C8CA0",
  line: "#E4EAF0",
  tint: "#F3F7FB",
  page: "#EEF2F6",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Renders the OTP as separate character tiles.
function renderOtpDigits(otp) {
  return String(otp)
    .split("")
    .map(
      (char) => `<td style="padding:0 5px;">
                    <div class="otp-tile" style="width:52px;height:64px;background:#FFFFFF;border:1px solid ${BRAND.line};border-radius:8px;
                                font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:30px;line-height:64px;
                                font-weight:700;color:${BRAND.blue};text-align:center;">${escapeHtml(char)}</div>
                  </td>`
    )
    .join("");
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
    `Welcome to ${APP_NAME}.`,
    ``,
    `Your verification code is: ${OTP}`,
    ``,
    `Enter this code in the app to activate your account.`,
    `For your security, never share this code with anyone.`,
    ``,
    `Didn't create an account? You can safely ignore this email.`,
    `Need help? Contact us at ${SUPPORT_EMAIL}`,
    ``,
    `${APP_NAME}`,
    APP_URL,
  ].join("\n");

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, div, p, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    table { border-collapse:collapse !important; }
    a { text-decoration:none; }

    @media only screen and (max-width:620px) {
      .shell        { width:100% !important; }
      .pad          { padding-left:24px !important; padding-right:24px !important; }
      .otp-tile     { width:42px !important; height:56px !important; line-height:56px !important; font-size:24px !important; }
      .logo         { width:148px !important; }
      .h1           { font-size:21px !important; line-height:29px !important; }
    }
  </style>
</head>

<body style="margin:0;padding:0;background-color:${BRAND.page};">

  <!-- Inbox preview text -->
  <div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your ${escapeHtml(APP_NAME)} verification code is ${safeOtp}. Do not share it with anyone.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.page};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;
                      box-shadow:0 1px 3px rgba(18,40,63,0.08);">

          <!-- Brand bar -->
          <tr>
            <td style="height:5px;line-height:5px;font-size:0;background-color:${BRAND.blue};">&nbsp;</td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" class="pad" style="padding:34px 40px 26px 40px;">
              <a href="${escapeHtml(APP_URL)}" target="_blank">
                <img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(APP_NAME)}" width="186" class="logo"
                     style="display:block;width:186px;max-width:60%;height:auto;" />
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="pad" style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.line};">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- Heading + intro -->
          <tr>
            <td class="pad" style="padding:34px 40px 0 40px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              <h1 class="h1" style="margin:0 0 18px 0;font-size:24px;line-height:32px;font-weight:700;color:${BRAND.navy};">
                Verify your email address
              </h1>

              <p style="margin:0 0 14px 0;font-size:15px;line-height:25px;color:${BRAND.ink};">
                Hello <strong style="color:${BRAND.navy};">${safeName}</strong>,
              </p>

              <p style="margin:0;font-size:15px;line-height:25px;color:${BRAND.ink};">
                Welcome to ${escapeHtml(APP_NAME)}. Enter the verification code below to
                activate your account and get started.
              </p>
            </td>
          </tr>

          <!-- OTP -->
          <tr>
            <td class="pad" style="padding:30px 40px 4px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:${BRAND.tint};border:1px solid ${BRAND.line};border-radius:10px;">
                <tr>
                  <td align="center" style="padding:26px 16px 10px 16px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;
                             font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;
                             font-weight:700;color:${BRAND.muted};">
                    Verification code
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 16px 22px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>${renderOtpDigits(safeOtp)}</tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td class="pad" style="padding:22px 40px 0 40px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:3px;background-color:${BRAND.blue};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding-left:14px;font-size:14px;line-height:23px;color:${BRAND.ink};">
                    For your security, never share this code with anyone.
                    ${escapeHtml(APP_NAME)} staff will never ask you for it.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Help -->
          <tr>
            <td class="pad" style="padding:26px 40px 34px 40px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;
                       font-size:13px;line-height:22px;color:${BRAND.muted};">
              Didn't create this account? You can safely ignore this email &mdash; nothing will happen
              without the code above.<br />
              Need a hand? Write to
              <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${BRAND.blue};font-weight:600;">${escapeHtml(SUPPORT_EMAIL)}</a>.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" class="pad"
                style="padding:22px 40px 28px 40px;background-color:#FAFCFD;border-top:1px solid ${BRAND.line};
                       font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:${BRAND.muted};">
              <a href="${escapeHtml(APP_URL)}" target="_blank" style="color:${BRAND.blue};font-weight:600;">${escapeHtml(
    APP_URL.replace(/^https?:\/\//, "")
  )}</a><br />
              &copy; ${year} ${escapeHtml(APP_NAME)}. All rights reserved.<br />
              <span style="color:#A6B2C0;">This is an automated message &mdash; please do not reply.</span>
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
