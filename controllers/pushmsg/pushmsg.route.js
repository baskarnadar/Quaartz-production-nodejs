// controllers/pushmsg/pushmsg.route.js
const express = require("express");
const router = express.Router();

const pushmessage = require("./pushmsg.controller");
const { protectAPI } = require("../middleware/auth");

// POST /admindata/pushmsg/sendmsg
router.post("/list", protectAPI, pushmessage.list);
router.post("/sendmsg", pushmessage.sendmsg);
router.post("/saveToken", pushmessage.saveToken);
router.post("/deleteToken", protectAPI, pushmessage.deleteToken);
module.exports = router;
