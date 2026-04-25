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




exports.getMainandSubCategories = async (req, res, next) => {
 
 
  const ImageCategoryVal =process.env.IMAGEURL+"subcategory/";
 
    
const db = await connectToMongoDB();
    const mainCategories = db.collection('tblProductCategory');  // Main Categories collection
    const subCategories = db.collection('tblSubProductCategory');  // Subcategories collection
  
    const result= mainCategories.aggregate([
      {
        $lookup: {
          from: 'V1TblSubProductCategory',  // The collection to join
          localField: 'PrdCategoryID',        // Field from main_categories
          foreignField: 'PrdCategoryID',  // Field from sub_categories
          as: 'subcategories'      // The name of the new array field in the result
        }
      }
    ]).toArray() .then(result => {
    // Loop through each main category and its subcategories
    result.forEach(mainCategory => {
     
      console.log(`Main Category: ${mainCategory.EnPrdCategoryName}`);
      mainCategory.subcategories.forEach(subcategory => {

        subcategory.PrdSubCategoryImageUrl =ImageCategoryVal+ subcategory.PrdSubCategoryImage; 

        console.log(`  - ${subcategory.ArPrdSubCategoryName}`);
      });
      console.log('---');
    });

    sendResponse(res, "Data fetched successfully .", null , result);
  })
  

  
};


exports.oldcategories = async (req, res, next) => {
  try {
    const subcatresult ="";
    const url =process.env.IMAGEURL+"Product/";
    const db = await connectToMongoDB();
    var ImageCategoryVal=url+"SubCategory/" 
    
    const mainCategoriesResult = await db.collection('tblProductCategory').find().toArray();
    //const mainCategoriesResult = await mainCategoriesdata.find().toArray();
  
    const subcategoriesResult = await db.collection('tblSubProductCategory').find().toArray();
    //const subcategoriesResult = await subcategoriesData.find().toArray();
  
    for (const subcatiteam of subcategoriesResult) {
         
      subcatiteam.PrdSubCategoryImageUrl = subcatiteam.PrdSubCategoryImage+ImageCategoryVal; 
        subcatresult = await collection.updateOne(query, updateDoc); 
  } 


  const categoriesWithSubcategories = mainCategoriesResult.map(category => {
    return {
      ...category,
      subcatresult: subcatresult.findOne(sub => sub.PrdCategoryID === category.PrdCategoryID)
    };
  });
  
    sendResponse(res, "Data fetched successfully .", null , JSON.stringify(categoriesWithSubcategories, null, 2));
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getProductSubCategory = async (req, res, next) => {
  try {
    var url =process.env.IMAGEURL+"Product/";
    const db = await connectToMongoDB();
    const items = await db.collection('tblSubProductCategory').find().toArray();
    const products = await items.find().toArray();
    var ImageCategoryVal=url+"SubCategory/" 

    for (const product of products) {
         
      product.PrdSubCategoryImageUrl = ImageCategoryVal+product.PrdSubCategoryImage; 
     
      
  } 
    sendResponse(res, "Data fetched successfully .", null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 
 exports.getProductCategory = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const url = process.env.IMAGEURL + "Product/";
    const PrdCategoryImageUrl = url + "Category/";

    // Fetch categories sorted by createdAt descending
    const items = await db
      .collection('tblProductCategory')
      .find()
      .sort({ createdAt: -1 }) // 👈 Sort newest first
      .toArray();

    // Append image URLs
    for (const product of items) {
      product.PrdCategoryImageUrl = PrdCategoryImageUrl + product.PrdCategoryImage;
    }

    sendResponse(res, "Data fetched successfully.", null, items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


const { v4: uuidv4 } = require('uuid');
function generateUniqueId() { 
  length=25; 
const uuid = uuidv4().replace(/-/g, '');
return uuid.substring(0, length); 
}
exports.createProductCategory = async (req, res, next) => {

  const GetDataVal = req.body; 
  
  let LogDataVal = { 
    createdBy: req.body.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(), 
    updatedBy:  req.body.updatedBy, 
  };  

  let InsertDataVal = {
    ...GetDataVal, 
    ...LogDataVal, 
    CategoryID : generateUniqueId(), 
  };  
 
  try {
    const db = await connectToMongoDB();
    const item = req.body;
    const result = await db.collection('tblProductCategory').insertOne(InsertDataVal);
    sendResponse(res, "category  inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.createProductSubCategory = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const item = req.body;
    const result = await db.collection('V1TblSubProductCategory').insertOne(item);
    sendResponse(res, "Sub category  inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 
exports.getProductSubCategory = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const items = await db.collection('V1TblSubProductCategory').find().toArray();
    const url =process.env.IMAGEURL+"Product/";
    var PrdCategoryImageUrl=url+"SubCategory/" 

    for (const product of items) {
 
      product.PrdCategoryImageUrl =PrdCategoryImageUrl+ product.PrdCategoryImage; 
      
  } 

    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.updateProductCategory = async (req, res, next) => {
  try {
    const CategoryID = String(req.body?.CategoryID || "").trim();
    const EnCategoryName = String(req.body?.EnCategoryName || "").trim();
    const ArCategoryName = String(req.body?.ArCategoryName || "").trim();

    // ✅ Validation
    if (!CategoryID) {
      return sendResponse(res, "CategoryID is required.", true, null);
    }

    if (!EnCategoryName) {
      return sendResponse(res, "English Category Name is required.", true, null);
    }

    if (!ArCategoryName) {
      return sendResponse(res, "Arabic Category Name is required.", true, null);
    }

    const db = await connectToMongoDB();

    // ✅ Check if exists
    const existing = await db.collection('tblProductCategory').findOne({
      CategoryID: CategoryID
    });

    if (!existing) {
      return sendResponse(res, "Category not found.", true, null);
    }

    // ✅ Update Data
    const updateData = {
      EnCategoryName: EnCategoryName,
      ArCategoryName: ArCategoryName,
      updatedAt: new Date(),
      updatedBy: req.body.updatedBy || null,
    };

    const result = await db.collection('tblProductCategory').updateOne(
      { CategoryID: CategoryID },
      { $set: updateData }
    );

    return sendResponse(res, "Category updated successfully.", false, result);

  } catch (error) {
    console.log("updateProductCategory error:", error);
    next(error);
  }
};
