const prdcolor = require("./prdcolor.controller");
const express = require("express");
const router = express.Router();

 const { protectAPI } = require("../../middleware/auth");
//Color Product

router.post("/getmaincolor",prdcolor.getmaincolor);
router.post("/getsubcolor", prdcolor.getsubcolor);
router.post("/getprdcolormatchlist", prdcolor.getprdcolormatchlist);
router.post("/changeorder", prdcolor.changeorder);
module.exports = router;

