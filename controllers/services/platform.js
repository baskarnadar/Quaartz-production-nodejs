// controllers/services/platform.js
// Normalises the device platform sent by the app: ANDROID | IOS | WEB | OTHER ("" when nothing sent)
function normalizePlatform(v) {
  const s = String(v || "").trim().toUpperCase();
  if (!s) return "";
  if (s.includes("ANDROID")) return "ANDROID";
  if (s === "IOS" || s.includes("IPHONE") || s.includes("IPAD") || s.includes("IOS")) return "IOS";
  if (s.includes("WEB") || s.includes("BROWSER")) return "WEB";
  return "OTHER";
}
module.exports = { normalizePlatform };
