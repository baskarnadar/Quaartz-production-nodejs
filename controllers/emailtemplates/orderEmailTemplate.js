// controllers/emailtemplates/orderEmailTemplate.js
//
// Two templates built on one shared layout:
//   customerOrderTemplate(ctx) -> "Thank you for your order"
//   adminOrderTemplate(ctx)    -> "Mr. X has ordered the products below"
//
// ctx = {
//   CustomerName, CustomerEmail, CustomerMobile, CustomerCity,
//   UserOrderNo, OrderRefNo, DeliveryType, StoreName, StoreAddress,
//   Items: [{ Name, ColorName, HexValue, SizeName, Qty, Amount, LineTotal, Thumb }],
//   OrderTotal, PlacedAt
// }

const LOGO_URL =
  process.env.MAIL_LOGO_URL ||
  "https://cdn-hbplh.nitrocdn.com/DSoKKEUpkuXHKWBOHxmTTJqWRIdWLhWb/assets/images/optimized/rev-4bc013f/sigmapaints.com/wp-content/uploads/2019/02/Sigma-Paint_Logo-021.png";

const APP_NAME = process.env.APP_NAME || "Sigma Paints";
const APP_URL = process.env.APP_URL || "https://sigmapaints.com";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@sigmapaints.com";
const CURRENCY = process.env.CURRENCY || "SAR";

const BRAND = {
  blue: "#00529B",
  navy: "#12283F",
  ink: "#33475B",
  muted: "#7C8CA0",
  line: "#E4EAF0",
  tint: "#F3F7FB",
  page: "#EEF2F6",
  highlight: "#FFF4D6",
  highlightEdge: "#F0C860",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  const n = Number(value || 0);
  return `${CURRENCY} ${n.toFixed(2)}`;
}

// The highlighted order reference block.
function refBlock(UserOrderNo, OrderRefNo) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${BRAND.highlight};border:1px solid ${BRAND.highlightEdge};border-radius:10px;">
    <tr>
      <td align="center" style="padding:20px 16px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#8A6A12;margin-bottom:8px;">
          Order Reference
        </div>
        <div style="font-size:28px;line-height:36px;font-weight:800;color:${BRAND.navy};letter-spacing:2px;">
          ${escapeHtml(UserOrderNo)}
        </div>
        <div style="font-size:12px;line-height:19px;color:#8A6A12;margin-top:8px;word-break:break-all;">
          Ref: ${escapeHtml(OrderRefNo)}
        </div>
      </td>
    </tr>
  </table>`;
}

// One row per ordered item.
function itemRows(items) {
  if (!Array.isArray(items) || !items.length) {
    return `<tr><td style="padding:16px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.muted};">
              No items found on this order.
            </td></tr>`;
  }

  return items
    .map((item, index) => {
      const swatch = item.HexValue
        ? `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;
                       background:${escapeHtml(item.HexValue)};border:1px solid ${BRAND.line};
                       vertical-align:middle;margin-right:6px;"></span>`
        : "";

      const meta = [
        item.ColorName ? `${swatch}${escapeHtml(item.ColorName)}` : "",
        item.SizeName ? escapeHtml(item.SizeName) : "",
      ]
        .filter(Boolean)
        .join(' <span style="color:#C4CDD8;">&bull;</span> ');

      return `
      <tr>
        <td style="padding:14px 10px 14px 0;border-bottom:1px solid ${BRAND.line};
                   font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.muted};
                   vertical-align:top;width:26px;">${index + 1}</td>

        <td style="padding:14px 10px;border-bottom:1px solid ${BRAND.line};
                   font-family:'Segoe UI',Arial,Helvetica,sans-serif;vertical-align:top;">
          <div style="font-size:14px;line-height:21px;font-weight:600;color:${BRAND.navy};">
            ${escapeHtml(item.Name || "Product")}
          </div>
          ${meta ? `<div style="font-size:12px;line-height:20px;color:${BRAND.muted};margin-top:3px;">${meta}</div>` : ""}
        </td>

        <td align="center" style="padding:14px 10px;border-bottom:1px solid ${BRAND.line};
                   font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};
                   vertical-align:top;white-space:nowrap;">${escapeHtml(item.Qty)}</td>

        <td align="right" style="padding:14px 0 14px 10px;border-bottom:1px solid ${BRAND.line};
                   font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;
                   color:${BRAND.navy};vertical-align:top;white-space:nowrap;">${escapeHtml(money(item.LineTotal))}</td>
      </tr>`;
    })
    .join("");
}

function itemsTable(items, orderTotal) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:0 0 10px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;
                 letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:${BRAND.muted};
                 border-bottom:2px solid ${BRAND.line};">&nbsp;</td>
      <td style="padding:0 10px 10px 10px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;
                 letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:${BRAND.muted};
                 border-bottom:2px solid ${BRAND.line};">Product</td>
      <td align="center" style="padding:0 10px 10px 10px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;
                 letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:${BRAND.muted};
                 border-bottom:2px solid ${BRAND.line};">Qty</td>
      <td align="right" style="padding:0 0 10px 10px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;
                 letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:${BRAND.muted};
                 border-bottom:2px solid ${BRAND.line};">Total</td>
    </tr>
    ${itemRows(items)}
    <tr>
      <td colspan="2" style="padding:16px 10px 0 0;"></td>
      <td align="center" style="padding:16px 10px 0 10px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;
                 font-size:13px;font-weight:700;color:${BRAND.ink};text-transform:uppercase;letter-spacing:1px;">Total</td>
      <td align="right" style="padding:16px 0 0 10px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;
                 font-size:18px;font-weight:800;color:${BRAND.blue};white-space:nowrap;">${escapeHtml(money(orderTotal))}</td>
    </tr>
  </table>`;
}

// Small label / value rows used for customer + delivery details.
function detailRows(pairs) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${pairs
      .filter((p) => p[1])
      .map(
        ([label, value]) => `
      <tr>
        <td style="padding:5px 12px 5px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;
                   font-size:13px;line-height:21px;color:${BRAND.muted};white-space:nowrap;vertical-align:top;width:34%;">
          ${escapeHtml(label)}
        </td>
        <td style="padding:5px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;
                   font-size:13px;line-height:21px;color:${BRAND.navy};font-weight:600;vertical-align:top;">
          ${escapeHtml(value)}
        </td>
      </tr>`
      )
      .join("")}
  </table>`;
}

// Shared shell.
function layout({ subject, heading, introHtml, bodyHtml, footerNote }) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style type="text/css">body, table, td, div, p, a { font-family: Arial, Helvetica, sans-serif !important; }</style>
  <![endif]-->
  <style type="text/css">
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    table { border-collapse:collapse !important; }
    a { text-decoration:none; }
    @media only screen and (max-width:620px) {
      .shell { width:100% !important; }
      .pad   { padding-left:22px !important; padding-right:22px !important; }
      .logo  { width:148px !important; }
      .h1    { font-size:21px !important; line-height:29px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};">

  <div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(subject)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.page};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" class="shell" width="620" cellpadding="0" cellspacing="0" border="0"
               style="width:620px;max-width:620px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;
                      box-shadow:0 1px 3px rgba(18,40,63,0.08);">

          <tr><td style="height:5px;line-height:5px;font-size:0;background-color:${BRAND.blue};">&nbsp;</td></tr>

          <tr>
            <td align="center" class="pad" style="padding:32px 40px 24px 40px;">
              <a href="${escapeHtml(APP_URL)}" target="_blank">
                <img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(APP_NAME)}" width="180" class="logo"
                     style="display:block;width:180px;max-width:58%;height:auto;" />
              </a>
            </td>
          </tr>

          <tr>
            <td class="pad" style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:1px;line-height:1px;font-size:0;background-color:${BRAND.line};">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pad" style="padding:32px 40px 0 40px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              <h1 class="h1" style="margin:0 0 16px 0;font-size:24px;line-height:32px;font-weight:700;color:${BRAND.navy};">
                ${heading}
              </h1>
              ${introHtml}
            </td>
          </tr>

          ${bodyHtml}

          <tr>
            <td align="center" class="pad"
                style="padding:22px 40px 28px 40px;background-color:#FAFCFD;border-top:1px solid ${BRAND.line};
                       font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:${BRAND.muted};">
              ${footerNote ? `${footerNote}<br />` : ""}
              <a href="${escapeHtml(APP_URL)}" target="_blank" style="color:${BRAND.blue};font-weight:600;">${escapeHtml(
    APP_URL.replace(/^https?:\/\//, "")
  )}</a><br />
              &copy; ${year} ${escapeHtml(APP_NAME)}. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function plainItems(items) {
  if (!Array.isArray(items) || !items.length) return "  (no items)";
  return items
    .map(
      (i, n) =>
        `  ${n + 1}. ${i.Name || "Product"}` +
        `${i.ColorName ? ` / ${i.ColorName}` : ""}` +
        `${i.SizeName ? ` / ${i.SizeName}` : ""}` +
        ` x ${i.Qty} = ${money(i.LineTotal)}`
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// CUSTOMER
// ---------------------------------------------------------------------------
function customerOrderTemplate(ctx = {}) {
  const {
    CustomerName,
    UserOrderNo,
    OrderRefNo,
    DeliveryType,
    StoreName,
    StoreAddress,
    Items = [],
    OrderTotal = 0,
    PlacedAt,
  } = ctx;

  const subject = `${APP_NAME} – Order ${UserOrderNo} confirmed`;

  const introHtml = `
    <p style="margin:0 0 14px 0;font-size:15px;line-height:25px;color:${BRAND.ink};">
      Hello <strong style="color:${BRAND.navy};">${escapeHtml(CustomerName || "Customer")}</strong>,
    </p>
    <p style="margin:0;font-size:15px;line-height:25px;color:${BRAND.ink};">
      Thank you for your order. We have received it and our team is getting it ready.
      Please quote the reference below in any correspondence.
    </p>`;

  const bodyHtml = `
    <tr><td class="pad" style="padding:26px 40px 0 40px;">${refBlock(UserOrderNo, OrderRefNo)}</td></tr>

    <tr>
      <td class="pad" style="padding:30px 40px 0 40px;">
        <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.2px;
                    text-transform:uppercase;font-weight:700;color:${BRAND.muted};margin-bottom:12px;">
          Your items
        </div>
        ${itemsTable(Items, OrderTotal)}
      </td>
    </tr>

    <tr>
      <td class="pad" style="padding:28px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:${BRAND.tint};border:1px solid ${BRAND.line};border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.2px;
                          text-transform:uppercase;font-weight:700;color:${BRAND.muted};margin-bottom:10px;">
                Delivery details
              </div>
              ${detailRows([
                ["Method", DeliveryType],
                ["Store", StoreName],
                ["Address", StoreAddress],
                ["Placed on", PlacedAt],
              ])}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td class="pad" style="padding:26px 40px 34px 40px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;
                 font-size:13px;line-height:22px;color:${BRAND.muted};">
        Questions about this order? Write to
        <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${BRAND.blue};font-weight:600;">${escapeHtml(
    SUPPORT_EMAIL
  )}</a> and quote ${escapeHtml(UserOrderNo)}.
      </td>
    </tr>`;

  const text = [
    `Hello ${CustomerName || "Customer"},`,
    ``,
    `Thank you for your order.`,
    ``,
    `ORDER REFERENCE: ${UserOrderNo}`,
    `Ref: ${OrderRefNo}`,
    ``,
    `Items:`,
    plainItems(Items),
    ``,
    `Total: ${money(OrderTotal)}`,
    DeliveryType ? `Method: ${DeliveryType}` : "",
    StoreName ? `Store: ${StoreName}` : "",
    ``,
    `Questions? ${SUPPORT_EMAIL}`,
    `${APP_NAME} - ${APP_URL}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    subject,
    text,
    html: layout({
      subject,
      heading: "Your order is confirmed",
      introHtml,
      bodyHtml,
      footerNote: "This is an automated message &mdash; please do not reply.",
    }),
  };
}

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------
function adminOrderTemplate(ctx = {}) {
  const {
    CustomerName,
    CustomerEmail,
    CustomerMobile,
    CustomerCity,
    UserOrderNo,
    OrderRefNo,
    DeliveryType,
    StoreName,
    StoreAddress,
    Items = [],
    OrderTotal = 0,
    PlacedAt,
  } = ctx;

  // Honorific requested by the business. Remove or make dynamic if you
  // start capturing the customer's title / gender at registration.
  const displayName = `Mr. ${CustomerName || "Customer"}`;

  const subject = `New order ${UserOrderNo} from ${CustomerName || "a customer"}`;

  const introHtml = `
    <p style="margin:0 0 6px 0;font-size:16px;line-height:26px;color:${BRAND.ink};">
      <strong style="color:${BRAND.navy};">${escapeHtml(displayName)}</strong> has ordered the products below.
    </p>
    <p style="margin:0;font-size:14px;line-height:23px;color:${BRAND.muted};">
      Please review and process this order in the admin panel.
    </p>`;

  const bodyHtml = `
    <tr><td class="pad" style="padding:24px 40px 0 40px;">${refBlock(UserOrderNo, OrderRefNo)}</td></tr>

    <tr>
      <td class="pad" style="padding:28px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:${BRAND.tint};border:1px solid ${BRAND.line};border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.2px;
                          text-transform:uppercase;font-weight:700;color:${BRAND.muted};margin-bottom:10px;">
                Customer
              </div>
              ${detailRows([
                ["Name", CustomerName],
                ["Email", CustomerEmail],
                ["Mobile", CustomerMobile],
                ["City", CustomerCity],
              ])}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td class="pad" style="padding:26px 40px 0 40px;">
        <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.2px;
                    text-transform:uppercase;font-weight:700;color:${BRAND.muted};margin-bottom:12px;">
          Ordered items
        </div>
        ${itemsTable(Items, OrderTotal)}
      </td>
    </tr>

    <tr>
      <td class="pad" style="padding:26px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:${BRAND.tint};border:1px solid ${BRAND.line};border-radius:10px;">
          <tr>
            <td style="padding:20px 22px;">
              <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.2px;
                          text-transform:uppercase;font-weight:700;color:${BRAND.muted};margin-bottom:10px;">
                Fulfilment
              </div>
              ${detailRows([
                ["Method", DeliveryType],
                ["Store", StoreName],
                ["Address", StoreAddress],
                ["Placed on", PlacedAt],
              ])}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr><td class="pad" style="padding:0 40px 34px 40px;">&nbsp;</td></tr>`;

  const text = [
    `${displayName} has ordered the products below.`,
    ``,
    `ORDER REFERENCE: ${UserOrderNo}`,
    `Ref: ${OrderRefNo}`,
    ``,
    `Customer: ${CustomerName || "-"}`,
    `Email: ${CustomerEmail || "-"}`,
    `Mobile: ${CustomerMobile || "-"}`,
    `City: ${CustomerCity || "-"}`,
    ``,
    `Items:`,
    plainItems(Items),
    ``,
    `Total: ${money(OrderTotal)}`,
    DeliveryType ? `Method: ${DeliveryType}` : "",
    StoreName ? `Store: ${StoreName}` : "",
    PlacedAt ? `Placed on: ${PlacedAt}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    subject,
    text,
    html: layout({
      subject,
      heading: "New order received",
      introHtml,
      bodyHtml,
      footerNote: "Internal notification.",
    }),
  };
}

module.exports = {
  customerOrderTemplate,
  adminOrderTemplate,
  escapeHtml,
};
