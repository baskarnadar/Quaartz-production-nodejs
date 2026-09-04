const { rateLimit } = require("express-rate-limit");

// Reusable rate limiter for public/signup APIs.
// Maximum 5 requests from the same IP every 30 minutes.
const signupRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: "Too many requests. Please try again later.",
    data: null,
    error: true,
    totalCount: null,
  },
});

module.exports = {
  signupRateLimiter,
};
