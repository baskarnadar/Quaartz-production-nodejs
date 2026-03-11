const order = require("./order.controller");
const express = require("express");
const router = express.Router(); 
const { protectAPI } = require("../middleware/auth");
router.post("/getorder", protectAPI,order.getorder); 
router.post("/getorderbyorderrefno", protectAPI,order.getorderbyorderrefno); 
router.post("/getorderbyorderrefnonew", protectAPI,order.getorderbyorderrefnonew); 
router.post("/updateOrderStatus",protectAPI, order.updateOrderStatus); 
module.exports = router;

