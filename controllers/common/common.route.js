const Common = require("./common.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../middleware/auth");
router.get("/getbanner", Common.getbanner);
router.post("/createBanner", Common.createBanner);

router.get("/getlang", Common.getlang);
router.post("/createLang", Common.createLang);
router.get("/getProduct", Common.getProduct);
router.get("/getColor", Common.getColor);  
router.post("/addCity", Common.addCity);
router.post("/getCity", Common.getCity);
router.post("/getstoreInfoByCityID", Common.getstoreInfoByCityID);
router.post("/menulist", Common.menulist);
router.post("/getadminemails", protectAPI,Common.getadminemails);
module.exports = router;

