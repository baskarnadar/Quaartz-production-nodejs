const { connectToMongoDB } = require("../../database/mongodb");

// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'results': results,
    'error': error,
  });
}

exports.getItems = async (req, res, next) => {
  try {
     console.log('error');
    const db = await connectToMongoDB();
    const items = await db.collection('items').find().toArray();
    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.createItem = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const item = req.body;
    const result = await db.collection('items').insertOne(item);
    sendResponse(res, "Item inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
