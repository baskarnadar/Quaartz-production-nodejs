const { connectToMongoDB } = require("../../database/mongodb");

// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'data': results,
    'error': error,
  });
}


exports.getBanner = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const items = await db.collection('tblBanner').find().toArray();
    const url =process.env.IMAGEURL+"banner/";
    

    for (const product of items) {
 
      product.BannerImageUlr =  url+product.BannerImage; 
      
  } 

    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 

exports.createBanner = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const item = req.body;
    const result = await db.collection('tblBanner').insertOne(item);
    sendResponse(res, "Item inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.getLang = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const items = await db.collection('tbllangpack').find().toArray();
    const url =process.env.IMAGEURL+"files/icon/";
    

    for (const product of items) {
 
      product.LangIconUrl =  url+product.LangIcon; 
      product.LangIcon =  url+product.LangIcon; 
      
  } 

    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 

exports.createLang = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const item = req.body;
    const result = await db.collection('tbllangpack').insertOne(item);
    sendResponse(res, "Item inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
