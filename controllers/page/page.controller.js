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
 
const { v4: uuidv4 } = require('uuid');

function generateUniqueId() { 
    length=25; 
  const uuid = uuidv4().replace(/-/g, '');
  return uuid.substring(0, length); 
}
 
exports.getpageinfo = async (req, res, next) => { 
 
   
  const db = await connectToMongoDB();
  const PageTagVal = req.body.PageTag;
  const mainCategories = db.collection('tblpages');
  
  // Perform aggregation with multiple $lookup stages
  const result = await mainCategories.aggregate([
    { 
      $match: { PageTag: PageTagVal } // Filter by OrderRefNo
    },
    
  ]).toArray();
  
  
  // Send the final response with the fetched data
  sendResponse(res, "  Data fetched successfully.", null, result[0]);
  
  };
 

exports.createpage = async (req, res, next) => {
 
    const db = await connectToMongoDB();
    const updatedData = {
      PageName : req.body.PageName,
      PageDesc : req.body.PageDesc,
      PageTag: req.body.PageTag,
      createdBy: "", 
      createdAt: new Date(),    
      modifiedBy: "", 
      modifiedAt: new Date(),  
      ISDataStaus: 1,    
      PageID: generateUniqueId(),    
      
    }; 
    const result = await db.collection('tblpages').insertOne(updatedData); 
    result.status="OK"; 
    sendResponse(res, "Page successfully Added.", null, result);
    
   
}; 