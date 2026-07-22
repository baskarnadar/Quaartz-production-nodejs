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


exports.getProductSpec = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID;
    console.log(ProductID);
    const query = { productId: ProductID };
    const db = await connectToMongoDB();
   
   
   const collection = await db.collection('tblProductSpec');

   collection.find({ ProductID: ProductID }).toArray()
   .then(documents => {
    sendResponse(res, "Spec  successfully.",  null , documents,null);
   })
   .catch(err => {
    sendResponse(res, "No Spec  ",  null , documents,null);
   });

    
  } catch (error) {
    console.log(error);
    next(error);
  }
};

 exports.createProductSpec = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    // =========================================================
    // Get and validate request data
    // =========================================================
    const ProductID = String(req.body?.ProductID || "").trim();
    const PrdSpecDesc = String(req.body?.PrdSpecDesc || "").trim();

    if (!ProductID) {
      return sendResponse(
        res,
        "ProductID is required.",
        true,
        null,
        null
      );
    }

    if (!PrdSpecDesc) {
      return sendResponse(
        res,
        "Product specification description is required.",
        true,
        null,
        null
      );
    }

    const productSpecCollection = db.collection("tblProductSpec");

    // =========================================================
    // Check whether ProductID already exists
    // =========================================================
    const existingProductSpec = await productSpecCollection.findOne({
      ProductID: ProductID,
    });

    // =========================================================
    // Update existing product specification
    // =========================================================
    if (existingProductSpec) {
      const updateResult = await productSpecCollection.updateOne(
        {
          ProductID: ProductID,
        },
        {
          $set: {
            PrdSpecDesc: PrdSpecDesc,
            UpdatedDate: new Date(),
          },
        }
      );

      return sendResponse(
        res,
        "Product specification updated successfully.",
        null,
        {
          ProductID: ProductID,
          PrdSpecDesc: PrdSpecDesc,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
        },
        null
      );
    }

    // =========================================================
    // Insert new product specification
    // =========================================================
    const productSpecItem = {
      ProductID: ProductID,
      PrdSpecDesc: PrdSpecDesc,
      CreatedDate: new Date(),
      UpdatedDate: new Date(),
    };

    const insertResult = await productSpecCollection.insertOne(
      productSpecItem
    );

    return sendResponse(
      res,
      "Product specification inserted successfully.",
      null,
      {
        ...productSpecItem,
        insertedId: insertResult.insertedId,
      },
      null
    );
  } catch (error) {
    console.error("[createProductSpec] Error:", error);
    next(error);
  }
};





exports.getProductSize = async (req, res, next) => {
  
  const ProductID = req.body.ProductID;
  const query = { productId: ProductID };
  try {
    var url =process.env.IMAGEURL+"product/";
    const db = await connectToMongoDB();
    const items = await db.collection('tblProductSize').findOne(query).toArray(); 
    const products = await items.find().toArray();
    var PrdSizeVal=url+"PrdSize/"
    for (const product of products) {
         
      product.PrdSizeImageUrl = product.PrdGridList+PrdSizeVal;
        
      const result = await collection.updateOne(query, updateDoc);
      
  } 
    sendResponse(res, "Data fetched successfully .", null , result,null);
  } catch (error) {
    console.log(error);
    next(error);
  }

};


 exports.getProductByColor = async (req, res, next) => {
  const url =process.env.IMAGEURL+"product/";
  try {
    const { ProductColorName, ArPrdColorName, PrdColorCode } = req.body;
    console.log("Filters received:", { ProductColorName, ArPrdColorName, PrdColorCode });

    const db = await connectToMongoDB();
    const colorCollection = db.collection('tblProductColor');
    const productCollection = db.collection('tblProduct');

    // Step 1: Build dynamic filter
    const colorFilter = {};
    if (ProductColorName) colorFilter.EnPrdColorName = ProductColorName;
    if (ArPrdColorName) colorFilter.ArPrdColorName = ArPrdColorName;
    if (PrdColorCode) colorFilter.PrdColorCode = PrdColorCode;

    // Step 2: Find color documents based on filter
    const colorDocs = await colorCollection.find(colorFilter).toArray();

    if (!colorDocs.length) {
      return sendResponse(res, "No products found matching the color criteria.", null, [], null);
    }

    // Step 3: Extract ProductIDs
    const productIds = colorDocs.map(doc => doc.ProductID);

    // Step 4: Find matching products in tblProduct
    const productDocs = await productCollection.find({
      ProductID: { $in: productIds }
    }).toArray();

  const GridListUrl=url+"gridlist/"
  const LargeUrl=url+"large/"
  const ThumbUrl=url+"thumb/"
  const BannerUrl=url+"banner/"


     for (const product of productDocs) {
         
      product.PrdGridListUrl = GridListUrl+product.PrdGridList;
      product.PrdThumbImageUrl = ThumbUrl+product.PrdThumb;
      product.PrdLargeImageUrl = LargeUrl+product.PrdLarge;
      product.PrdBannerImageUrl =BannerUrl+ product.PrdBanner;
      
     
      
  } 

    return sendResponse(res, "Products retrieved successfully.", null, productDocs, null);

  } catch (error) {
    console.error("Error in getProductByColor:", error);
    return sendResponse(res, "Server Error", error.message, null, null);
  }
};


 exports.getProductByProductID = async (req, res, next) => {
    const url =process.env.IMAGEURL+"product/";
  try {
    const ProductID = req.body.ProductID;

    if (!ProductID) {
      return sendResponse(res, "ProductID is required", null, null, null);
    }

    const db = await connectToMongoDB();
    const collection = db.collection('tblProduct');

    // Fetch product by ProductID
    const documents = await collection.find({ ProductID }).toArray();

    if (!documents || documents.length === 0) {
      return sendResponse(res, "No product found", null, null, null);
    }

    // Build image URLs
    const baseUrl = url || ''; // Ensure url is defined
    const GridListUrl = baseUrl + "gridlist/";
    const LargeUrl = baseUrl + "large/";
    const ThumbUrl = baseUrl + "thumb/";
    const BannerUrl = baseUrl + "banner/";
    const imageURL = baseUrl + "images/";

    // Attach image URLs
    documents.forEach(product => {
      product.PrdGridListUrl = GridListUrl + product.PrdGridList;
      product.PrdThumbImageUrl = ThumbUrl + product.PrdThumb;
      product.PrdLargeImageUrl = LargeUrl + product.PrdLarge;
      product.PrdBannerImageUrl = BannerUrl + product.PrdBanner;
      product.ProductImageUrl = imageURL + product.PrdThumb;
    });

    // Return single product if found
    sendResponse(res, "Product Found.", null, documents[0], null);

  } catch (error) {
    console.error("Error in getProductByProductID:", error);
    next(error);
  }
};


exports.createProduct = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const Productitem = {
      ...req.body,
      ProductID:generateUniqueId(),
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    const result = await db.collection('tblProduct').insertOne(Productitem);
    sendResponse(res, "Product inserted successfully.", null, result, null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.getProduct = async (req, res, next) => {
  try {
    const url =process.env.IMAGEURL+"product/";
    const db = await connectToMongoDB();
    const items = await db.collection('tblProduct').find().toArray();
   
    const GridListUrl=url+"gridlist/"
    const LargeUrl=url+"large/"
    const ThumbUrl=url+"thumb/"
    const BannerUrl=url+"banner/"
    const imageURL=url+"images/"

    for (const product of items) {
         
      product.PrdGridListUrl = GridListUrl+product.PrdGridList;
      product.PrdThumbImageUrl = ThumbUrl+product.PrdThumb;
      product.PrdLargeImageUrl = LargeUrl+product.PrdLarge;
      product.PrdBannerImageUrl =BannerUrl+ product.PrdBanner;
        product.ProductImageUrl =imageURL+ product.PrdThumb;
      
      
  } 
    sendResponse(res, "Data fetched successfully .", null , items,null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.getProductColor = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID;
    const query = { productId: ProductID };
    const db = await connectToMongoDB();
    const items = await db.collection('tblProductColor').find().toArray();
    sendResponse(res, "Data fetched successfully .", null , items,null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getProductColorByID = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID;
    const query = { productId: ProductID };
    const db = await connectToMongoDB();
    const items = await db.collection('tblProductColor').findOne(query).toArray();
    sendResponse(res, "Data fetched successfully .", null , items,null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.createProductColor = async (req, res, next) => {

 

  // Define the order data object
  const ItemData = {
    ...    req.body,
    PrdColorCodeID :generateUniqueId(),
  
  };

  try {
    const db = await connectToMongoDB();
   
    const result = await db.collection('tblProductColor').insertOne(ItemData);
    sendResponse(res, "Product color inserted successfully.",  null , result,null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 exports.getAllProductsList = async (req, res, next) => {
  const url = process.env.IMAGEURL + "product/";

  try {
    const { page = 1, limit = 5 } = req.body;

    const db = await connectToMongoDB();
    const collection = db.collection("tblProduct");

    const skip = (page - 1) * limit;

    const products = await collection.aggregate([
      {
        $lookup: {
          from: "tblProductCategory",
          localField: "CategoryID",
          foreignField: "CategoryID",
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $project: {
          PrdDiscount : 1,
          ProductID: 1,
          PrdCodeNo: 1,
          PrdName: 1,
          ArPrdName: 1,
          PrdThumb: 1,
          PrdLarge: 1,
          PrdBanner: 1,
          PrdGridList: 1,
          PrdDesc: 1,
          PrdAmount: 1,
          PrdColorCode: 1,
          modifyAt: 1,
          createdAt: 1,
          IsDataStatus: 1,
          CategoryID: 1,
          EnCategoryName: "$category.EnCategoryName",
          ArCategoryName: "$category.ArCategoryName"
        }
      },
      { $sort: { createdAt: -1 } }, // Order by createdAt DESC
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    // Image URL building
    const GridListUrl = url + "gridlist/";
    const LargeUrl = url + "large/";
    const ThumbUrl = url + "thumb/";
    const BannerUrl = url + "banner/";
    const imageURL = url + "images/";

    for (const product of products) {
      product.PrdGridListUrl = GridListUrl + product.PrdGridList;
      product.PrdThumbImageUrl = ThumbUrl + product.PrdThumb;
      product.PrdLargeImageUrl = LargeUrl + product.PrdLarge;
      product.PrdBannerImageUrl = BannerUrl + product.PrdBanner;
      product.ProductImageUrl = imageURL + product.PrdThumb;
    }

    const totalCount = await collection.countDocuments();

    sendResponse(res, "Products Found.", null, products, totalCount);
  } catch (error) {
    console.error("Error in getAllProductsList:", error);
    next(error);
  }
};



//--------------product Size---------------------------------


exports.getProductSizeAll = async (req, res, next) => {
  try {
    
    const db = await connectToMongoDB();
    const items = await db.collection('tblProductSize').find().toArray();
    sendResponse(res, "Data fetched successfully .", null , items,null);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getProductSize = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID;
    console.log(ProductID);
    const query = { productId: ProductID };
    const db = await connectToMongoDB();
    const items = await db.collection('tblProductSize').find().toArray();
   // sendResponse(res, "Spec inserted successfully.",  null , items,null);
    
   
   const collection = await db.collection('tblProductSize');

   collection.find({ ProductID: ProductID }).toArray()
   .then(documents => {
    sendResponse(res, "Spec fetech successfully.",  null , documents,null);
   })
   .catch(err => {
    sendResponse(res, "No Spec  ",  null , documents,null);
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

exports.Oldgetcategoryproductlist = async (req, res, next) => {

  const url =process.env.IMAGEURL+"product/";  
  const GridListUrl=url+"gridlist/"
  const LargeUrl=url+"large/"
  const ThumbUrl=url+"thumb/"
  const BannerUrl=url+"banner/"
  const imageURL=url+"images/"

  const db = await connectToMongoDB();

  // Get the current location's latitude and longitude from the request
  const { currentLat, currentLon } = req.body;  // Assuming these values are passed in the request body

  try {
      // Get references to the collections
      const CategoryCollection = db.collection("tblProductCategory");
      const productinfoCollection = db.collection("tblProduct");

      // Aggregation query to get cities and related products
      const result = await CategoryCollection.aggregate([
          {
              // Lookup the products related to each products based on CategoryID
              $lookup: {
                  from: "tblProduct", // The collection to join with
                  localField: "CategoryID", // The field from Tblproducts to match
                  foreignField: "CategoryID", // The field from TblproductInfo to match
                  as: "subproductinfos" // The new field to product the matching products
              }
          },
          {
              // Project the fields we want in the final result
              $project: {
                  CategoryID: 1,  
                  EnCategoryName: 1,
                  ArCategoryName: 1,
                  PrdName: 1, // Include English products name
                  ArPrdName: 1, // Include Arabic products name
                  subproductinfos: 1  , 
                  PrdThumb:1,
                  PrdLarge:1,
                  PrdBanner:1,
                  PrdGridList:1,
                  ProductID:1,
                  
              }
          }
      ]).toArray();

      
      


      // Iterate over each products and calculate the distance for each product
      const updatedResult = result.map(products => { 

          const { subproductinfos } = products;
          // For each product in the products, calculate the distance
          products.subproductinfos = subproductinfos.map(product => { 

            const { PrdThumb, PrdGridList,PrdLarge,PrdBanner } = product;
            console.log(PrdThumb);

            for (const prd of result) {
              product.ProductImage = imageURL+PrdThumb;
              product.PrdGridListUrl = imageURL+PrdThumb;
              product.PrdThumbImageUrl = imageURL+PrdThumb;
              product.PrdLargeImageUrl = imageURL+PrdThumb;
              product.PrdBannerImageUrl =imageURL+ PrdThumb;
               
          } 
           
             
                  return {
                      ...product,
                      
                  };
             
          });

      
        
          
       
          return products;
      });

      // Send the response with updated result
      sendResponse(res, "Data fetched successfully.", null, updatedResult);
     // console.log(updatedResult);
  } catch (error) {
      sendResponse(res, "Error", null, null,null);
      console.error(error);
  } finally {
      // Close the MongoDB client (or connection will be handled by the DB connection manager)
  }
};

 exports.getcategoryproductlist = async (req, res, next) => {
    const url = process.env.IMAGEURL + "product/";
    const imageURL = url + "images/";

    const db = await connectToMongoDB();

    // Extract values from request
    const { currentLat, currentLon, SearchValue, prdtype } = req.body;

    try {
        const CategoryCollection = db.collection("tblProductCategory");

        // Build dynamic search filter
        let searchFilter = {};
        if (SearchValue && SearchValue.trim() !== "") {
            const regex = new RegExp(SearchValue, "i"); // case-insensitive
            searchFilter = {
                $or: [
                    { PrdName: { $regex: regex } },
                    { ArPrdName: { $regex: regex } }
                ]
            };
        }

        // Add prdtype filter if not "ALL"
        if (prdtype && prdtype !== "ALL") {
            searchFilter.PrdType = prdtype;
        }

        // Aggregation
        const result = await CategoryCollection.aggregate([
            {
                $lookup: {
                    from: "tblProduct",
                    let: { catId: "$CategoryID" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$CategoryID", "$$catId"] },
                                ...searchFilter
                            }
                        }
                    ],
                    as: "subproductinfos"
                }
            },
            // ✅ Only include categories with at least one product
            {
                $match: {
                    "subproductinfos.0": { $exists: true }
                }
            },
            {
                $project: {
                    CategoryID: 1,
                    EnCategoryName: 1,
                    ArCategoryName: 1,
                    subproductinfos: 1
                }
            }
        ]).toArray();

        // Add image URLs for products
        const updatedResult = result.map(category => {
            category.subproductinfos = category.subproductinfos.map(product => {
                const { PrdThumb } = product;
                return {
                    ...product,
                    ProductImage: imageURL + PrdThumb,
                    PrdGridListUrl: imageURL + PrdThumb,
                    PrdThumbImageUrl: imageURL + PrdThumb,
                    PrdLargeImageUrl: imageURL + PrdThumb,
                    PrdBannerImageUrl: imageURL + PrdThumb
                };
            });
            return category;
        });

        sendResponse(res, "Data fetched successfully.", null, updatedResult);
    } catch (error) {
        console.error(error);
        sendResponse(res, "Error", null, null);
    }
};


 exports.updateProductID = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tblProduct');

    const { ProductID } = req.body;

    if (!ProductID) {
      return res.status(400).json({ success: false, message: "ProductID is required" });
    }

    const updateFields = {
      PrdCodeNo: req.body.PrdCodeNo,
      PrdName: req.body.PrdName,
      ArPrdName: req.body.ArPrdName,
      PrdThumb: req.body.PrdThumb,
      PrdLarge: req.body.PrdLarge,
      PrdBanner: req.body.PrdBanner,
      PrdGridList: req.body.PrdGridList,
       PrdDiscount: req.body.PrdDiscount,
      PrdDesc: req.body.PrdDesc,
      modifyAt: new Date(),
      CategoryID: req.body.CategoryID
    };

    const updateResult = await collection.updateOne(
      { ProductID: ProductID },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No product found to update" });
    }

    return res.status(200).json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
 
 
exports.delproductByID = async (req, res, next) => {
  const { ProductID } = req.body;

  if (!ProductID) {
    return sendResponse(res, "ProductID is required", null, null, 400);
  }

  try {
    const db = await connectToMongoDB();

    const orderDetailExists = await db.collection('tblOrderDetails').findOne({ ProductID });

    if (orderDetailExists) {
      return sendResponse(res, "Product cannot be deleted. It exists in order details.", null, null, 400);
    }

    // Proceed with deletion
    await db.collection('tblProduct').deleteOne({ ProductID });
    await db.collection('tblProductColor').deleteMany({ ProductID });
    await db.collection('tblProductSize').deleteMany({ ProductID });

    return sendResponse(res, "Product deleted successfully", null, null, 200);
  } catch (error) {
    console.error("Error in delproductByID:", error);
    return sendResponse(res, "Internal Server Error", null, error.message, 500);
  }
};



exports.delproductimage = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblprdimagegallery");

    const { PIID, ProductID } = req.body || {};

    // Validate required fields
    if (!PIID || String(PIID).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "PIID is required.",
      });
    }

    if (!ProductID || String(ProductID).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ProductID is required.",
      });
    }

    // Delete the image record
    const deleteResult = await collection.deleteOne({
      PIID: String(PIID).trim(),
      ProductID: String(ProductID).trim(),
    });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Product image not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product image deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Product Image Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};
 
 exports.addproductimage = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblprdimagegallery");

    const {
      ProductImageName,
      ProductID,
      CreatedBy,
      ModifyBy,
      IsDataStatus,
    } = req.body || {};

    if (!ProductID || String(ProductID).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ProductID is required.",
      });
    }

    if (!ProductImageName || String(ProductImageName).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ProductImageName is required.",
      });
    }

    const productIDValue = String(ProductID).trim();
    const productImageNameValue = String(ProductImageName).trim();

    // Optional duplicate check:
    // Prevent saving the same image name twice for the same product.
    const existingImage = await collection.findOne({
      ProductID: productIDValue,
      ProductImageName: productImageNameValue,
    });

    if (existingImage) {
      return res.status(409).json({
        success: false,
        message: "This product image already exists.",
      });
    }

    const currentDate = new Date();

    const imageData = {
      PIID: generateUniqueId(),
      ProductImageName: productImageNameValue,
      ProductID: productIDValue,
      CreatedDate: currentDate,
      CreatedBy: CreatedBy ? String(CreatedBy).trim() : "",
      ModifyBy: ModifyBy ? String(ModifyBy).trim() : "",
      ModifyDate: currentDate,
      IsDataStatus:
        IsDataStatus !== undefined && IsDataStatus !== null
          ? Number(IsDataStatus)
          : 1,
    };

    const insertResult = await collection.insertOne(imageData);

    return res.status(201).json({
      success: true,
      message: "Product image added successfully.",
      data: {
        ...imageData,
        _id: insertResult.insertedId,
      },
    });
  } catch (error) {
    console.error("Add Product Image Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
   
exports.getproductimage = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblprdimagegallery");

    const { ProductID } = req.body || {};

    // Validate ProductID
    if (!ProductID || String(ProductID).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ProductID is required.",
      });
    }

    // Get all images for the product
    const images = await collection
      .find({
        ProductID: String(ProductID).trim(),
      })
      .toArray();

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No product images found.",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product images retrieved successfully.",
      total: images.length,
      data: images,
    });
  } catch (error) {
    console.error("Get Product Images Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};