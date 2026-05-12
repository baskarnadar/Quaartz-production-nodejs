const SplCategory = require("./splprdcategory.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../middleware/auth");

// ✅ SPECIAL PRODUCT CATEGORY ROUTES
router.post("/getSplCategoryList", protectAPI, SplCategory.getSplCategoryList);
router.post("/editSplCategory", protectAPI, SplCategory.editSplCategory);
router.post("/addSplCategory", protectAPI, SplCategory.addSplCategory);
router.post("/delSplCategory", protectAPI, SplCategory.delSplCategory);
router.post("/updateSplCategory", protectAPI, SplCategory.updateSplCategory);

module.exports = router;