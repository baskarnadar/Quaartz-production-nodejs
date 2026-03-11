const User = require("./user.controller");
const express = require("express");
const router = express.Router();

const { protectAPI } = require("../middleware/auth");
router.post("/getuserall",protectAPI, User.getuserall);
router.post("/getUser",protectAPI, User.getUser);
router.post("/createUser", protectAPI,User.createUser);
 router.post("/isUserValid",User.isUserValid);
 router.post("/deleteUser", protectAPI,User.deleteUser);

module.exports = router;

