const setting = require("./setting.controller");
const express = require("express");
const router = express.Router();
//Color Product
  const { protectAPI } = require("../middleware/auth");
router.post("/modifyAppHomeIconStatus", protectAPI,setting.modifyAppHomeIconStatus);
router.post("/getAllHomeIcon",protectAPI, setting.getAllHomeIcon);
module.exports = router;

