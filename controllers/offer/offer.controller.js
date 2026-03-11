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

 exports.getoffers = async (req, res, next) => {
  try {
    const { page = 1, limit = 5 } = req.body;

    const db = await connectToMongoDB();
    const collection = db.collection("tbloffer");

    const skip = (page - 1) * limit;

    // Fetch offers with pagination
    const offers = await collection.aggregate([
      {
        $project: {
          OfferCode : 1,
          OfferID: 1,
          OfferName: 1,
          OfferStartDate: 1,
          OfferEndDate: 1,
          IsDataStatus: 1,
          OfferAmount: 1,
          CreatedAt: 1,
          CreatedDate: 1,
          ModifyAt: 1,
          ModifyDate: 1,
        }
      },
      { $sort: { CreatedAt: -1 } }, // Sort by CreatedAt descending
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const totalCount = await collection.countDocuments();
//console.log(offers);
    sendResponse(res, "Offers found.", null, offers, totalCount);
  } catch (error) {
    console.error("Error in getAllOffersList:", error);
    next(error);
  }
};

const { ObjectId } = require("mongodb"); // Ensure this is imported at the top

exports.getoffersbyID = async (req, res, next) => {
  try {
    const { page = 1, limit = 5, OfferID } = req.body;

    const db = await connectToMongoDB();
    const collection = db.collection("tbloffer");

    const skip = (page - 1) * limit;

    // Build optional filter
    const filter = {};
    if (OfferID) {
      filter.OfferID = OfferID;
    }

    // Fetch offers with pagination and optional filter
    const offers = await collection.aggregate([
      { $match: filter },
      {
        $project: {
          OfferID: 1,
          OfferName: 1,
          OfferStartDate: 1,
          OfferEndDate: 1,
          IsDataStatus: 1,
          OfferAmount: 1,
          CreatedAt: 1,
          CreatedDate: 1,
          ModifyAt: 1,
          ModifyDate: 1,
        }
      },
      { $sort: { CreatedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const totalCount = await collection.countDocuments(filter);

    sendResponse(res, "Offers found.", null, offers[0], totalCount);
  } catch (error) {
    console.error("Error in getoffers:", error);
    next(error);
  }
};


exports.createOffer = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    // Prepare new offer object
    const offerItem = {
      ...req.body,
      OfferID: generateUniqueId(),  // You should have a function to generate unique IDs
      CreatedAt: new Date(),
      CreatedDate: new Date(),
      ModifyAt: new Date(),
      ModifyDate: new Date(),
    };

    const result = await db.collection('tbloffer').insertOne(offerItem);
    sendResponse(res, "Offer inserted successfully.", null, result, null);
  } catch (error) {
    console.error("Error in createOffer:", error);
    next(error);
  }
};

exports.updateofferbyID = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tbloffer');

    const { OfferID } = req.body;

    if (!OfferID) {
      return res.status(400).json({ success: false, message: "OfferID is required" });
    }

    const updateFields = {
      OfferName: req.body.OfferName,
      OfferStartDate: req.body.OfferStartDate,
      OfferEndDate: req.body.OfferEndDate,
      IsDataStatus: req.body.IsDataStatus,
      OfferAmount: req.body.OfferAmount,
      ModifyAt: new Date(),
      ModifyDate: new Date(),
    };

    const updateResult = await collection.updateOne(
      { OfferID: OfferID },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No offer found to update" });
    }

    return res.status(200).json({ success: true, message: "Offer updated successfully" });
  } catch (error) {
    console.error("Update Offer Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
 
exports.delofferByID = async (req, res, next) => {
  const { OfferID } = req.body;
  console.log('OfferIDOfferID=');
console.log(OfferID);
  if (!OfferID) {
    return sendResponse(res, "OfferID is required", null, null, 400);
  }

  try {
    const db = await connectToMongoDB();

    const orderDetailExists = await db.collection('tblOrderDetails').findOne({ OfferID });

    if (orderDetailExists) {
      return sendResponse(res, "offer cannot be deleted. It exists in order details.", null, null, 400);
    }

    // Proceed with deletion
    await db.collection('tbloffer').deleteOne({ OfferID });
 
    return sendResponse(res, "offer deleted successfully", null, null, 200);
  } catch (error) {
    console.error("Error in delofferByID:", error);
    return sendResponse(res, "Internal Server Error", null, error.message, 500);
  }
};

 