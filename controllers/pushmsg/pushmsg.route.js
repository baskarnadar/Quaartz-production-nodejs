// controllers/pushmsg/pushmsg.route.js
const express = require("express");
const router = express.Router();

const pushmessage = require("./pushmsg.controller");
const { protectAPI } = require("../middleware/auth");

// ---- CMS ----
router.post("/list", protectAPI, pushmessage.list);              // token list (filter by group / country / city)
router.post("/summary", protectAPI, pushmessage.summary);        // counts: registered / non-registered / by country / by city
router.post("/sendToGroup", protectAPI, pushmessage.sendToGroup); // send to a whole target group
router.post("/sendmsg", pushmessage.sendmsg);                    // send to selected tokens
router.post("/deleteToken", protectAPI, pushmessage.deleteToken);

// ---- Mobile app ----
router.post("/saveToken", pushmessage.saveToken);                     // every app start (anonymous)
router.post("/linkTokenToUser", protectAPI, pushmessage.linkTokenToUser); // after registration OTP / login (JWT)

module.exports = router;
