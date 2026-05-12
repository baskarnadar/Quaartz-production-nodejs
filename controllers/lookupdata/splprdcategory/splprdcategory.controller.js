// splprdcategory.controller.js
const { connectToMongoDB } = require("../../../database/mongodb");
const { generateUniqueId } = require("../../../controllers/operation/operation");

// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message: message,
    data: results,
    error: error,
  });
}

// ------------------------------------------------------------
// GET: list all special product categories
// Table: tblprdColorKeyCode
// ------------------------------------------------------------
exports.getSplCategoryList = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const documents = await db
      .collection("tblprdColorKeyCode")
      .find({ IsDataStatus: { $ne: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return sendResponse(res, "Special product category fetched successfully.", null, documents);
  } catch (error) {
    console.error("getSplCategoryList error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// FETCH FOR EDIT
// Frontend sends: ColorKeyCodeID
// ------------------------------------------------------------
exports.editSplCategory = async (req, res, next) => {
  try {
    const { ColorKeyCodeID } = req.body || {};

    if (!ColorKeyCodeID) {
      return sendResponse(res, "ColorKeyCodeID is required.", "validation_error", null);
    }

    const db = await connectToMongoDB();

    const existingData = await db.collection("tblprdColorKeyCode").findOne({
      ColorKeyCodeID: String(ColorKeyCodeID).trim(),
      IsDataStatus: { $ne: 0 },
    });

    if (!existingData) {
      return sendResponse(res, "Special product category not found.", "not_found", null);
    }

    return sendResponse(res, "Special product category fetched successfully.", null, existingData);
  } catch (error) {
    console.error("editSplCategory error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// ADD
// Table: tblprdColorKeyCode
// Fields:
// ColorKeyCodeID
// ColorKeyCode
// ColorKeyCodeEnName
// ColorKeyCodeArName
// ------------------------------------------------------------
exports.addSplCategory = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      ColorKeyCodeID,
      ColorKeyCode,
      ColorKeyCodeEnName,
      ColorKeyCodeArName,
      IsDataStatus,
      CreatedBy,
      ModifyBy,
    } = req.body || {};

    if (!ColorKeyCode || !ColorKeyCodeEnName || !ColorKeyCodeArName) {
      return sendResponse(
        res,
        "Please provide: ColorKeyCode, ColorKeyCodeEnName, ColorKeyCodeArName",
        "validation_error",
        null
      );
    }

    const cleanColorKeyCode = String(ColorKeyCode).trim().toUpperCase();

    const exists = await db.collection("tblprdColorKeyCode").findOne({
      ColorKeyCode: cleanColorKeyCode,
      IsDataStatus: { $ne: 0 },
    });

    if (exists) {
      return sendResponse(
        res,
        "Special product category already exists with same ColorKeyCode.",
        "duplicate",
        exists
      );
    }

    const now = new Date();

    const specialCategoryItem = {
      ColorKeyCodeID: ColorKeyCodeID ? String(ColorKeyCodeID).trim() : generateUniqueId(),
      ColorKeyCode: cleanColorKeyCode,
      ColorKeyCodeEnName: String(ColorKeyCodeEnName).trim(),
      ColorKeyCodeArName: String(ColorKeyCodeArName).trim(),

      createdAt: now,
      modifiedAt: now,
      createdBy: CreatedBy || "USER",
      updatedBy: ModifyBy || "USER",
      IsDataStatus: Number(IsDataStatus ?? 1),
    };

    const result = await db.collection("tblprdColorKeyCode").insertOne(specialCategoryItem);

    return sendResponse(res, "Special product category inserted successfully.", null, {
      insertedId: result?.insertedId || null,
      ...specialCategoryItem,
    });
  } catch (error) {
    console.error("addSplCategory error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// DELETE
// Frontend sends: ColorKeyCodeID
// Soft delete: IsDataStatus = 0
// ------------------------------------------------------------
exports.delSplCategory = async (req, res, next) => {
  try {
    const { ColorKeyCodeID, ModifyBy } = req.body || {};

    if (!ColorKeyCodeID) {
      return sendResponse(res, "ColorKeyCodeID is required.", "validation_error", null);
    }

    const db = await connectToMongoDB();

    const result = await db.collection("tblprdColorKeyCode").updateOne(
      {
        ColorKeyCodeID: String(ColorKeyCodeID).trim(),
      },
      {
        $set: {
          IsDataStatus: 0,
          modifiedAt: new Date(),
          updatedBy: ModifyBy || "USER",
        },
      }
    );

    if (result.matchedCount === 0) {
      return sendResponse(
        res,
        "Special product category not found or delete failed.",
        "not_found",
        null
      );
    }

    return sendResponse(res, "Special product category deleted successfully.", null, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("delSplCategory error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// UPDATE
// Frontend sends: ColorKeyCodeID
// ------------------------------------------------------------
exports.updateSplCategory = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      ColorKeyCodeID,
      ColorKeyCode,
      ColorKeyCodeEnName,
      ColorKeyCodeArName,
      IsDataStatus,
      ModifyBy,
    } = req.body || {};

    const idStr = String(ColorKeyCodeID || "").trim();

    if (!idStr) {
      return sendResponse(res, "ColorKeyCodeID is required.", "validation_error", null);
    }

    const existingData = await db.collection("tblprdColorKeyCode").findOne({
      ColorKeyCodeID: idStr,
    });

    if (!existingData) {
      return sendResponse(
        res,
        "Special product category not found. Make sure ColorKeyCodeID is correct.",
        "not_found",
        null
      );
    }

    const setDoc = {
      modifiedAt: new Date(),
      updatedBy: ModifyBy || "USER",
    };

    if (ColorKeyCode !== undefined) setDoc.ColorKeyCode = String(ColorKeyCode).trim().toUpperCase();
    if (ColorKeyCodeEnName !== undefined) setDoc.ColorKeyCodeEnName = String(ColorKeyCodeEnName).trim();
    if (ColorKeyCodeArName !== undefined) setDoc.ColorKeyCodeArName = String(ColorKeyCodeArName).trim();
    if (IsDataStatus !== undefined) setDoc.IsDataStatus = Number(IsDataStatus);

    const duplicateData = await db.collection("tblprdColorKeyCode").findOne({
      ColorKeyCodeID: { $ne: idStr },
      ColorKeyCode: setDoc.ColorKeyCode || existingData.ColorKeyCode,
      IsDataStatus: { $ne: 0 },
    });

    if (duplicateData) {
      return sendResponse(
        res,
        "Special product category already exists with same ColorKeyCode.",
        "duplicate",
        duplicateData
      );
    }

    await db.collection("tblprdColorKeyCode").updateOne(
      {
        ColorKeyCodeID: idStr,
      },
      {
        $set: setDoc,
      }
    );

    const updatedRecord = await db.collection("tblprdColorKeyCode").findOne({
      ColorKeyCodeID: idStr,
    });

    return sendResponse(res, "Special product category updated successfully.", null, updatedRecord);
  } catch (error) {
    console.error("updateSplCategory error:", error);
    next(error);
  }
};