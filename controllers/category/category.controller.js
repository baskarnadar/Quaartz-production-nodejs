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

exports.getCategory = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const items = await db.collection('tblCategory').find().toArray();
    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
}; 

exports.delCategorybyID = async (req, res, next) => {
  try {
  const db = await connectToMongoDB();
  const { CategoryID } = req.body;   
  if (!CategoryID) {
  return sendResponse(res, "CategoryID is required", "Missing CategoryID", null);
  }
  const result = await db.collection('tblProductCategory').deleteOne({ CategoryID });
  if (result.deletedCount === 0) {
  return sendResponse(res, "No Category found with the provided CategoryID", null, null);
  }
  sendResponse(res, "Category deleted successfully.", null, result);
  } catch (error) {
  console.log(error);
  next(error);
  }
};
