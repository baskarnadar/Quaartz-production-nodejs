const Maincolor = require("./mainprdcolor.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../../middleware/auth");
//Color Product
router.post("/getMaincolorlist", protectAPI,Maincolor.getMaincolorlist);
router.post("/editMainColor",protectAPI, Maincolor.editMainColor);
router.post("/addMainColor", protectAPI,Maincolor.addMainColor);
router.post("/delMainColor", protectAPI,Maincolor.delMainColor);
router.post("/updateMainColor", protectAPI,Maincolor.updateMainColor);
router.post("/changeorder",protectAPI, Maincolor.changeorder);
module.exports = router;

