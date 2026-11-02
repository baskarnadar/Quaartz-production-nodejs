const prdcolor = require("./prdcolor.controller");
const express = require("express");
const router = express.Router();

 const { protectAPI } = require("../../middleware/auth");
//Color Product

router.post("/getmaincolor",prdcolor.getmaincolor);
router.post("/getsubcolor", prdcolor.getsubcolor);
router.post("/getprdcolormatchlist", prdcolor.getprdcolormatchlist);
router.post("/getnearhexcolor", prdcolor.getnearhexcolor);

// ✅ NEW: "Color By Trend" screen (Year tabs + tblPrdSpecialColor swatches)
router.post("/gettrendyearlist", prdcolor.gettrendyearlist);
router.post("/gettrendcolorlist", prdcolor.gettrendcolorlist);

module.exports = router;

