const trending = require("./trending.controller");
const express = require("express");
const router = express.Router();

// ✅ App-facing — no protectAPI, same as the other app/* read endpoints.
router.post("/gettrendinginfo", trending.gettrendinginfo);

module.exports = router;
