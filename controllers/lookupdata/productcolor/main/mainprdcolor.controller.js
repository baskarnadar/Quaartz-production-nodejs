// mainprdcolor.controller.js
const { connectToMongoDB } = require("../../../../database/mongodb");
const { generateUniqueId } = require("../../../../controllers/operation/operation");

// Helper function to send responses (kept same as your style)
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message: message,
    data: results,
    error: error,
  });
}

// ------------------------------------------------------------
// GET: by ProductID  ✅ UPDATED: ProductID removed
// ------------------------------------------------------------
exports.getprdcolorbyid = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    // With ProductID removed, return full list (same collection)
    const collection = db.collection("tblMainColorCode");
    const documents = await collection.find().toArray();

    return sendResponse(res, "Color fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// ------------------------------------------------------------
// GET: by MainColorCode (UPDATED: same field name)
// ------------------------------------------------------------
exports.getprdcolorbycolorcode = async (req, res, next) => {
  try {
    const { MainColorCode } = req.body || {};
    const db = await connectToMongoDB();

    if (!MainColorCode) {
      return sendResponse(res, "MainColorCode is required.", "validation_error", null);
    }

    const collection = db.collection("tblMainColorCode");
    const documents = await collection.find({ MainColorCode: String(MainColorCode).trim() }).toArray();

    return sendResponse(res, "Color fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// ------------------------------------------------------------
// GET: list
// ------------------------------------------------------------
exports.getMaincolorlist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblMainColorCode");
    const documents = await collection.find().toArray();

    return sendResponse(res, "Color fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// ------------------------------------------------------------
// FETCH FOR EDIT (UPDATED: same field name)
// Frontend will send MainColorCodeID
// ------------------------------------------------------------
exports.editMainColor = async (req, res, next) => {
  try {
    const { MainColorCodeID } = req.body || {};

    if (!MainColorCodeID) {
      return sendResponse(res, "MainColorCodeID is required.", "validation_error", null);
    }

    const db = await connectToMongoDB();

    const existingData = await db
      .collection("tblMainColorCode")
      .findOne({ MainColorCodeID: String(MainColorCodeID) });

    if (!existingData) {
      return sendResponse(res, "Main color not found.", "not_found", null);
    }

    return sendResponse(res, "Main color fetched successfully.", null, existingData);
  } catch (error) {
    console.error("editPrdColor (FETCH) error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// ADD (OK - already same field name)
// ------------------------------------------------------------
exports.addMainColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      MainColorCode,
      MainColorType,
      EnMainColorName,
      ArMainColorName,
      IsDataStatus,
      CreatedBy,
      ModifyBy,
    } = req.body || {};

    if (!MainColorCode || !MainColorType || !EnMainColorName || !ArMainColorName) {
      return sendResponse(
        res,
        "Please provide: MainColorCode, MainColorType, EnMainColorName, ArMainColorName",
        "validation_error",
        null
      );
    }

    const now = new Date();

    const MainColorItem = {
      MainColorCodeID: generateUniqueId(),
      MainColorCode: String(MainColorCode).trim(),
      MainColorType: String(MainColorType).trim(),
      EnMainColorName: String(EnMainColorName).trim(),
      ArMainColorName: String(ArMainColorName).trim(),
      createdAt: now,
      modifiedAt: now,
      createdBy: CreatedBy || "USER",
      updatedBy: ModifyBy || "USER",
      IsDataStatus: Number(IsDataStatus ?? 1),
    };

    const result = await db.collection("tblMainColorCode").insertOne(MainColorItem);

    return sendResponse(res, "Main Color inserted successfully.", null, {
      insertedId: result?.insertedId || null,
      ...MainColorItem,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// ------------------------------------------------------------
// DELETE (UPDATED: same field name)
// Frontend will send MainColorCodeID
// ------------------------------------------------------------
exports.delMainColor = async (req, res, next) => {
  try {
    const { MainColorCodeID } = req.body || {};
    const db = await connectToMongoDB();

    if (!MainColorCodeID) {
      return sendResponse(res, "MainColorCodeID is required.", "validation_error", null);
    }

    const filter = { MainColorCodeID: String(MainColorCodeID) };

    const result = await db.collection("tblMainColorCode").deleteOne(filter);

    if (result.deletedCount === 0) {
      return sendResponse(res, "Main color not found or delete failed.", "not_found", null);
    }

    return sendResponse(res, "Main color deleted successfully.", null, {
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// ------------------------------------------------------------
// UPDATE (UPDATED: same field names)
// Frontend will send MainColorCodeID + MainColor... fields
// ------------------------------------------------------------
 // UPDATE (using updateOne)
exports.updateMainColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      MainColorCodeID,
      MainColorCode,
      MainColorType,
      EnMainColorName,
      ArMainColorName,
      IsDataStatus,
      ModifyBy,
    } = req.body || {};

    const idStr = String(MainColorCodeID || "").trim();
    console.log("Incoming MainColorCodeID:", idStr);

    if (!idStr) {
      return sendResponse(res, "MainColorCodeID is required", "validation_error", null);
    }

    // Build update document
    const setDoc = {
      modifiedAt: new Date(),
      updatedBy: ModifyBy || "USER",
    };

    if (MainColorCode !== undefined) setDoc.MainColorCode = String(MainColorCode).trim();
    if (MainColorType !== undefined) setDoc.MainColorType = String(MainColorType).trim();
    if (EnMainColorName !== undefined) setDoc.EnMainColorName = String(EnMainColorName).trim();
    if (ArMainColorName !== undefined) setDoc.ArMainColorName = String(ArMainColorName).trim();
    if (IsDataStatus !== undefined) setDoc.IsDataStatus = Number(IsDataStatus);

    // ✅ updateOne
    const updateResult = await db.collection("tblMainColorCode").updateOne(
      { MainColorCodeID: idStr },
      { $set: setDoc }
    );

    if (updateResult.matchedCount === 0) {
      return sendResponse(
        res,
        "Main color not found. Make sure MainColorCodeID is correct.",
        "not_found",
        null
      );
    }

    // ✅ fetch updated record
    const updatedRecord = await db.collection("tblMainColorCode").findOne({
      MainColorCodeID: idStr,
    });

    return sendResponse(
      res,
      "Main color updated successfully",
      null,
      updatedRecord
    );
  } catch (error) {
    console.error("updatePrdColor error:", error);
    next(error);
  }
};
