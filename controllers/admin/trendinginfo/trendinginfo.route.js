const trendinginfo = require("./trendinginfo.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../middleware/auth");

router.post("/gettrendinginfo", protectAPI, trendinginfo.gettrendinginfo);
router.post("/savetrendinginfo", protectAPI, trendinginfo.savetrendinginfo);

module.exports = router;
