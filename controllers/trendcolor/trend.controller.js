 // trendprdcolor.controller.js

const { connectToMongoDB } = require("../../database/mongodb");
const {
  generateUniqueId,
} = require("../../controllers/operation/operation");

// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message: message,
    data: results,
    error: error,
  });
}
 

exports.getalltrendcolorlist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const collection = db.collection("tblTrendColorCode");

    const documents = await collection.find().toArray();

    return sendResponse(
      res,
      "Trend color fetched successfully.",
      null,
      documents
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};
// ------------------------------------------------------------
// GET: Trend Color List
// ------------------------------------------------------------
exports.gettrendcolorlist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const collection = db.collection("tblTrendColorCode");

    const documents = await collection.find().toArray();

    return sendResponse(
      res,
      "Trend color fetched successfully.",
      null,
      documents
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.gettrendcolorbyid = async (req, res, next) => {
  try {
    const { TrendColorCodeID } = req.body;

    if (!TrendColorCodeID) {
      return sendResponse(
        res,
        "TrendColorCodeID is required.",
        true,
        null
      );
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblTrendColorCode");

    const document = await collection.findOne({
      TrendColorCodeID: TrendColorCodeID.trim(),
    });

    if (!document) {
      return sendResponse(
        res,
        "Trend color not found.",
        true,
        null
      );
    }

    return sendResponse(
      res,
      "Trend color fetched successfully.",
      null,
      document
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};


// ------------------------------------------------------------
// FETCH FOR EDIT
// Frontend sends TrendColorCodeID
// ------------------------------------------------------------
 exports.edittrendcolor = async (req, res, next) => {
  try {
    const {
      TrendColorCodeID,
      TrendColorCode,
      TrendColorType,
      EnTrendColorName,
      ArTrendColorName,
      ModifyBy,
    } = req.body || {};

    if (!String(TrendColorCodeID || '').trim()) {
      return sendResponse(
        res,
        'TrendColorCodeID is required.',
        true,
        null
      );
    }

    if (
      !String(TrendColorCode || '').trim() ||
      !String(TrendColorType || '').trim() ||
      !String(EnTrendColorName || '').trim() ||
      !String(ArTrendColorName || '').trim()
    ) {
      return sendResponse(
        res,
        'All trend color fields are required.',
        true,
        null
      );
    }

    const db = await connectToMongoDB();
    const collection = db.collection('tblTrendColorCode');

    const filter = {
      TrendColorCodeID: String(TrendColorCodeID).trim(),
    };

    const existingData = await collection.findOne(filter);

    if (!existingData) {
      return sendResponse(
        res,
        'Trend color not found.',
        true,
        null
      );
    }

    const updateData = {
      TrendColorCode: String(TrendColorCode).trim(),
      TrendColorType: String(TrendColorType).trim(),
      EnTrendColorName: String(EnTrendColorName).trim(),
      ArTrendColorName: String(ArTrendColorName).trim(),
      updatedBy: String(ModifyBy || 'USER').trim(),
      modifiedAt: new Date(),
    };

    const updateResult = await collection.updateOne(
      filter,
      {
        $set: updateData,
      }
    );

    if (updateResult.matchedCount === 0) {
      return sendResponse(
        res,
        'Trend color not found.',
        true,
        null
      );
    }

    const updatedDocument = await collection.findOne(filter);

    return sendResponse(
      res,
      'Trend color updated successfully.',
      null,
      updatedDocument
    );
  } catch (error) {
    console.error('edittrendcolor error:', error);
    next(error);
  }
};
// ------------------------------------------------------------
// ADD TREND COLOR
// ------------------------------------------------------------
exports.addtrendcolor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      TrendColorCode,
      TrendColorType,
      EnTrendColorName,
      ArTrendColorName,
      IsDataStatus,
      CreatedBy,
      ModifyBy,
    } = req.body || {};

    if (
      !TrendColorCode ||
      !TrendColorType ||
      !EnTrendColorName ||
      !ArTrendColorName
    ) {
      return sendResponse(
        res,
        "Please provide: TrendColorCode, TrendColorType, EnTrendColorName, ArTrendColorName",
        "validation_error",
        null
      );
    }

    const now = new Date();

    const TrendColorItem = {
      TrendColorCodeID: generateUniqueId(),
      TrendColorCode: String(TrendColorCode).trim(),
      TrendColorType: String(TrendColorType).trim(),
      EnTrendColorName: String(EnTrendColorName).trim(),
      ArTrendColorName: String(ArTrendColorName).trim(),
      createdAt: now,
      modifiedAt: now,
      createdBy: CreatedBy || "USER",
      updatedBy: ModifyBy || "USER",
      IsDataStatus: Number(IsDataStatus ?? 1),
    };

    const result = await db
      .collection("tblTrendColorCode")
      .insertOne(TrendColorItem);

    return sendResponse(
      res,
      "Trend Color inserted successfully.",
      null,
      {
        insertedId: result?.insertedId || null,
        ...TrendColorItem,
      }
    );
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// ------------------------------------------------------------
// DELETE TREND COLOR
// Frontend sends TrendColorCodeID
// ------------------------------------------------------------
exports.deltrendcolor = async (req, res, next) => {
  try {
    const { TrendColorCodeID } = req.body || {};

    const db = await connectToMongoDB();

    if (!TrendColorCodeID) {
      return sendResponse(
        res,
        "TrendColorCodeID is required.",
        "validation_error",
        null
      );
    }

    const filter = {
      TrendColorCodeID: String(TrendColorCodeID),
    };

    const result = await db
      .collection("tblTrendColorCode")
      .deleteOne(filter);

    if (result.deletedCount === 0) {
      return sendResponse(
        res,
        "Trend color not found or delete failed.",
        "not_found",
        null
      );
    }

    return sendResponse(
      res,
      "Trend color deleted successfully.",
      null,
      {
        deletedCount: result.deletedCount,
      }
    );
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// ------------------------------------------------------------
// UPDATE TREND COLOR
// Frontend sends TrendColorCodeID + TrendColor fields
// ------------------------------------------------------------
exports.updatetrendcolor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      TrendColorCodeID,
      TrendColorCode,
      TrendColorType,
      EnTrendColorName,
      ArTrendColorName,
      IsDataStatus,
      ModifyBy,
    } = req.body || {};

    const idStr = String(TrendColorCodeID || "").trim();

    console.log("Incoming TrendColorCodeID:", idStr);

    if (!idStr) {
      return sendResponse(
        res,
        "TrendColorCodeID is required",
        "validation_error",
        null
      );
    }

    // Build update document
    const setDoc = {
      modifiedAt: new Date(),
      updatedBy: ModifyBy || "USER",
    };

    if (TrendColorCode !== undefined) {
      setDoc.TrendColorCode = String(TrendColorCode).trim();
    }

    if (TrendColorType !== undefined) {
      setDoc.TrendColorType = String(TrendColorType).trim();
    }

    if (EnTrendColorName !== undefined) {
      setDoc.EnTrendColorName = String(EnTrendColorName).trim();
    }

    if (ArTrendColorName !== undefined) {
      setDoc.ArTrendColorName = String(ArTrendColorName).trim();
    }

    if (IsDataStatus !== undefined) {
      setDoc.IsDataStatus = Number(IsDataStatus);
    }

    const updateResult = await db
      .collection("tblTrendColorCode")
      .updateOne(
        {
          TrendColorCodeID: idStr,
        },
        {
          $set: setDoc,
        }
      );

    if (updateResult.matchedCount === 0) {
      return sendResponse(
        res,
        "Trend color not found. Make sure TrendColorCodeID is correct.",
        "not_found",
        null
      );
    }

    // Fetch updated record
    const updatedRecord = await db
      .collection("tblTrendColorCode")
      .findOne({
        TrendColorCodeID: idStr,
      });

    return sendResponse(
      res,
      "Trend color updated successfully",
      null,
      updatedRecord
    );
  } catch (error) {
    console.error("updateTrendColor error:", error);
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
      return sendResponse(
        res,
        "Request body must be an array.",
        "validation_error",
        null
      );
    }

    const bulkOps = [];

    for (const item of items) {
      const TrendColorCodeID = String(
        item.TrendColorCodeID || ""
      ).trim();

      const OrderID = Number(item.OrderID);

      if (!TrendColorCodeID || isNaN(OrderID)) {
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: {
            TrendColorCodeID,
          },
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
      return sendResponse(
        res,
        "No valid records found.",
        "validation_error",
        null
      );
    }

    await db
      .collection("tblTrendColorCode")
      .bulkWrite(bulkOps);

    return sendResponse(
      res,
      "Order updated successfully.",
      null,
      null
    );
  } catch (error) {
    console.error("Change Order Error:", error);
    next(error);
  }
};