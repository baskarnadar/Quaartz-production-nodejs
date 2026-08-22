const Year = require("./year.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../middleware/auth");

router.post("/getyearlist", protectAPI, Year.getyearlist);
router.post("/updateYear", protectAPI, Year.updateYear);
router.post("/createYear", protectAPI, Year.createYear);
router.post("/delYear", protectAPI, Year.delYear);
router.post("/getYear", protectAPI, Year.getYear);

module.exports = router;
