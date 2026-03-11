const Cart = require("./cart.controller");
const express = require("express");
const router = express.Router();
 const { protectAPI } = require("../middleware/auth");
router.post("/getCartList", Cart.getCartList);
router.post("/addToCart",Cart.addToCart);  
router.post("/updateQtyToCart",Cart.updateQtyToCart);  
router.post("/removeProduct", Cart.removeProduct);  
module.exports = router;