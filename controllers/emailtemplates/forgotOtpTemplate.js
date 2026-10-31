// controllers/emailtemplates/forgotOtpTemplate.js
// Bilingual (EN / AR) OTP email for the "Forgot Password" flow.
// Table layout + inline CSS only → safe in Outlook, Gmail, Apple Mail.

const { escapeHtml } = require('./registrationOtpTemplate');

const LOGO_URL =
  process.env.MAIL_LOGO_URL ||
  'https://cdn-hbplh.nitrocdn.com/DSoKKEUpkuXHKWBOHxmTTJqWRIdWLhWb/assets/images/optimized/rev-4bc013f/sigmapaints.com/wp-content/uploads/2019/02/Sigma-Paint_Logo-021.png';

const APP_NAME      = process.env.APP_NAME      || 'Sigma Paints';
const APP_URL       = process.env.APP_URL       || 'https://sigmapaints.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@sigmapaints.com';

const BRAND = {
  blue : '#00529B',
  navy : '#12283F',
  ink  : '#33475B',
  muted: '#7C8CA0',
  line : '#E4EAF0',
  tint : '#F3F7FB',
  page : '#EEF2F6',
};

/* Render each OTP digit as a tile */
function renderOtpDigits(otp) {
  return String(otp).split('').map((char) =>
    `<td style="padding:0 5px;">
       <div style="width:52px;height:64px;background:#FFFFFF;border:1px solid ${BRAND.line};
                   border-radius:8px;font-family:'Segoe UI',Arial,sans-serif;font-size:30px;
                   line-height:64px;font-weight:700;color:${BRAND.blue};text-align:center;">
         ${escapeHtml(char)}
       </div>
     </td>`
  ).join('');
}

/* ─────────────────────────────────────────────────────────────────────────────
   ENGLISH template
───────────────────────────────────────────────────────────────────────────── */
function forgotOtpTemplateEn({ FullName, OTP, Email }) {
  const safeName  = escapeHtml(FullName || 'Customer');
  const safeOtp   = escapeHtml(String(OTP || ''));
  const safeEmail = escapeHtml(Email || '');
  const year      = new Date().getFullYear();

  const subject = `${APP_NAME} – Password Reset OTP`;

  const text = [
    `Hello ${FullName || 'Customer'},`,
    ``,
    `We received a request to reset the password for your ${APP_NAME} account${Email ? ` (${Email})` : ''}.`,
    ``,
    `Your OTP code is: ${OTP}`,
    `This code is valid for 10 minutes.`,
    ``,
    `If you did not request a password reset, please ignore this email or contact us at ${SUPPORT_EMAIL}.`,
    ``,
    `${APP_NAME}`,
    APP_URL,
  ].join('\n');

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" dir="ltr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset OTP – ${escapeHtml(APP_NAME)}</title>
  <!--[if mso]>
  <style>body,table,td,div,p,a{font-family:Arial,Helvetica,sans-serif!important;}</style>
  <![endif]-->
  <style>
    body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    table{border-collapse:collapse!important;}
    a{text-decoration:none;}
    @media only screen and (max-width:620px){
      .shell{width:100%!important;}
      .pad{padding-left:20px!important;padding-right:20px!important;}
      .otp-tile{width:40px!important;height:52px!important;font-size:24px!important;line-height:52px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};">

  <!-- Preview text -->
  <div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your ${escapeHtml(APP_NAME)} password-reset OTP is inside. Valid for 10 minutes.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${BRAND.page};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;
                      box-shadow:0 1px 3px rgba(18,40,63,0.08);">

          <!-- Brand bar -->
          <tr><td style="height:5px;line-height:5px;font-size:0;background-color:${BRAND.blue};">&nbsp;</td></tr>

          <!-- Logo -->
          <tr>
            <td align="center" class="pad" style="padding:34px 40px 26px;">
              <a href="${escapeHtml(APP_URL)}" target="_blank">
                <img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(APP_NAME)}" width="186"
                     style="display:block;width:186px;max-width:60%;height:auto;"/>
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

          <!-- Heading -->
          <tr>
            <td class="pad" style="padding:34px 40px 0;font-family:'Segoe UI',Arial,sans-serif;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:${BRAND.navy};">
                Password Reset Request
              </h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:25px;color:${BRAND.ink};">
                Hello <strong style="color:${BRAND.navy};">${safeName}</strong>,
              </p>
              <p style="margin:0;font-size:15px;line-height:25px;color:${BRAND.ink};">
                We received a request to reset the password for your ${escapeHtml(APP_NAME)} account
                ${safeEmail ? `<strong style="color:${BRAND.navy};">(${safeEmail})</strong>` : ''}.
                Use the OTP below to complete the reset. It is valid for <strong>10 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- OTP tiles -->
          <tr>
            <td class="pad" style="padding:28px 40px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:${BRAND.tint};border:1px solid ${BRAND.line};border-radius:10px;">
                <tr>
                  <td align="center" style="padding:24px 16px 10px;font-family:'Segoe UI',Arial,sans-serif;
                      font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${BRAND.muted};">
                    Your password-reset OTP
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 16px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>${renderOtpDigits(safeOtp)}</tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 16px 20px;font-family:'Segoe UI',Arial,sans-serif;
                      font-size:13px;color:${BRAND.muted};">
                    ⏱ This OTP expires in <strong>10 minutes</strong>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td class="pad" style="padding:22px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:3px;background-color:${BRAND.blue};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding-left:14px;font-size:14px;line-height:23px;color:${BRAND.ink};
                      font-family:'Segoe UI',Arial,sans-serif;">
                    Never share this OTP with anyone — ${escapeHtml(APP_NAME)} staff will never ask for it.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Not you? -->
          <tr>
            <td class="pad" style="padding:22px 40px 34px;font-family:'Segoe UI',Arial,sans-serif;
                font-size:13px;line-height:22px;color:${BRAND.muted};">
              Didn't request a password reset? Ignore this email or contact us at
              <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}"
                 style="color:${BRAND.blue};font-weight:600;">${escapeHtml(SUPPORT_EMAIL)}</a>.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" class="pad"
                style="padding:22px 40px 28px;background-color:#FAFCFD;border-top:1px solid ${BRAND.line};
                       font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:20px;color:${BRAND.muted};">
              <a href="${escapeHtml(APP_URL)}" target="_blank"
                 style="color:${BRAND.blue};font-weight:600;">${escapeHtml(APP_URL.replace(/^https?:\/\//, ''))}</a><br/>
              &copy; ${year} ${escapeHtml(APP_NAME)}. All rights reserved.<br/>
              <span style="color:#A6B2C0;">This is an automated message — please do not reply.</span>
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

/* ─────────────────────────────────────────────────────────────────────────────
   ARABIC template  (RTL, Tajawal font stack)
───────────────────────────────────────────────────────────────────────────── */
function forgotOtpTemplateAr({ FullName, OTP, Email }) {
  const safeName  = escapeHtml(FullName || 'عزيزي العميل');
  const safeOtp   = escapeHtml(String(OTP || ''));
  const safeEmail = escapeHtml(Email || '');
  const year      = new Date().getFullYear();

  const subject = `${APP_NAME} – رمز التحقق لإعادة تعيين كلمة المرور`;

  const text = [
    `مرحباً ${FullName || 'عزيزي العميل'}،`,
    ``,
    `تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك${Email ? ` (${Email})` : ''}.`,
    ``,
    `رمز التحقق الخاص بك: ${OTP}`,
    `صالح لمدة 10 دقائق.`,
    ``,
    `إذا لم تطلب إعادة التعيين، يُرجى تجاهل هذه الرسالة أو التواصل معنا على ${SUPPORT_EMAIL}.`,
    ``,
    `${APP_NAME}`,
    APP_URL,
  ].join('\n');

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="ar" dir="rtl">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>رمز إعادة تعيين كلمة المرور – ${escapeHtml(APP_NAME)}</title>
  <!--[if mso]>
  <style>body,table,td,div,p,a{font-family:Arial,sans-serif!important;}</style>
  <![endif]-->
  <style>
    body{margin:0;padding:0;direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    table{border-collapse:collapse!important;}
    a{text-decoration:none;}
    @media only screen and (max-width:620px){
      .shell{width:100%!important;}
      .pad{padding-right:20px!important;padding-left:20px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};direction:rtl;">

  <!-- Preview text -->
  <div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    رمز التحقق الخاص بك من ${escapeHtml(APP_NAME)} بداخل هذه الرسالة. صالح لمدة 10 دقائق.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${BRAND.page};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;
                      box-shadow:0 1px 3px rgba(18,40,63,0.08);">

          <!-- Brand bar -->
          <tr><td style="height:5px;line-height:5px;font-size:0;background-color:${BRAND.blue};">&nbsp;</td></tr>

          <!-- Logo -->
          <tr>
            <td align="center" class="pad" style="padding:34px 40px 26px;">
              <a href="${escapeHtml(APP_URL)}" target="_blank">
                <img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(APP_NAME)}" width="186"
                     style="display:block;width:186px;max-width:60%;height:auto;"/>
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

          <!-- Heading -->
          <tr>
            <td class="pad" style="padding:34px 40px 0;font-family:'Tajawal',Tahoma,Arial,sans-serif;direction:rtl;text-align:right;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:34px;font-weight:700;color:${BRAND.navy};">
                طلب إعادة تعيين كلمة المرور
              </h1>
              <p style="margin:0 0 12px;font-size:16px;line-height:28px;color:${BRAND.ink};">
                مرحباً <strong style="color:${BRAND.navy};">${safeName}</strong>،
              </p>
              <p style="margin:0;font-size:16px;line-height:28px;color:${BRAND.ink};">
                تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في ${escapeHtml(APP_NAME)}
                ${safeEmail ? `<strong style="color:${BRAND.navy};">(${safeEmail})</strong>` : ''}.
                استخدم رمز التحقق أدناه لإتمام العملية. صالح لمدة <strong>10 دقائق</strong>.
              </p>
            </td>
          </tr>

          <!-- OTP tiles -->
          <tr>
            <td class="pad" style="padding:28px 40px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:${BRAND.tint};border:1px solid ${BRAND.line};border-radius:10px;">
                <tr>
                  <td align="center" style="padding:24px 16px 10px;font-family:'Tajawal',Tahoma,Arial,sans-serif;
                      font-size:13px;letter-spacing:0;font-weight:700;color:${BRAND.muted};">
                    رمز التحقق الخاص بك
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 16px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>${renderOtpDigits(safeOtp)}</tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 16px 20px;font-family:'Tajawal',Tahoma,Arial,sans-serif;
                      font-size:14px;color:${BRAND.muted};">
                    ⏱ ينتهي صلاحية هذا الرمز خلال <strong>10 دقائق</strong>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td class="pad" style="padding:22px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:3px;background-color:${BRAND.blue};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding-right:14px;font-size:14px;line-height:25px;color:${BRAND.ink};
                      font-family:'Tajawal',Tahoma,Arial,sans-serif;direction:rtl;text-align:right;">
                    لا تشارك هذا الرمز مع أي شخص — لن يطلب منك فريق ${escapeHtml(APP_NAME)} هذا الرمز أبداً.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Not you? -->
          <tr>
            <td class="pad" style="padding:22px 40px 34px;font-family:'Tajawal',Tahoma,Arial,sans-serif;
                font-size:14px;line-height:24px;color:${BRAND.muted};direction:rtl;text-align:right;">
              لم تطلب إعادة التعيين؟ تجاهل هذه الرسالة أو تواصل معنا على
              <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}"
                 style="color:${BRAND.blue};font-weight:600;">${escapeHtml(SUPPORT_EMAIL)}</a>.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" class="pad"
                style="padding:22px 40px 28px;background-color:#FAFCFD;border-top:1px solid ${BRAND.line};
                       font-family:'Tajawal',Tahoma,Arial,sans-serif;font-size:13px;line-height:22px;color:${BRAND.muted};">
              <a href="${escapeHtml(APP_URL)}" target="_blank"
                 style="color:${BRAND.blue};font-weight:600;">${escapeHtml(APP_URL.replace(/^https?:\/\//, ''))}</a><br/>
              &copy; ${year} ${escapeHtml(APP_NAME)}. جميع الحقوق محفوظة.<br/>
              <span style="color:#A6B2C0;">هذه رسالة آلية — يُرجى عدم الرد عليها.</span>
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

/* ─────────────────────────────────────────────────────────────────────────────
   Dispatcher — picks template by lang ('en' | 'ar'), defaults to 'en'
───────────────────────────────────────────────────────────────────────────── */
function forgotOtpTemplate({ FullName, OTP, Email, lang = 'en' }) {
  if (String(lang).toLowerCase().startsWith('ar')) {
    return forgotOtpTemplateAr({ FullName, OTP, Email });
  }
  return forgotOtpTemplateEn({ FullName, OTP, Email });
}

module.exports = { forgotOtpTemplate, forgotOtpTemplateEn, forgotOtpTemplateAr };
