const painter = require("./painter.controller");
const express = require("express");
const router = express.Router(); 
const { protectAPI } = require("../middleware/auth");
router.post("/getpainterlist",protectAPI, painter.getpainterlist); 
router.post("/getPainterInfo",protectAPI, painter.getPainterInfo); 
router.post("/createPainter", protectAPI,painter.createPainter); 
router.post("/updateAccStatus", protectAPI,painter.updateAccStatus); 
module.exports = router;

