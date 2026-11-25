const setting = require("./setting.controller");
const express = require("express");
const router = express.Router();
//Color Product
  const { protectAPI } = require("../middleware/auth");
router.post("/modifyAppHomeIconStatus", protectAPI,setting.modifyAppHomeIconStatus);
router.post("/getAllHomeIcon",protectAPI, setting.getAllHomeIcon);
// App display settings (show / hide product description, specification, registration country/city)
router.post("/getAppDisplaySetting", setting.getAppDisplaySetting);
router.post("/saveAppDisplaySetting", protectAPI, setting.saveAppDisplaySetting);
module.exports = router;

