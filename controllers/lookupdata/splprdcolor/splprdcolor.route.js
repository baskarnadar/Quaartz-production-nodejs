const Splcolor = require("./splprdcolor.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../middleware/auth");
//Color Product
router.post("/getSplcolorlist", protectAPI,Splcolor.getSplcolorlist);
router.post("/editSplColor",protectAPI, Splcolor.editSplColor);
router.post("/addSplColor", protectAPI,Splcolor.addSplColor);
router.post("/delSplColor", protectAPI,Splcolor.delSplColor);
router.post("/updateSplColor", protectAPI,Splcolor.updateSplColor);
module.exports = router;

