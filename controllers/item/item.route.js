const item = require("./item.controller");
const express = require("express");
const router = express.Router();
 const { protectAPI } = require("../middleware/auth");
router.post("/getItems", protectAPI,item.getItems);
router.post("/createItem", protectAPI,item.createItem);

module.exports = router;

