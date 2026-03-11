const Common = require("./common.controller");
const express = require("express");
const router = express.Router();
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
module.exports = router;

