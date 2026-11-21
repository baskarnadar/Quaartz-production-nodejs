// config/appConfig.js
//
// Shared business constants used across controllers / email templates.
// Never hardcode these values inline - read them from here so there is a
// single place to change the VAT rate (or anything else added later).

// VAT_RATE can be overridden via the VAT_RATE env var (e.g. VAT_RATE=0.15).
// Defaults to 15% to match the current KSA VAT rate.
const VAT_RATE = Number(process.env.VAT_RATE || 0.15);

module.exports = {
  VAT_RATE,
};
