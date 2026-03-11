const banner = require("./banner.controller");
 const express = require("express");
const router = express.Router();
const { protectAPI } = require("../middleware/auth");
router.post("/getbannerlist",protectAPI, banner.getbannerlist);
router.post("/updatebanner", protectAPI,banner.updatebanner);
router.post("/createbanner", protectAPI,banner.createbanner); 
router.post("/deletebanner", protectAPI,banner.deletebanner);
router.post("/getbanner", protectAPI,banner.getbanner);
module.exports = router;

