const adminemail = require("../../../controllers/admin/adminemail/adminemail.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../../middleware/auth");
router.post("/getadminemaillist",protectAPI ,adminemail.getadminemaillist);
router.post("/getadminemail",protectAPI, adminemail.getadminemail);
router.post("/createadminemail", protectAPI,adminemail.createadminemail);
router.post("/updateadminemail", protectAPI,adminemail.updateadminemail);
router.post("/deleteadminemail", protectAPI,adminemail.deleteadminemail);

// Replaces the whole list in one call - useful for a single Save button.
router.post("/saveadminemails", protectAPI,adminemail.saveadminemails);

module.exports = router;
