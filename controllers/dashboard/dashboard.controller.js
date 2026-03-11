const { connectToMongoDB } = require("../../database/mongodb");
const { generateUniqueId } = require("../../controllers/operation/operation");

// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'data': results,
    'error': error,
  });
}

 
 exports.getDashBoardSummary = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tblorder');

    // Normalize orderstatus to uppercase for consistent matching
    const statusCounts = await collection.aggregate([
      {
        $project: {
          normalizedStatus: { $toUpper: "$orderstatus" }
        }
      },
      {
        $match: {
          normalizedStatus: { $in: ["NEW", "DELIVERED", "CANCELED", "PENDING", "PROGRESS"] }
        }
      },
      {
        $group: {
          _id: "$normalizedStatus",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Initialize all counts to 0
    const result = {
      NEW: 0,
      DELIVERED: 0,
      CANCEL: 0,
      PENDING: 0,
      PROGRESS: 0,
    };

    // Fill in counts from aggregation results
    for (const item of statusCounts) {
      result[item._id] = item.count;
    }

    sendResponse(res, "Order status counts fetched", null, result, null);
  } catch (error) {
    console.error("Error fetching order status counts:", error);
    next(error);
  }
};

