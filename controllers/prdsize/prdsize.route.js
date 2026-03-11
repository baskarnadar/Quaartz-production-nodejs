const prdsize = require("./prdsize.controller");
const express = require("express");
const router = express.Router(); 
  const { protectAPI } = require("../middleware/auth");
//Color Product
router.post("/getallproductsize", protectAPI,prdsize.getallproductsize); 
router.post("/createProductSize",protectAPI, prdsize.createProductSize); 
router.post("/delProductSize",protectAPI, prdsize.delProductSize); 
router.post("/getprdsize",protectAPI, prdsize.getprdsize); 
router.post("/updateprdsize", protectAPI,prdsize.updateprdsize); 
router.post("/getprdsizebyid",protectAPI, prdsize.getprdsizebyid); 

module.exports = router;

