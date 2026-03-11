const Checkout = require("./checkout.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../middleware/auth");
router.post("/checkout",protectAPI, Checkout.checkout);
module.exports = router;

