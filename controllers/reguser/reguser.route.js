// controllers/reguser/reguser.route.js  — CMS > Registered Customers
const express = require("express");
const router = express.Router();
const RegUser = require("./reguser.controller");
const { protectAPI } = require("../middleware/auth");

router.post("/list", protectAPI, RegUser.list);
router.post("/detail", protectAPI, RegUser.detail);
router.post("/delete", protectAPI, RegUser.remove);           // soft delete -> _delete_tblreginfo
router.post("/deletedList", protectAPI, RegUser.deletedList); // list of deleted users
router.post("/restore", protectAPI, RegUser.restore);         // put a deleted user back

module.exports = router;
