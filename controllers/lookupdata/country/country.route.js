// controllers/lookupdata/country/country.route.js
const Country = require("./country.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../middleware/auth");

router.post("/getcountrylist", protectAPI, Country.getcountrylist);
router.post("/getallcountry", protectAPI, Country.getallcountry);
router.post("/getCountry", protectAPI, Country.getCountry);
router.post("/createCountry", protectAPI, Country.createCountry);
router.post("/updateCountry", protectAPI, Country.updateCountry);
router.post("/delCountry", protectAPI, Country.delCountry);

module.exports = router;
