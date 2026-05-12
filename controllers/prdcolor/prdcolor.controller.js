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


exports.old_getprdcolorbyid = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID; 
    const db = await connectToMongoDB();
    
   const collection = await db.collection('tblProductColor'); 
   collection.find({ ProductID: ProductID }).toArray()
   .then(documents => {
    sendResponse(res, "Color  successfully.",  null , documents);
   })
   .catch(err => {
    sendResponse(res, "No Color  ",  null , documents);
   });
 
  } catch (error) {
    console.log(error);
    next(error);
  }
};
exports.getprdcolorbyid = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID;

    if (!ProductID || String(ProductID).trim() === "") {
      return sendResponse(
        res,
        "ProductID is required.",
        "ProductID is required.",
        []
      );
    }

    const db = await connectToMongoDB();

    const productColorCollection = db.collection("tblProductColor");
    const specialColorCollection = db.collection("tblPrdSpecialColor");

    // ✅ Get all product colors
    const productColors = await productColorCollection
      .find({ ProductID: ProductID })
      .toArray();

    const finalColors = [];

    for (const color of productColors) {
      const ColorKeyCode = String(color.ColorKeyCode || "").trim();

      // ✅ If ColorKeyCode exists, expand from tblPrdSpecialColor
      if (ColorKeyCode !== "") {
        const specialColors = await specialColorCollection
          .find({ ColorKeyCode: ColorKeyCode })
          .toArray();

        if (specialColors.length > 0) {
          specialColors.forEach((spColor) => {
            finalColors.push({
              _id: spColor._id, // from tblPrdSpecialColor
              EnPrdColorName: spColor.EnColorName || "",
              ArPrdColorName: spColor.ArColorName || "",
              PrdColorCode: spColor.SplColorCodeID || "", // color code
              ProductID: ProductID, // keep same product
              PrdColorCodeID: spColor.SplColorCodeIDPrKey || "", // required
              SplColorCodeIDPrKey: spColor.SplColorCodeIDPrKey || "", // ✅ Added
              ColorKeyCode: spColor.ColorKeyCode || ColorKeyCode,
            });
          });
        } else {
          // fallback original record
          finalColors.push(color);
        }
      } else {
        // normal colors
        finalColors.push(color);
      }
    }

    return sendResponse(res, "Color successfully.", null, finalColors);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
exports.getprdcolorbycolorcode = async (req, res, next) => {
  try {
    const PrdColorCode = req.body.PrdColorCode; 
    const db = await connectToMongoDB();
    
   const collection = await db.collection('tblProductColor'); 
   collection.find({ PrdColorCode: PrdColorCode }).toArray()
   .then(documents => {
    sendResponse(res, "Color  successfully.",  null , documents);
   })
   .catch(err => {
    sendResponse(res, "No Color  ",  null , documents);
   });
 
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.getprdcolorlist = async (req, res, next) => {
  try {
   
    const db = await connectToMongoDB();
    
   const collection = await db.collection('tblProductColor'); 
   collection.find().toArray()
   .then(documents => {
    sendResponse(res, "Color  successfully.",  null , documents);
   })
   .catch(err => {
    sendResponse(res, "No Color  ",  null , documents);
   });
 
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.editPrdColor = async (req, res, next) => {
  const { PrdColorCodeID, ProductID, EnPrdColorName,ArPrdColorName,PrdColorCode } = req.body;  // Assuming `updatedData` contains fields to update

  const updatedData = {
    EnPrdColorName: EnPrdColorName,
    ArPrdColorName: ArPrdColorName,
    modifiedAt: new Date(),
    PrdColorCode:PrdColorCode
  };
  const db = await connectToMongoDB();
  try {
    // Connect to the database and run a query to update
    // Example: Using native MongoDB driver or another approach
    const result = await db.collection('tblProductColor').updateOne(
      { PrdColorCodeID: PrdColorCodeID, ProductID: ProductID },  // Filter conditions
      { $set: updatedData }  // The updated data to apply
    );
  
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Product color not found or update failed.' });
    }
  
    return res.status(200).json({ message: 'Product color updated successfully.', data: updatedData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error, please try again.' });
  }
  
};

 exports.addPrdColor = async (req, res, next) => {
   try {
     const db = await connectToMongoDB();
     

     const Productitem = {
        EnPrdColorName:  req.body.EnPrdColorName,
        ArPrdColorName:  req.body.ArPrdColorName,
        modifiedAt: new Date(),
        createdAt: new Date(),
        PrdColorCode: req.body.PrdColorCode,
        ProductID: req.body.ProductID,
        PrdColorCodeID :generateUniqueId(),
        createdBy: "USER",
        updatedBy: "USER",
        IsDataStatus:1,
    };

     const result = await db.collection('tblProductColor').insertOne(Productitem);
     sendResponse(res, "Product Color inserted successfully.",  null , Productitem);
   } catch (error) {
     console.log(error);
     next(error);
   }
 };
 exports.delPrdColor = async (req, res, next) => {
  const { PrdColorCodeID, ProductID } = req.body;  // Extract data from the request body

  const db = await connectToMongoDB();  // Connect to the MongoDB database
  try {
    // Run a delete operation to remove the color from the database
    const result = await db.collection('tblProductColor').deleteOne(
      { PrdColorCodeID: PrdColorCodeID, ProductID: ProductID }  // The filter for deleting the color
    );
  
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Product color not found or delete failed.' });
    }
  
    return res.status(200).json({ message: 'Product color deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error, please try again.' });
  }
};


 
 exports.getcolorkeycodelist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const collection = db.collection("tblprdColorKeyCode");

    const documents = await collection
      .find({})
      .project({
        _id: 1,
        ColorKeyCodeID: 1,
        ColorKeyCode: 1,
        ColorKeyCodeEnName: 1,
        ColorKeyCodeArName: 1,
      })
      .toArray();

    return sendResponse(
      res,
      "Color key code list fetched successfully.",
      null,
      documents
    );
  } catch (error) {
    console.log(error);
    return sendResponse(
      res,
      "Failed to fetch color key code list.",
      true,
      []
    );
  }
};
 
   
 
exports.getcolorkeycodelistbyid = async (req, res, next) => {
  try {
    const ColorKeyCode = String(req.body?.ColorKeyCode ?? "").trim();

    // ✅ Default PageSize = 50
    const PageNo = Math.max(parseInt(req.body?.PageNo ?? 1, 10), 1);
    const PageSize = Math.min(Math.max(parseInt(req.body?.PageSize ?? 50, 10), 1), 100);
    const skip = (PageNo - 1) * PageSize;

    if (!ColorKeyCode) {
      return sendResponse(res, "ColorKeyCode is required.", true, []);
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblPrdSpecialColor");

    const matchQuery = {
      $expr: {
        $eq: [
          { $toUpper: { $trim: { input: "$ColorKeyCode" } } },
          ColorKeyCode.toUpperCase()
        ]
      }
    };

    const totalRecords = await collection.countDocuments(matchQuery);

    const documents = await collection
      .find(matchQuery)
      .project({
        SplColorCodeIDPrKey: 1,
        HexValue: 1,
        EnColorName: 1,
        ArColorName: 1,
      })
      .sort({ EnColorName: 1 })
      .skip(skip)
      .limit(PageSize)
      .toArray();

    return sendResponse(
      res,
      "Special color list fetched successfully.",
      null,
      {
        PageNo,
        PageSize,
        TotalRecords: totalRecords,
        TotalPages: Math.ceil(totalRecords / PageSize),
        Data: documents,
      },
      documents.length
    );

  } catch (error) {
    console.log(error);
    return sendResponse(
      res,
      "Failed to fetch special color list.",
      true,
      []
    );
  }
};