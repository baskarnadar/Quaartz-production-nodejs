const adminemail = require("../../../controllers/admin/adminemail/adminemail.controller");
const express = require("express");
const router = express.Router();

router.post("/getadminemaillist", adminemail.getadminemaillist);
router.post("/getadminemail", adminemail.getadminemail);
router.post("/createadminemail", adminemail.createadminemail);
router.post("/updateadminemail", adminemail.updateadminemail);
router.post("/deleteadminemail", adminemail.deleteadminemail);

// Replaces the whole list in one call - useful for a single Save button.
router.post("/saveadminemails", adminemail.saveadminemails);

module.exports = router;
