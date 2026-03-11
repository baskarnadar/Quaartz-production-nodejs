const { connectToMongoDB } = require("../../database/mongodb");
const { generateUniqueId } = require("../../controllers/operation/operation");
// Helper function to send responses
function sendResponse(res, message, error, results,totalCount) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'data': results,
    'error': error,
    'totalCount':totalCount
  });
} 

exports.getorderstatusall = async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.body;

    const db = await connectToMongoDB();
    const collection = db.collection("tbllokorderstatus");

    const skip = (page - 1) * limit;

    const orderstatus = await collection.aggregate([
      {
        $project: {
          OrderStatusID: 1,
          EnOrderStatusName: 1,
          ArOrderStatusName: 1,
          IsDataStatus: 1,
          CreatedAt: 1,
          CreatedBy: 1,
          ModifyAt: 1,
          ModifyBy: 1,
        }
      },
      { $sort: { CreatedAt: -1 } },  // ✅ descending order
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const totalCount = await collection.countDocuments();

    sendResponse(res, "orderstatus found.", null, orderstatus, totalCount);
  } catch (error) {
    console.error("Error in getAllorderstatusList:", error);
    next(error);
  }
};

exports.getorderstatus = async (req, res, next) => {
  try {
    const { OrderStatusID } = req.body;

    const db = await connectToMongoDB();
    const collection = db.collection("tbllokorderstatus");

    // Build filter for OrderStatusID only
    const filter = {};
    if (OrderStatusID) {
      filter.OrderStatusID = OrderStatusID;
    }

    const orderstatus = await collection.findOne(filter, {
      projection: {
        OrderStatusID: 1,
        EnOrderStatusName: 1,
        ArOrderStatusName: 1,
        IsDataStatus: 1,
        CreatedAt: 1,
        CreatedBy: 1,
        ModifyAt: 1,
        ModifyBy: 1,
      }
    });

    if (!orderstatus) {
      return res.status(404).json({ success: false, message: "orderstatus not found" });
    }

    sendResponse(res, "orderstatus found.", null, orderstatus, 1);
  } catch (error) {
    console.error("Error in getorderstatus:", error);
    next(error);
  }
};


exports.createorderstatus = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const orderstatusItem = {
      OrderStatusID: generateUniqueId(),
      EnOrderStatusName: req.body.EnOrderStatusName,
      ArOrderStatusName: req.body.ArOrderStatusName,
      IsDataStatus: req.body.IsDataStatus,
      CreatedAt: new Date(),
      CreatedBy: req.body.CreatedBy || null,
      ModifyAt: new Date(),
      ModifyBy: req.body.ModifyBy || null,
    };

    const result = await db.collection('tbllokorderstatus').insertOne(orderstatusItem);
    sendResponse(res, "orderstatus inserted successfully.", null, result, null);
  } catch (error) {
    console.error("Error in createorderstatus:", error);
    next(error);
  }
};

exports.updateorderstatus = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tbllokorderstatus');

    const { OrderStatusID } = req.body;

    if (!OrderStatusID) {
      return res.status(400).json({ success: false, message: "OrderStatusID is required" });
    }

    const updateFields = {
      EnOrderStatusName: req.body.EnOrderStatusName,
      ArOrderStatusName: req.body.ArOrderStatusName,
      IsDataStatus: req.body.IsDataStatus,
      ModifyAt: new Date(),
      ModifyBy: req.body.ModifyBy || null,
    };

    const updateResult = await collection.updateOne(
      { OrderStatusID: OrderStatusID },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No orderstatus found to update" });
    }

    return res.status(200).json({ success: true, message: "orderstatus updated successfully" });
  } catch (error) {
    console.error("Update orderstatus Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.delorderstatus = async (req, res, next) => {
  const { OrderStatusID } = req.body;
  if (!OrderStatusID) {
    return sendResponse(res, "OrderStatusID is required", null, null, 400);
  }

  try {
    const db = await connectToMongoDB();

    const orderDetailExists = await db.collection('tblOrderDetails').findOne({ OrderStatusID });

    if (orderDetailExists) {
      return sendResponse(res, "orderstatus cannot be deleted. It exists in order details.", null, null, 400);
    }

    await db.collection('tbllokorderstatus').deleteOne({ OrderStatusID });

    return sendResponse(res, "orderstatus deleted successfully", null, null, 200);
  } catch (error) {
    console.error("Error in delorderstatusByID:", error);
    return sendResponse(res, "Internal Server Error", null, error.message, 500);
  }
};
