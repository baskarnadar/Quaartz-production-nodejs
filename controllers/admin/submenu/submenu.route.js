 
const submenu = require("../../../controllers/admin/submenu/submenu.controller");
const express = require("express");
const router = express.Router();

router.post("/getsubmenulist", submenu.getsubmenulist);
router.post("/updatesubmenu", submenu.updatesubmenu);
router.post("/createsubmenu", submenu.createsubmenu); 
router.post("/deletesubmenu", submenu.deletesubmenu);
router.post("/getsubmenu", submenu.getsubmenu);

 
module.exports = router;

