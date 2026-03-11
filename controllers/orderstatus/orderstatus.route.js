const orderstatus = require("./orderstatus.controller");
 const express = require("express");
const router = express.Router();
const { protectAPI } = require("../middleware/auth");
router.post("/getorderstatusall",protectAPI, orderstatus.getorderstatusall);
router.post("/updateorderstatus", protectAPI,orderstatus.updateorderstatus);
router.post("/createorderstatus",protectAPI, orderstatus.createorderstatus); 
router.post("/delorderstatus", protectAPI,orderstatus.delorderstatus);
router.post("/getorderstatus", protectAPI,orderstatus.getorderstatus);
module.exports = router;

