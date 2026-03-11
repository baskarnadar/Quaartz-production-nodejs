 
const mainmenu = require("../../../controllers/admin/mainmenu/mainmenu.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../middleware/auth");
router.post("/getmainmenulist", protectAPI,mainmenu.getmainmenulist);
router.post("/updatemainmenu",protectAPI, mainmenu.updatemainmenu);
router.post("/createmainmenu",protectAPI, mainmenu.createmainmenu); 
router.post("/deletemainmenu",protectAPI, mainmenu.deletemainmenu);
router.post("/getmainmenu", protectAPI,mainmenu.getmainmenu);
module.exports = router;

