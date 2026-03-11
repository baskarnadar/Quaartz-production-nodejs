const Subcolor = require("./subprdcolor.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../../middleware/auth");
// Color Product (SUB)
router.post("/getSubcolorlist", protectAPI,Subcolor.getSubcolorlist);
router.post("/editSubColor", protectAPI,Subcolor.editSubColor);
router.post("/addSubColor",protectAPI, Subcolor.addSubColor);
router.post("/delSubColor",protectAPI, Subcolor.delSubColor);
router.post("/updateSubColor",protectAPI, Subcolor.updateSubColor);

module.exports = router;
