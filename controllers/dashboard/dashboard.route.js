const DashBoard = require("./dashboard.controller");
const express = require("express");
const router = express.Router();
  const { protectAPI } = require("../middleware/auth");
router.post("/getDashBoardSummary",protectAPI, DashBoard.getDashBoardSummary);
 
module.exports = router;

