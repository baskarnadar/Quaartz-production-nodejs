const account = require("./account.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../middleware/auth");

router.post("/getaccountinfo", protectAPI,account.getaccountinfo);
router.post("/regaccount", account.regaccount);
router.post("/verifyotp", account.verifyotp);
router.post("/accountSingin", account.accountSingin);
router.post("/updateaccount", protectAPI,account.updateaccount);
router.post("/deleteaccount", protectAPI,account.deleteaccount);
router.post("/signin", account.signin);
router.post("/accountforgotpwd", account.accountforgotpwd);
module.exports = router;

