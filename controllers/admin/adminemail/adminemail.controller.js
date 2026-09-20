const { connectToMongoDB } = require("../../../database/mongodb");

// Helper function to send responses
function sendResponse(res, message, error, results, totalCount) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message,
    data: results,
    error,
    totalCount,
  });
}

const COLLECTION = "tblsetting";
const FIELD = "adminemails";

const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

function clean(value) {
  return String(value ?? "").trim().toLowerCase();
}

// "a@x.com, b@y.com" -> ["a@x.com", "b@y.com"]
function toList(value) {
  return String(value || "")
    .split(",")
    .map((e) => clean(e))
    .filter(Boolean);
}

// ["a@x.com", "b@y.com"] -> "a@x.com,b@y.com"
function toString_(list) {
  return [...new Set(list)].join(",");
}

/**
 * Loads the single settings document, creating it if it does not exist yet.
 * Everything else in this file works against that one document, which keeps
 * the shape the /api/common/getadminemails endpoint already returns.
 */
async function loadSettingDoc(db) {
  const collection = db.collection(COLLECTION);

  let doc = await collection.findOne({ [FIELD]: { $exists: true } });

  if (!doc) {
    const insert = await collection.insertOne({ [FIELD]: "" });
    doc = { _id: insert.insertedId, [FIELD]: "" };
  }

  return { collection, doc, list: toList(doc[FIELD]) };
}

async function saveList(collection, doc, list) {
  await collection.updateOne(
    { _id: doc._id },
    { $set: { [FIELD]: toString_(list), ModifyAt: new Date(), ModifyDate: new Date() } }
  );
}

// ---------------------------------------------------------------------------
// LIST
// ---------------------------------------------------------------------------
exports.getadminemaillist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const { list, doc } = await loadSettingDoc(db);

    const rows = list.map((email, index) => ({
      SNo: index + 1,
      adminemail: email,
    }));

    sendResponse(
      res,
      "Admin emails found.",
      null,
      { settingID: String(doc._id), adminemails: toString_(list), rows },
      rows.length
    );
  } catch (error) {
    console.error("Error in getadminemaillist:", error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET ONE
// ---------------------------------------------------------------------------
exports.getadminemail = async (req, res, next) => {
  try {
    const email = clean(req.body?.adminemail);

    if (!email) {
      return sendResponse(res, "adminemail is required.", true, null, 0);
    }

    const db = await connectToMongoDB();
    const { list } = await loadSettingDoc(db);

    if (!list.includes(email)) {
      return sendResponse(res, "Admin email not found.", true, null, 0);
    }

    sendResponse(res, "Admin email found.", null, { adminemail: email }, 1);
  } catch (error) {
    console.error("Error in getadminemail:", error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// CREATE  (append one address)
// ---------------------------------------------------------------------------
exports.createadminemail = async (req, res, next) => {
  try {
    const email = clean(req.body?.adminemail);

    if (!email) {
      return sendResponse(res, "adminemail is required.", true, null, 0);
    }

    if (!EMAIL_RE.test(email)) {
      return sendResponse(res, "Please enter a valid email address.", true, null, 0);
    }

    const db = await connectToMongoDB();
    const { collection, doc, list } = await loadSettingDoc(db);

    if (list.includes(email)) {
      return sendResponse(res, "This email is already in the list.", true, { status: "EXIST" }, 0);
    }

    const updated = [...list, email];
    await saveList(collection, doc, updated);

    sendResponse(
      res,
      "Admin email added successfully.",
      null,
      { adminemails: toString_(updated), rows: updated },
      updated.length
    );
  } catch (error) {
    console.error("Error in createadminemail:", error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// UPDATE  (replace one address with another)
// ---------------------------------------------------------------------------
exports.updateadminemail = async (req, res, next) => {
  try {
    const oldEmail = clean(req.body?.oldadminemail);
    const newEmail = clean(req.body?.adminemail);

    if (!oldEmail || !newEmail) {
      return sendResponse(res, "oldadminemail and adminemail are required.", true, null, 0);
    }

    if (!EMAIL_RE.test(newEmail)) {
      return sendResponse(res, "Please enter a valid email address.", true, null, 0);
    }

    const db = await connectToMongoDB();
    const { collection, doc, list } = await loadSettingDoc(db);

    const index = list.indexOf(oldEmail);

    if (index === -1) {
      return sendResponse(res, "No admin email found to update.", true, null, 0);
    }

    // Allow saving the same address unchanged, but block collisions.
    if (newEmail !== oldEmail && list.includes(newEmail)) {
      return sendResponse(res, "This email is already in the list.", true, { status: "EXIST" }, 0);
    }

    const updated = [...list];
    updated[index] = newEmail;

    await saveList(collection, doc, updated);

    sendResponse(
      res,
      "Admin email updated successfully.",
      null,
      { adminemails: toString_(updated), rows: updated },
      updated.length
    );
  } catch (error) {
    console.error("Error in updateadminemail:", error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// DELETE  (remove one address)
// ---------------------------------------------------------------------------
exports.deleteadminemail = async (req, res, next) => {
  try {
    const email = clean(req.body?.adminemail);

    if (!email) {
      return sendResponse(res, "adminemail is required.", true, null, 0);
    }

    const db = await connectToMongoDB();
    const { collection, doc, list } = await loadSettingDoc(db);

    if (!list.includes(email)) {
      return sendResponse(res, "No admin email found to delete.", true, null, 0);
    }

    const updated = list.filter((e) => e !== email);

    // Order notifications go nowhere with an empty list, so warn rather than
    // silently leaving the system unable to notify anyone.
    if (!updated.length) {
      return sendResponse(
        res,
        "Cannot delete the last admin email - order notifications would stop.",
        true,
        { status: "LAST-EMAIL" },
        1
      );
    }

    await saveList(collection, doc, updated);

    sendResponse(
      res,
      "Admin email deleted successfully.",
      null,
      { adminemails: toString_(updated), rows: updated },
      updated.length
    );
  } catch (error) {
    console.error("Error in deleteadminemail:", error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// REPLACE THE WHOLE LIST  (handy for a single "save" button in the UI)
// ---------------------------------------------------------------------------
exports.saveadminemails = async (req, res, next) => {
  try {
    const raw = req.body?.adminemails;

    const list = Array.isArray(raw) ? raw.map(clean).filter(Boolean) : toList(raw);

    const invalid = list.filter((e) => !EMAIL_RE.test(e));

    if (invalid.length) {
      return sendResponse(res, `Invalid email address: ${invalid[0]}`, true, { invalid }, 0);
    }

    if (!list.length) {
      return sendResponse(res, "At least one admin email is required.", true, null, 0);
    }

    const db = await connectToMongoDB();
    const { collection, doc } = await loadSettingDoc(db);

    await saveList(collection, doc, list);

    sendResponse(
      res,
      "Admin emails saved successfully.",
      null,
      { adminemails: toString_(list), rows: [...new Set(list)] },
      new Set(list).size
    );
  } catch (error) {
    console.error("Error in saveadminemails:", error);
    next(error);
  }
};
