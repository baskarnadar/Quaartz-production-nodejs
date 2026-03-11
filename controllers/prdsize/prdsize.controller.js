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

exports.getallproductsize = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID; 
    const PrdColorCodeID=req.body.PrdColorCodeID; 
    const db = await connectToMongoDB();
    
   const collection = await db.collection('tblProductSize'); 
   collection.find({ ProductID: ProductID,PrdColorCodeID:PrdColorCodeID }).toArray()
   .then(documents => {
    sendResponse(res, "Size  successfully.",  null , documents);
   })
   .catch(err => {
    sendResponse(res, "No Color  ",  null , documents);
   });
 
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getprdsizebyid = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID; 
    const PrdColorCodeID=req.body.PrdColorCodeID; 
    const db = await connectToMongoDB();
    
   const collection = await db.collection('tblProductSize'); 
   collection.find({ ProductID: ProductID,PrdColorCodeID:PrdColorCodeID }).toArray()
   .then(documents => {
    sendResponse(res, "Size  successfully.",  null , documents);
   })
   .catch(err => {
    sendResponse(res, "No Color  ",  null , documents);
   });
 
  } catch (error) {
    console.log(error);
    next(error);
  }
};
exports.createProductSize = async (req, res, next) => {

  // Define the order data object
  const ItemData = {
    ...    req.body,
    PrdSizeID :generateUniqueId(),
  
  };


  try {
    const db = await connectToMongoDB();
    const result = await db.collection('tblProductSize').insertOne(ItemData);
    sendResponse(res, "Size inserted successfully.",  null , result,null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.delProductSize = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const prdSizeID = req.body.PrdSizeID;

    // Check if the product size is used in tblorderdetails
    const isUsed = await db.collection('tblorderdetails').findOne({ PrdSizeID: prdSizeID });

    if (isUsed) {
      return sendResponse(res, "Product size is still used in orders and cannot be deleted.", null, null, null);
    }

    // Proceed with deletion if not used
    const result = await db.collection('tblProductSize').deleteOne({ PrdSizeID: prdSizeID });

    if (result.deletedCount === 0) {
      return sendResponse(res, "No size found with the specified PrdSizeID.", null, null, null);
    }

    sendResponse(res, "Size deleted successfully.", null, result, null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


 exports.getprdsize = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const prdSizeID = req.body.PrdSizeID;

    // Fetch the size record based on PrdSizeID
    const sizeRecord = await db.collection('tblProductSize').findOne({ PrdSizeID: prdSizeID });

    if (!sizeRecord) {
      return sendResponse(res, "No product size found with the specified PrdSizeID.", null, null, null);
    }

    sendResponse(res, "Product size fetched successfully.", sizeRecord, null, null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.updateprdsize = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const prdSizeID = req.body.PrdSizeID;

    const updateFields = {
      EnPrdSizeName: req.body.EnPrdSizeName,
      ArPrdSizeName: req.body.ArPrdSizeName,
      PrdAmount: req.body.PrdAmount,
      ModifyBy: req.body.ModifyBy || "SYSTEM",
      ModifyAt: new Date(),
    };

    const result = await db.collection('tblProductSize').updateOne(
      { PrdSizeID: prdSizeID },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return sendResponse(res, "No product size found with the specified PrdSizeID.", null, null, null);
    }

    sendResponse(res, "Product size updated successfully.", null, result, null);
  } catch (error) {
    console.error(error);
    next(error);
  }
};


 
 
 
   
 
 

 