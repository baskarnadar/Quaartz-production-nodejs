const prdcolor = require("./prdcolor.controller");
const express = require("express");
const router = express.Router();

  const { protectAPI } = require("../middleware/auth");
//Color Product

router.post("/getprdcolorbycolorcode", prdcolor.getprdcolorbycolorcode);
router.post("/getprdcolorbyid",protectAPI, prdcolor.getprdcolorbyid);
router.post("/getprdcolorlist", protectAPI,prdcolor.getprdcolorlist);
router.post("/editPrdColor",protectAPI, prdcolor.editPrdColor);
router.post("/addPrdColor", protectAPI,prdcolor.addPrdColor);
router.post("/delPrdColor",protectAPI, prdcolor.delPrdColor);

module.exports = router;

