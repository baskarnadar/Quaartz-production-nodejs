// middleware/auth.js
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET; // must be set in .env

function getToken(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  if (req.cookies?.Sigma_token) return req.cookies.Sigma_token;
  return null;
}

exports.protectAPI = (req, res, next) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: "Unauthorized: missing token" });

  if (!SECRET) {
    return res.status(500).json({ message: "Server error: JWT_SECRET not set" });
  }

  try {
    // ✅ Remove issuer/audience unless you also add them when signing
    const decoded = jwt.verify(token, SECRET, {
      algorithms: ["HS256"],
    });

    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized: invalid/expired token",
      error: err.name,
      details: err.message,
    });
  }
};

exports.requireUserTypes = (...allowed) => (req, res, next) => {
  const t = req.user?.usertype;
  if (!t || !allowed.includes(t)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  next();
};