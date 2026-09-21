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
// ADD
// ✅ FIXED: only MainColorCode + sigmacolorcode are required.
//    MainColorType defaults to "PRODUCT".
//    EnMainColorName / ArMainColorName are optional (saved as "").
//    OrderID is set automatically to (highest OrderID + 1).
// ------------------------------------------------------------
exports.addMainColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      MainColorCode,
      MainColorType,
      EnMainColorName,
      ArMainColorName,
      sigmacolorcode,
      IsDataStatus,
      CreatedBy,
      ModifyBy,
    } = req.body || {};

    const colorCode = String(MainColorCode || "").trim().toUpperCase();
    const sigmaCode = String(sigmacolorcode || "").trim();

    if (!colorCode || !sigmaCode) {
      return sendResponse(
        res,
        "Please provide: MainColorCode, sigmacolorcode",
        "validation_error",
        null
      );
    }

    if (!/^#[0-9A-F]{6}$/.test(colorCode)) {
      return sendResponse(
        res,
        "MainColorCode must be a valid hex value, e.g. #F2E3B0",
        "validation_error",
        null
      );
    }

    const collection = db.collection("tblMainColorCode");

    // Next OrderID = highest existing OrderID + 1
    const lastOrdered = await collection
      .find({ OrderID: { $type: "number" } })
      .sort({ OrderID: -1 })
      .limit(1)
      .toArray();
    const nextOrderID = lastOrdered.length > 0 ? Number(lastOrdered[0].OrderID) + 1 : 1;

    const now = new Date();

    const MainColorItem = {
      MainColorCodeID: generateUniqueId(),
      MainColorCode: colorCode,
      MainColorType: String(MainColorType || "PRODUCT").trim() || "PRODUCT",
      EnMainColorName: String(EnMainColorName || "").trim(),
      ArMainColorName: String(ArMainColorName || "").trim(),
      sigmacolorcode: sigmaCode,
      OrderID: nextOrderID,
      createdAt: now,
      modifiedAt: now,
      createdBy: CreatedBy || "USER",
      updatedBy: ModifyBy || "USER",
      IsDataStatus: Number(IsDataStatus ?? 1),
    };

    const result = await collection.insertOne(MainColorItem);

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
// UPDATE (using updateOne)
// Frontend will send MainColorCodeID + MainColor... fields
// Only fields that are sent are updated; names may be empty.
// ------------------------------------------------------------
exports.updateMainColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      MainColorCodeID,
      MainColorCode,
      MainColorType,
      EnMainColorName,
      ArMainColorName,
      sigmacolorcode,
      IsDataStatus,
      ModifyBy,
    } = req.body || {};

    const idStr = String(MainColorCodeID || "").trim();

    if (!idStr) {
      return sendResponse(res, "MainColorCodeID is required", "validation_error", null);
    }

    // Build update document
    const setDoc = {
      modifiedAt: new Date(),
      updatedBy: ModifyBy || "USER",
    };

    if (MainColorCode !== undefined) setDoc.MainColorCode = String(MainColorCode).trim();
    if (MainColorType !== undefined) setDoc.MainColorType = String(MainColorType).trim() || "PRODUCT";
    if (EnMainColorName !== undefined) setDoc.EnMainColorName = String(EnMainColorName).trim();
    if (ArMainColorName !== undefined) setDoc.ArMainColorName = String(ArMainColorName).trim();
    if (sigmacolorcode !== undefined) setDoc.sigmacolorcode = String(sigmacolorcode).trim();
    if (IsDataStatus !== undefined) setDoc.IsDataStatus = Number(IsDataStatus);

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

    const updatedRecord = await db.collection("tblMainColorCode").findOne({
      MainColorCodeID: idStr,
    });

    return sendResponse(res, "Main color updated successfully", null, updatedRecord);
  } catch (error) {
    console.error("updateMainColor error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// CHANGE ORDER
// ------------------------------------------------------------
exports.changeorder = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return sendResponse(res, "Request body must be an array.", "validation_error", null);
    }

    const bulkOps = [];

    for (const item of items) {
      const MainColorCodeID = String(item.MainColorCodeID || "").trim();
      const OrderID = Number(item.OrderID);

      if (!MainColorCodeID || isNaN(OrderID)) {
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { MainColorCodeID },
          update: {
            $set: {
              OrderID,
              ModifyDate: new Date(),
            },
          },
        },
      });
    }

    if (!bulkOps.length) {
      return sendResponse(res, "No valid records found.", "validation_error", null);
    }

    await db.collection("tblMainColorCode").bulkWrite(bulkOps);

    return sendResponse(res, "Order updated successfully.", null, null);
  } catch (error) {
    console.error("Change Order Error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// POST /lookupdata/productcolor/main/updateSubColors
//
// Assigns / un-assigns special colors (tblPrdSpecialColor) to a main color.
//   Checked   -> tblPrdSpecialColor.MainColorCodeID = MainColorCodeID
//   Unchecked -> tblPrdSpecialColor.MainColorCodeID = ""
//
// Body:
// {
//   "MainColorCodeID": "2fda26278ad347ceb362121df",
//   "checkedSplColorCodeIDPrKeys":   ["b76b87561b02458487a58157", ...],
//   "uncheckedSplColorCodeIDPrKeys": ["dbad0f4145e3478b837379b2", ...],
//   "ModifyBy": "USER"
// }
// ------------------------------------------------------------
exports.udpatesubcolor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      MainColorCodeID,
      checkedSplColorCodeIDPrKeys,
      uncheckedSplColorCodeIDPrKeys,
      ModifyBy,
    } = req.body || {};

    const mainColorID = String(MainColorCodeID || "").trim();

    // Clean + de-duplicate an array of keys
    const cleanKeys = (value) =>
      [...new Set((Array.isArray(value) ? value : []).map((key) => String(key || "").trim()).filter(Boolean))];

    const checkedKeys = cleanKeys(checkedSplColorCodeIDPrKeys);
    // A key can't be both checked and unchecked; checked wins
    const uncheckedKeys = cleanKeys(uncheckedSplColorCodeIDPrKeys).filter((key) => !checkedKeys.includes(key));

    if (!mainColorID) {
      return sendResponse(res, "MainColorCodeID is required", "validation_error", null);
    }

    if (checkedKeys.length === 0 && uncheckedKeys.length === 0) {
      return sendResponse(res, "No changes to save", "validation_error", null);
    }

    const mainColor = await db
      .collection("tblMainColorCode")
      .findOne({ MainColorCodeID: mainColorID }, { projection: { _id: 1 } });

    if (!mainColor) {
      return sendResponse(res, "Main color not found. Make sure MainColorCodeID is correct.", "not_found", null);
    }

    const collection = db.collection("tblPrdSpecialColor");
    const auditFields = {
      modifiedAt: new Date(),
      updatedBy: ModifyBy || "USER",
    };

    let assignedCount = 0;
    let unassignedCount = 0;

    // Checked: link all selected colors to this main color
    if (checkedKeys.length > 0) {
      const result = await collection.updateMany(
        { SplColorCodeIDPrKey: { $in: checkedKeys } },
        { $set: { MainColorCodeID: mainColorID, ...auditFields } }
      );
      assignedCount = result.modifiedCount;
    }

    // Unchecked: clear MainColorCodeID (only if it still belongs to THIS main color)
    if (uncheckedKeys.length > 0) {
      const result = await collection.updateMany(
        { SplColorCodeIDPrKey: { $in: uncheckedKeys }, MainColorCodeID: mainColorID },
        { $set: { MainColorCodeID: "", ...auditFields } }
      );
      unassignedCount = result.modifiedCount;
    }

    return sendResponse(
      res,
      `Sub colors updated successfully (${assignedCount} assigned, ${unassignedCount} removed)`,
      null,
      {
        MainColorCodeID: mainColorID,
        assignedCount,
        unassignedCount,
      }
    );
  } catch (error) {
    console.error("updateSubColors error:", error);
    next(error);
  }
};