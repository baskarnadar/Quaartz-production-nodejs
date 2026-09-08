 // splprdcolor.controller.js
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
// GET: list all special product colors
// Table: tblPrdSpecialColor
// ✅ UPDATED: supports MainColorCodeID filter + joins main color
//    collection so each row also returns EnMainColorName / ArMainColorName
// ------------------------------------------------------------
exports.getSplcolorlist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const page = Math.max(parseInt(req.body.page || "1", 10), 1);
    const rawLimit = String(req.body.limit || "50").trim();
    const isShowAll = rawLimit.toUpperCase() === "ALL";

    const limit = isShowAll ? 0 : Math.max(parseInt(rawLimit, 10), 1);
    const skip = isShowAll ? 0 : (page - 1) * limit;

    const ColorKeyCode = String(req.body.ColorKeyCode || "").trim();

    // ✅ NEW: Main Color filter
    const MainColorCodeID = String(req.body.MainColorCodeID || "").trim();

    const searchText = String(req.body.searchText || "").trim();

    const allowedSortFields = [
      "ColorKeyCode",
      "SplColorCodeID",
      "HexValue",
      "EnColorName",
      "ArColorName",
      "MainColorCodeID",
      "createdAt",
    ];

    const sortField = allowedSortFields.includes(req.body.sortField)
      ? req.body.sortField
      : "createdAt";

    const sortOrder =
      String(req.body.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;

    const filter = {
      IsDataStatus: { $ne: 0 },
    };

    // ✅ Category filter
    if (ColorKeyCode && ColorKeyCode !== "ALL") {
      filter.ColorKeyCode = ColorKeyCode;
    }

    // ✅ NEW: Main Color filter
    if (MainColorCodeID && MainColorCodeID !== "ALL") {
      filter.MainColorCodeID = MainColorCodeID;
    }

    // ✅ Search filter
    if (searchText) {
      filter.$or = [
        { ColorKeyCode: { $regex: searchText, $options: "i" } },
        { SplColorCodeID: { $regex: searchText, $options: "i" } },
        { HexValue: { $regex: searchText, $options: "i" } },
        { EnColorName: { $regex: searchText, $options: "i" } },
        { ArColorName: { $regex: searchText, $options: "i" } },
        { MainColorCodeID: { $regex: searchText, $options: "i" } },
      ];
    }

    // ✅ Total records
    const totalRecords = await db
      .collection("tblPrdSpecialColor")
      .countDocuments(filter);

    const totalPages = isShowAll
      ? 1
      : Math.max(1, Math.ceil(totalRecords / limit));

    // ------------------------------------------------------------
    // ✅ NEW: Aggregation pipeline with $lookup to join Main Color
    // collection (tblPrdMainColor) so the frontend can display
    // EnMainColorName / ArMainColorName directly on each row.
    // ------------------------------------------------------------
    const pipeline = [
      { $match: filter },
      { $sort: { [sortField]: sortOrder } },
    ];

    if (!isShowAll) {
      pipeline.push({ $skip: skip }, { $limit: limit });
    }

    pipeline.push(
      {
        $lookup: {
          from: "tblPrdMainColor",
          localField: "MainColorCodeID",
          foreignField: "MainColorCodeID",
          as: "mainColorInfo",
        },
      },
      {
        $unwind: {
          path: "$mainColorInfo",
          preserveNullAndEmptyArray: true,
        },
      },
      {
        $addFields: {
          EnMainColorName: "$mainColorInfo.EnMainColorName",
          ArMainColorName: "$mainColorInfo.ArMainColorName",
        },
      },
      {
        $project: {
          mainColorInfo: 0,
        },
      }
    );

    const documents = await db
      .collection("tblPrdSpecialColor")
      .aggregate(pipeline)
      .toArray();

    return sendResponse(
      res,
      "Special color fetched successfully.",
      null,
      {
        // ✅ Main records
        records: documents,

        // ✅ Direct total count
        totalRecords: totalRecords,

        // ✅ Full pagination
        pagination: {
          currentPage: isShowAll ? 1 : page,
          perPage: isShowAll ? totalRecords : limit,
          totalRecords: totalRecords,
          totalPages: totalPages,
          hasNextPage: !isShowAll && page < totalPages,
          hasPrevPage: !isShowAll && page > 1,
        },
      }
    );
  } catch (error) {
    console.error("getSplcolorlist error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// FETCH FOR EDIT
// Frontend sends: SplColorCodeIDPrKey
// Returns full document, including MainColorCodeID, so the
// modify form dropdown can auto-select it.
// ------------------------------------------------------------
exports.editSplColor = async (req, res, next) => {
  try {
    const { SplColorCodeIDPrKey } = req.body || {};

    if (!SplColorCodeIDPrKey) {
      return sendResponse(res, "SplColorCodeIDPrKey is required.", "validation_error", null);
    }

    const db = await connectToMongoDB();

    const existingData = await db.collection("tblPrdSpecialColor").findOne({
      SplColorCodeIDPrKey: String(SplColorCodeIDPrKey).trim(),
    });

    if (!existingData) {
      return sendResponse(res, "Special color not found.", "not_found", null);
    }

    return sendResponse(res, "Special color fetched successfully.", null, existingData);
  } catch (error) {
    console.error("editSplColor error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// ADD
// Table: tblPrdSpecialColor
// Fields:
// SplColorCodeIDPrKey
// MainColorCodeID   ✅ NEW
// ColorKeyCode
// SplColorCodeID
// HexValue
// EnColorName
// ArColorName
// ------------------------------------------------------------
exports.addSplColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      SplColorCodeIDPrKey,
      MainColorCodeID,
      ColorKeyCode,
      SplColorCodeID,
      HexValue,
      EnColorName,
      ArColorName,
      IsDataStatus,
      CreatedBy,
      ModifyBy,
    } = req.body || {};

    // ✅ NEW: MainColorCodeID required
    if (
      !MainColorCodeID ||
      !ColorKeyCode ||
      !SplColorCodeID ||
      !HexValue ||
      !EnColorName ||
      !ArColorName
    ) {
      return sendResponse(
        res,
        "Please provide: MainColorCodeID, ColorKeyCode, SplColorCodeID, HexValue, EnColorName, ArColorName",
        "validation_error",
        null
      );
    }

    const now = new Date();

    const cleanMainColorCodeID = String(MainColorCodeID).trim();
    const cleanColorKeyCode = String(ColorKeyCode).trim();
    const cleanSplColorCodeID = String(SplColorCodeID).trim();

    const exists = await db.collection("tblPrdSpecialColor").findOne({
      ColorKeyCode: cleanColorKeyCode,
      SplColorCodeID: cleanSplColorCodeID,
      IsDataStatus: { $ne: 0 },
    });

    if (exists) {
      return sendResponse(
        res,
        "Special color already exists with same ColorKeyCode and SplColorCodeID.",
        "duplicate",
        exists
      );
    }

    const specialColorItem = {
      SplColorCodeIDPrKey: SplColorCodeIDPrKey
        ? String(SplColorCodeIDPrKey).trim()
        : generateUniqueId(),

      // ✅ NEW
      MainColorCodeID: cleanMainColorCodeID,

      ColorKeyCode: cleanColorKeyCode,
      SplColorCodeID: cleanSplColorCodeID,
      HexValue: String(HexValue).trim(),
      EnColorName: String(EnColorName).trim(),
      ArColorName: String(ArColorName).trim(),

      createdAt: now,
      modifiedAt: now,
      createdBy: CreatedBy || "USER",
      updatedBy: ModifyBy || "USER",
      IsDataStatus: Number(IsDataStatus ?? 1),
    };

    const result = await db.collection("tblPrdSpecialColor").insertOne(specialColorItem);

    return sendResponse(res, "Special color inserted successfully.", null, {
      insertedId: result?.insertedId || null,
      ...specialColorItem,
    });
  } catch (error) {
    console.error("addSplColor error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// DELETE
// Frontend sends: SplColorCodeIDPrKey
// Soft delete: IsDataStatus = 0
// (No MainColorCodeID needed here — delete is by primary key only)
// ------------------------------------------------------------
exports.delSplColor = async (req, res, next) => {
  try {
    const { SplColorCodeIDPrKey, ModifyBy } = req.body || {};

    if (!SplColorCodeIDPrKey) {
      return sendResponse(res, "SplColorCodeIDPrKey is required.", "validation_error", null);
    }

    const db = await connectToMongoDB();

    const result = await db.collection("tblPrdSpecialColor").updateOne(
      {
        SplColorCodeIDPrKey: String(SplColorCodeIDPrKey).trim(),
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
      return sendResponse(res, "Special color not found or delete failed.", "not_found", null);
    }

    return sendResponse(res, "Special color deleted successfully.", null, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("delSplColor error:", error);
    next(error);
  }
};

// ------------------------------------------------------------
// UPDATE
// Frontend sends: SplColorCodeIDPrKey
// ✅ UPDATED: accepts + persists MainColorCodeID
// ------------------------------------------------------------
exports.updateSplColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      SplColorCodeIDPrKey,
      MainColorCodeID,
      ColorKeyCode,
      SplColorCodeID,
      HexValue,
      EnColorName,
      ArColorName,
      IsDataStatus,
      ModifyBy,
    } = req.body || {};

    const idStr = String(SplColorCodeIDPrKey || "").trim();

    if (!idStr) {
      return sendResponse(res, "SplColorCodeIDPrKey is required.", "validation_error", null);
    }

    const existingData = await db.collection("tblPrdSpecialColor").findOne({
      SplColorCodeIDPrKey: idStr,
    });

    if (!existingData) {
      return sendResponse(
        res,
        "Special color not found. Make sure SplColorCodeIDPrKey is correct.",
        "not_found",
        null
      );
    }

    const setDoc = {
      modifiedAt: new Date(),
      updatedBy: ModifyBy || "USER",
    };

    // ✅ NEW
    if (MainColorCodeID !== undefined) setDoc.MainColorCodeID = String(MainColorCodeID).trim();

    if (ColorKeyCode !== undefined) setDoc.ColorKeyCode = String(ColorKeyCode).trim();
    if (SplColorCodeID !== undefined) setDoc.SplColorCodeID = String(SplColorCodeID).trim();
    if (HexValue !== undefined) setDoc.HexValue = String(HexValue).trim();
    if (EnColorName !== undefined) setDoc.EnColorName = String(EnColorName).trim();
    if (ArColorName !== undefined) setDoc.ArColorName = String(ArColorName).trim();
    if (IsDataStatus !== undefined) setDoc.IsDataStatus = Number(IsDataStatus);

    const duplicateFilter = {
      SplColorCodeIDPrKey: { $ne: idStr },
      ColorKeyCode: setDoc.ColorKeyCode || existingData.ColorKeyCode,
      SplColorCodeID: setDoc.SplColorCodeID || existingData.SplColorCodeID,
      IsDataStatus: { $ne: 0 },
    };

    const duplicateData = await db.collection("tblPrdSpecialColor").findOne(duplicateFilter);

    if (duplicateData) {
      return sendResponse(
        res,
        "Special color already exists with same ColorKeyCode and SplColorCodeID.",
        "duplicate",
        duplicateData
      );
    }

    await db.collection("tblPrdSpecialColor").updateOne(
      {
        SplColorCodeIDPrKey: idStr,
      },
      {
        $set: setDoc,
      }
    );

    const updatedRecord = await db.collection("tblPrdSpecialColor").findOne({
      SplColorCodeIDPrKey: idStr,
    });

    return sendResponse(res, "Special color updated successfully.", null, updatedRecord);
  } catch (error) {
    console.error("updateSplColor error:", error);
    next(error);
  }
};