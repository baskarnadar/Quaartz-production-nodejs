const page = require("./page.controller");
const express = require("express");
const router = express.Router();
 const { protectAPI } = require("../middleware/auth");
router.post("/createpage", protectAPI,page.createpage);
router.post("/getpageinfo",protectAPI, page.getpageinfo);
module.exports = router;

