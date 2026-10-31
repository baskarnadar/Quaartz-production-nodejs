// controllers/account/account.route.js
const account    = require('./account.controller');
const forgotpwd  = require('./forgotpwd.controller');   // ← NEW
const express    = require('express');
const router     = express.Router();
const { protectAPI } = require('../middleware/auth');

router.post('/getaccountinfo',   protectAPI, account.getaccountinfo);
router.post('/regaccount',                   account.regaccount);
router.post('/verifyotp',                    account.verifyotp);
router.post('/accountSingin',                account.accountSingin);
router.post('/updateaccount',   protectAPI,  account.updateaccount);
router.post('/deleteaccount',   protectAPI,  account.deleteaccount);
router.post('/signin',                       account.signin);
router.post('/accountforgotpwd',             account.accountforgotpwd);   // old (sends new password)

// ── NEW OTP-based password reset ──────────────────────────────────────────────
router.post('/sendForgotOtp',                forgotpwd.sendForgotOtp);    // step 1 – send OTP to email
router.post('/verifyForgotOtp',              forgotpwd.verifyForgotOtp);  // step 2 – verify OTP + set new password

module.exports = router;
