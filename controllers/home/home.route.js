const Home = require("./home.controller");
const express = require("express");
const router = express.Router();
router.post("/getBanner", Home.getBanner);
router.post("/createBanner", Home.createBanner);

router.post("/getlang", Home.getLang);
router.post("/createLang", Home.createLang);

module.exports = router;

