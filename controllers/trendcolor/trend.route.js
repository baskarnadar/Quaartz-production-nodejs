const Trendcolor = require("./trend.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../middleware/auth");

// Trend Color Product


router.post("/gettrendcolorbyid", protectAPI, Trendcolor.gettrendcolorbyid);
router.post("/getalltrendcolorlist",  Trendcolor.getalltrendcolorlist);
router.post("/gettrendcolorlist", protectAPI, Trendcolor.gettrendcolorlist);
router.post("/edittrendcolor", protectAPI, Trendcolor.edittrendcolor);
router.post("/addtrendcolor", protectAPI, Trendcolor.addtrendcolor);
router.post("/deltrendcolor", protectAPI, Trendcolor.deltrendcolor);
router.post("/updatetrendcolor", protectAPI, Trendcolor.updatetrendcolor);
router.post("/changeorder", protectAPI, Trendcolor.changeorder);
module.exports = router;