// controllers/reguser/reguser.route.js  — CMS > Registered Customers
const express = require("express");
const router = express.Router();
const RegUser = require("./reguser.controller");
const { protectAPI } = require("../middleware/auth");

router.post("/list", protectAPI, RegUser.list);
router.post("/detail", protectAPI, RegUser.detail);

module.exports = router;
