const Category = require("./category.controller");
const express = require("express");
const router = express.Router();
 const { protectAPI } = require("../middleware/auth");
router.post("/delCategorybyID",protectAPI, Category.delCategorybyID);
module.exports = router;

