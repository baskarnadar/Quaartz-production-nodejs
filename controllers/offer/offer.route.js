const offer = require("./offer.controller");
 const express = require("express");
const router = express.Router();
const { protectAPI } = require("../middleware/auth");
router.post("/getoffers", protectAPI,offer.getoffers);
router.post("/updateofferbyID", protectAPI,offer.updateofferbyID);
router.post("/createOffer", protectAPI,offer.createOffer); 
router.post("/delofferByID", protectAPI,offer.delofferByID);
router.post("/getoffersbyID",protectAPI, offer.getoffersbyID);
module.exports = router;

