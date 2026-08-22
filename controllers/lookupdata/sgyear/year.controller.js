const { connectToMongoDB } = require("../../../database/mongodb");
const { generateUniqueId } = require("../../../controllers/operation/operation");

function sendResponse(res, message, error, results, totalCount) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message,
    data: results,
    error,
    totalCount,
  });
}

exports.getyearlist = async (req, res, next) => {
  try {
    const { page = 1, limit = 5 } = req.body;
    const db = await connectToMongoDB();
    const collection = db.collection("tbllokyear");
    const skip = (Number(page) - 1) * Number(limit);

    const years = await collection.aggregate([
      {
        $project: {
          YearID: 1,
          EnYearName: 1,
          ArYearName: 1,
          OrderID: 1,
          IsDataStatus: 1,
          CreatedAt: 1,
          CreatedBy: 1,
          ModifyAt: 1,
          ModifyBy: 1,
        },
      },
      { $sort: { OrderID: 1, CreatedAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
    ]).toArray();

    const totalCount = await collection.countDocuments();
    sendResponse(res, "Year found.", null, years, totalCount);
  } catch (error) {
    console.error("Error in getyearlist:", error);
    next(error);
  }
};

exports.getYear = async (req, res, next) => {
  try {
    const { YearID } = req.body;
    if (!YearID) {
      return sendResponse(res, "YearID is required", true, null, 0);
    }

    const db = await connectToMongoDB();
    const year = await db.collection("tbllokyear").findOne(
      { YearID },
      {
        projection: {
          YearID: 1,
          EnYearName: 1,
          ArYearName: 1,
          OrderID: 1,
          IsDataStatus: 1,
          CreatedAt: 1,
          CreatedBy: 1,
          ModifyAt: 1,
          ModifyBy: 1,
        },
      }
    );

    if (!year) {
      return res.status(404).json({ success: false, message: "Year not found" });
    }

    sendResponse(res, "Year found.", null, year, 1);
  } catch (error) {
    console.error("Error in getYear:", error);
    next(error);
  }
};

exports.createYear = async (req, res, next) => {
  try {
    const { EnYearName, ArYearName, OrderID } = req.body;

    if (!EnYearName || !ArYearName) {
      return sendResponse(res, "EnYearName and ArYearName are required", true, null, 0);
    }

    const db = await connectToMongoDB();
    const yearItem = {
      YearID: generateUniqueId(),
      EnYearName,
      ArYearName,
      OrderID: Number(OrderID) || 0,
      IsDataStatus: req.body.IsDataStatus ?? 1,
      CreatedAt: new Date(),
      CreatedBy: req.body.CreatedBy || null,
      ModifyAt: new Date(),
      ModifyBy: req.body.ModifyBy || null,
    };

    const result = await db.collection("tbllokyear").insertOne(yearItem);
    sendResponse(res, "Year inserted successfully.", null, result, null);
  } catch (error) {
    console.error("Error in createYear:", error);
    next(error);
  }
};

exports.updateYear = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tbllokyear");
    const { YearID } = req.body;

    if (!YearID) {
      return res.status(400).json({ success: false, message: "YearID is required" });
    }

    const updateFields = {
      EnYearName: req.body.EnYearName,
      ArYearName: req.body.ArYearName,
      OrderID: Number(req.body.OrderID) || 0,
      IsDataStatus: req.body.IsDataStatus,
      ModifyAt: new Date(),
      ModifyBy: req.body.ModifyBy || null,
    };

    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] === undefined) delete updateFields[key];
    });

    const updateResult = await collection.updateOne(
      { YearID },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No Year found to update" });
    }

    return res.status(200).json({ success: true, message: "Year updated successfully" });
  } catch (error) {
    console.error("Update Year Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.delYear = async (req, res, next) => {
  try {
    const { YearID } = req.body;
    if (!YearID) {
      return sendResponse(res, "YearID is required", true, null, 0);
    }

    const db = await connectToMongoDB();
    const result = await db.collection("tbllokyear").deleteOne({ YearID });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Year not found" });
    }

    return sendResponse(res, "Year deleted successfully", null, null, null);
  } catch (error) {
    console.error("Error in delYear:", error);
    next(error);
  }
};
