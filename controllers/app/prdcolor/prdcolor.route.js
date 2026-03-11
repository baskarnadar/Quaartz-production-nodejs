const prdcolor = require("./prdcolor.controller");
const express = require("express");
const router = express.Router();

 const { protectAPI } = require("../../middleware/auth");
//Color Product

router.post("/getmaincolor", protectAPI,prdcolor.getmaincolor);
router.post("/getsubcolor",protectAPI, prdcolor.getsubcolor);
router.post("/getprdcolormatchlist",protectAPI, prdcolor.getprdcolormatchlist);
module.exports = router;

