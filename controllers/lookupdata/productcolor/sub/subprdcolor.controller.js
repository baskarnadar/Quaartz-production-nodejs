// subprdcolor.controller.js
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

    const collection = db.collection("tblSubColorCode");
    const documents = await collection.find().toArray();

    return sendResponse(res, "Color fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// ------------------------------------------------------------
// GET: by SubColorCode (UPDATED: same field name)
// ------------------------------------------------------------
exports.getprdcolorbycolorcode = async (req, res, next) => {
  try {
    const { SubColorCode } = req.body || {};
    const db = await connectToMongoDB();

    if (!SubColorCode) {
      return sendResponse(res, "SubColorCode is required.", "validation_error", null);
    }

    const collection = db.collection("tblSubColorCode");
    const documents = await collection
      .find({ SubColorCode: String(SubColorCode).trim() })
      .toArray();

    return sendResponse(res, "Color fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// ------------------------------------------------------------
// GET: list
// ------------------------------------------------------------
exports.getSubcolorlist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    // ✅ Join tblSubColorCode -> tblMainColorCode by MainColorCodeID
    const documents = await db
      .collection("tblSubColorCode")
      .aggregate([
        {
          $lookup: {
            from: "tblMainColorCode",
            localField: "MainColorCodeID",
            foreignField: "MainColorCodeID",
            as: "mainColor",
          },
        },
        {
          $unwind: {
            path: "$mainColor",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            // ✅ bring Main Arabic name into sub record
            ArMainColorName: "$mainColor.ArMainColorName",
          },
        },
        {
          $project: {
            mainColor: 0, // remove joined object
          },
        },
      ])
      .toArray();

    return sendResponse(res, "Color fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// ------------------------------------------------------------
// FETCH FOR EDIT
// Frontend will send SubColorCodeID
// ------------------------------------------------------------
exports.editSubColor = async (req, res, next) => {
  try {
    const { SubColorCodeID } = req.body || {};

    if (!SubColorCodeID) {
      return sendResponse(res, "SubColorCodeID is required.", "validation_error", null);
    }

    const db = await connectToMongoDB();

    const existingData = await db
      .collection("tblSubColorCode")
      .findOne({ SubColorCodeID: String(SubColorCodeID) });

    if (!existingData) {
      return sendResponse(res, "Sub color not found.", "not_found", null);
    }

    return sendResponse(res, "Sub color fetched successfully.", null, existingData);
  } catch (error) {
    console.error("editSubColor (FETCH) error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// ADD (UPDATED: includes MainColorCodeID)
// ------------------------------------------------------------
exports.addSubColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      MainColorCodeID, // ✅ NEW
      SubColorCode,
      SubColorType,
      EnSubColorName,
      ArSubColorName,
      IsDataStatus,
      CreatedBy,
      ModifyBy,
    } = req.body || {};

    // ✅ UPDATED validation (MainColorCodeID required)
    if (
      !MainColorCodeID ||
      !SubColorCode ||
      !SubColorType ||
      !EnSubColorName ||
      !ArSubColorName
    ) {
      return sendResponse(
        res,
        "Please provide: MainColorCodeID, SubColorCode, SubColorType, EnSubColorName, ArSubColorName",
        "validation_error",
        null
      );
    }

    const now = new Date();

    const SubColorItem = {
      SubColorCodeID: generateUniqueId(),

      // ✅ NEW link to main color
      MainColorCodeID: String(MainColorCodeID).trim(),

      SubColorCode: String(SubColorCode).trim(),
      SubColorType: String(SubColorType).trim(),
      EnSubColorName: String(EnSubColorName).trim(),
      ArSubColorName: String(ArSubColorName).trim(),

      createdAt: now,
      modifiedAt: now,
      createdBy: CreatedBy || "USER",
      updatedBy: ModifyBy || "USER",
      IsDataStatus: Number(IsDataStatus ?? 1),
    };

    const result = await db.collection("tblSubColorCode").insertOne(SubColorItem);

    return sendResponse(res, "Sub Color inserted successfully.", null, {
      insertedId: result?.insertedId || null,
      ...SubColorItem,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// ------------------------------------------------------------
// DELETE
// Frontend will send SubColorCodeID
// ------------------------------------------------------------
exports.delSubColor = async (req, res, next) => {
  try {
    const { SubColorCodeID } = req.body || {};
    const db = await connectToMongoDB();

    if (!SubColorCodeID) {
      return sendResponse(res, "SubColorCodeID is required.", "validation_error", null);
    }

    const filter = { SubColorCodeID: String(SubColorCodeID) };

    const result = await db.collection("tblSubColorCode").deleteOne(filter);

    if (result.deletedCount === 0) {
      return sendResponse(res, "Sub color not found or delete failed.", "not_found", null);
    }

    return sendResponse(res, "Sub color deleted successfully.", null, {
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// ------------------------------------------------------------
// UPDATE (UPDATED: supports MainColorCodeID)
// Frontend will send SubColorCodeID + SubColor... fields (+ optional MainColorCodeID)
// ------------------------------------------------------------
exports.updateSubColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      SubColorCodeID,
      MainColorCodeID, // ✅ NEW
      SubColorCode,
      SubColorType,
      EnSubColorName,
      ArSubColorName,
      IsDataStatus,
      ModifyBy,
    } = req.body || {};

    const idStr = String(SubColorCodeID || "").trim();
    console.log("Incoming SubColorCodeID:", idStr);

    if (!idStr) {
      return sendResponse(res, "SubColorCodeID is required", "validation_error", null);
    }

    const setDoc = {
      modifiedAt: new Date(),
      updatedBy: ModifyBy || "USER",
    };

    // ✅ NEW: allow updating the parent MainColorCodeID
    if (MainColorCodeID !== undefined) setDoc.MainColorCodeID = String(MainColorCodeID).trim();

    if (SubColorCode !== undefined) setDoc.SubColorCode = String(SubColorCode).trim();
    if (SubColorType !== undefined) setDoc.SubColorType = String(SubColorType).trim();
    if (EnSubColorName !== undefined) setDoc.EnSubColorName = String(EnSubColorName).trim();
    if (ArSubColorName !== undefined) setDoc.ArSubColorName = String(ArSubColorName).trim();
    if (IsDataStatus !== undefined) setDoc.IsDataStatus = Number(IsDataStatus);

    const updateResult = await db.collection("tblSubColorCode").updateOne(
      { SubColorCodeID: idStr },
      { $set: setDoc }
    );

    if (updateResult.matchedCount === 0) {
      return sendResponse(
        res,
        "Sub color not found. Make sure SubColorCodeID is correct.",
        "not_found",
        null
      );
    }

    const updatedRecord = await db.collection("tblSubColorCode").findOne({
      SubColorCodeID: idStr,
    });

    return sendResponse(res, "Sub color updated successfully", null, updatedRecord);
  } catch (error) {
    console.error("updateSubColor error:", error);
    next(error);
  }
};
