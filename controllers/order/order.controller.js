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

exports.getorder = async (req, res, next) => {
  const ImageCategoryVal = process.env.IMAGEURL + "order/";
  try {
    const db = await connectToMongoDB();
    const mainCategories = db.collection('tblorder');

    const result = await mainCategories.aggregate([
      {
        $lookup: {
          from: 'tblorderdetails',
          localField: 'OrderRefNo',
          foreignField: 'OrderRefNo',
          as: 'suborderviews'
        }
      },
      {
        $sort: { createdAt: -1 } // Sort by createdAt DESC
      }
    ]).toArray();

    // Optional logging for debugging
    result.forEach(mainCategory => {
      console.log(`Main Order: ${mainCategory.OrderRefNo}`);
      mainCategory.suborderviews.forEach(subcategory => {
        console.log(`  - Item: ${subcategory.ProductName}`);
      });
      console.log('---');
    });

    sendResponse(res, "Data fetched successfully.", null, result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

 
exports.getorderbyorderrefno = async (req, res, next) => { 
 
   
const db = await connectToMongoDB();
const RegUserIDVal = req.body.RegUserID;
const mainCategories = db.collection('tblorder');

// Perform aggregation with multiple $lookup stages
const result = await mainCategories.aggregate([
  { 
    $match: { RegUserID: RegUserIDVal } // Filter by OrderRefNo
  },
  
]).toArray();

result.forEach(mainCategory => {
  console.log(`Main Category: ${mainCategory.EnPrdCategoryName}`);
  
  // Loop through each subcategory (suborderviews) and log details
  if (mainCategory.suborderviews) {
    console.log(`Subcategories:`);
    console.log(`  - ${mainCategory.suborderviews.ArPrdSubCategoryName}`);
    
    // If product details are available, log the product information
    if (mainCategory.productdetails) {
      console.log(`    Product Name: ${mainCategory.productdetails.ProductName}`);
      console.log(`    Product Image: ${mainCategory.productdetails.ProductImage}`);
    }
  }

  console.log('---');

  // Log the user details
  if (mainCategory.userDetails && mainCategory.userDetails.length > 0) {
    console.log(`User Info:`);
    mainCategory.userDetails.forEach(user => {
      console.log(`  - User Name: ${user.UserName}`);
      console.log(`  - User Email: ${user.UserEmail}`);
    });
  }
});

// Send the final response with the fetched data
sendResponse(res, "order Data fetched successfully.", null, result);

};
 
 
exports.getorderbyorderrefnonew_working = async (req, res, next) => { 
  const db = await connectToMongoDB();
  const OrderRefNoVal = req.body.OrderRefNo;
  const mainCategories = db.collection('tblorder');
  const url = process.env.IMAGEURL + "product/";
  const ThumbUrl = url + "images/";

  try {
    // Perform aggregation with multiple $lookup stages
    const result = await mainCategories.aggregate([
      { 
        $match: { OrderRefNo: OrderRefNoVal } // Filter by OrderRefNo
      },
      {
        $lookup: {
          from: 'tblorderdetails', // The collection to join
          localField: 'OrderRefNo', // Field from tblorder collection
          foreignField: 'OrderRefNo', // Field from tblorderdetails collection
          as: 'suborderviews' // New field for the result of the join
        }
      },
      {
        $lookup: {
          from: 'tblreginfo', // The collection to join
          localField: 'RegUserID', // Field from tblorder collection
          foreignField: 'RegUserID', // Field from tblreginfo collection
          as: 'userDetails' // New field for the result of the join
        }
      },
      {
        $lookup: {
          from: 'tblProduct', // The collection to join
          localField: 'suborderviews.ProductID', // Field from tblorderdetails (suborderviews) collection
          foreignField: 'ProductID', // Field from tblproduct collection
          as: 'productdetails' // New field to store product details
        }
      },
      {
        $lookup: {
          from: 'tblProductColor', // The collection to join for color details
          localField: 'suborderviews.PrdColorCodeID', // Field from tblorderdetails collection
          foreignField: 'PrdColorCodeID', // Field from tblProductColor collection
          as: 'colorDetails' // New field to store color details
        }
      },
      {
        $lookup: {
          from: 'tblProductSize', // The collection to join for size details
          localField: 'suborderviews.PrdSizeID', // Field from tblorderdetails collection
          foreignField: 'PrdSizeID', // Field from tblProductSize collection
          as: 'sizeDetails' // New field to store size details
        }
      },
      {
        $addFields: {
          // Ensure productdetails is an array, even if it contains just one element
          productdetails: {
            $cond: {
              if: { $isArray: "$productdetails" },
              then: "$productdetails", // Keep it as is if it's already an array
              else: [{ $ifNull: ["$productdetails", []] }] // Convert it into an array if it's a single object
            }
          },
          // Ensure colorDetails is an array, even if it contains just one element
          colorDetails: {
            $cond: {
              if: { $isArray: "$colorDetails" },
              then: "$colorDetails", // Keep it as is if it's already an array
              else: [{ $ifNull: ["$colorDetails", []] }] // Convert it into an array if it's a single object
            }
          },
          // Ensure sizeDetails is an array, even if it contains just one element
          sizeDetails: {
            $cond: {
              if: { $isArray: "$sizeDetails" },
              then: "$sizeDetails", // Keep it as is if it's already an array
              else: [{ $ifNull: ["$sizeDetails", []] }] // Convert it into an array if it's a single object
            }
          }
        }
      },
      {
        $addFields: {
          suborderviews: {
            $map: {
              input: "$suborderviews", // Iterate over the suborderviews array
              as: "subOrder",
              in: {
                $mergeObjects: [
                  "$$subOrder", // Keep the existing suborder details
                  {
                    $let: {
                      vars: {
                        matchingProduct: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$productdetails",  
                                as: "product",  
                                cond: { $eq: ["$$product.ProductID", "$$subOrder.ProductID"] }  
                              }
                            }, 
                            0 // Get the first matching product
                          ]
                        },
                        matchingColor: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$colorDetails",  
                                as: "color",  
                                cond: { $eq: ["$$color.PrdColorCodeID", "$$subOrder.PrdColorCodeID"] }
                              }
                            }, 
                            0 // Get the first matching color
                          ]
                        },
                        matchingSize: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$sizeDetails",  
                                as: "size",  
                                cond: { $eq: ["$$size.PrdSizeID", "$$subOrder.PrdSizeID"] }
                              }
                            }, 
                            0 // Get the first matching size
                          ]
                        }
                      },
                      in: { 
                        Amount: { $ifNull: ["$$matchingProduct.PrdAmount", ""] },  
                        PrdName: { $ifNull: ["$$matchingProduct.PrdName", ""] },  
                        PrdThumb: { 
                          $ifNull: [
                            { 
                              $concat: [ThumbUrl, "$$matchingProduct.PrdThumb"] 
                            },
                            "" 
                          ]
                        },
                        PrdDesc: { $ifNull: ["$$matchingProduct.PrdDesc", ""] }, 
                        EnPrdColorName: { $ifNull: ["$$matchingColor.EnPrdColorName", ""] },
                        AdPrdColorName: { $ifNull: ["$$matchingColor.ArPrdColorName", ""] },
                        EnPrdSizeName: { $ifNull: ["$$matchingSize.EnPrdSizeName", ""] },  // Add EnPrdSizeName here
                        ArPrdSizeName: { $ifNull: ["$$matchingSize.ArPrdSizeName", ""] }   // Add ArPrdSizeName here
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]).toArray();

    result.forEach(mainCategory => {
      console.log(`Main Category: ${mainCategory.EnPrdCategoryName}`);
       
      if (mainCategory.suborderviews) { 
        mainCategory.suborderviews.forEach(suborder => {
          console.log(`SubOrder PrdName: ${suborder.PrdName}`);
          console.log(`SubOrder PrdThumb: ${suborder.PrdThumb}`);
          console.log(`SubOrder Color: ${suborder.EnPrdColorName}`);
          console.log(`SubOrder Size (English): ${suborder.EnPrdSizeName}`);  // Log the size in English
          console.log(`SubOrder Size (Arabic): ${suborder.ArPrdSizeName}`);   // Log the size in Arabic
        });
      }

      console.log('---');
    
      // Log the user details
      if (mainCategory.userDetails && mainCategory.userDetails.length > 0) { 
        mainCategory.userDetails.forEach(user => { 
          console.log(`User: ${user.UserName}`);
        });
      }
    });

    // Return the result to the client
    sendResponse(res, "Order data fetched successfully.", null, result);

  } catch (error) {
    console.log(error);
    next(error);  // Pass error to next middleware or handler
  }
};

exports.getorderbyorderrefnonew_work = async (req, res, next) => { 
  const db = await connectToMongoDB();
  const OrderRefNoVal = req.body.OrderRefNo;
  const mainCategories = db.collection('tblorder');
  const url = process.env.IMAGEURL + "product/";
  const ThumbUrl = url + "images/";

  try {
    // Perform aggregation with multiple $lookup stages
    const result = await mainCategories.aggregate([
      { 
        $match: { OrderRefNo: OrderRefNoVal } // Filter by OrderRefNo
      },
      {
        $lookup: {
          from: 'tblorderdetails', // The collection to join
          localField: 'OrderRefNo', // Field from tblorder collection
          foreignField: 'OrderRefNo', // Field from tblorderdetails collection
          as: 'suborderviews' // New field for the result of the join
        }
      },
      {
        $lookup: {
          from: 'tblreginfo', // The collection to join
          localField: 'RegUserID', // Field from tblorder collection
          foreignField: 'RegUserID', // Field from tblreginfo collection
          as: 'userDetails' // New field for the result of the join
        }
      },
      {
        $lookup: {
          from: 'tblProduct', // The collection to join
          localField: 'suborderviews.ProductID', // Field from tblorderdetails (suborderviews) collection
          foreignField: 'ProductID', // Field from tblproduct collection
          as: 'productdetails' // New field to store product details
        }
      },
      {
        $lookup: {
          from: 'tblProductColor', // The collection to join for color details
          localField: 'suborderviews.PrdColorCodeID', // Field from tblorderdetails collection
          foreignField: 'PrdColorCodeID', // Field from tblProductColor collection
          as: 'colorDetails' // New field to store color details
        }
      },
      {
        $lookup: {
          from: 'tblProductSize', // The collection to join for size details
          localField: 'suborderviews.PrdSizeID', // Field from tblorderdetails collection
          foreignField: 'PrdSizeID', // Field from tblProductSize collection
          as: 'sizeDetails' // New field to store size details
        }
      },
      // New Lookup for PickUpCityID matching with tblcity.CityID
      {
        $lookup: {
          from: 'tblcity', // The collection to join for city details
          localField: 'PickUpCityID', // Field from tblorder collection
          foreignField: 'CityID', // Field from tblcity collection
          as: 'citydetails' // New field to store city details
        }
      },
      // New Lookup for PickUpStoreID matching with tblstoreinfo.StoreCodeID
      {
        $lookup: {
          from: 'tblstoreinfo', // The collection to join for store details
          localField: 'PickUpStoreID', // Field from tblorder collection
          foreignField: 'StoreCodeID', // Field from tblstoreinfo collection
          as: 'storedetails' // New field to store store details
        }
      },
      {
        $addFields: {
          // Ensure productdetails is an array, even if it contains just one element
          productdetails: {
            $cond: {
              if: { $isArray: "$productdetails" },
              then: "$productdetails", // Keep it as is if it's already an array
              else: [{ $ifNull: ["$productdetails", []] }] // Convert it into an array if it's a single object
            }
          },
          // Ensure colorDetails is an array, even if it contains just one element
          colorDetails: {
            $cond: {
              if: { $isArray: "$colorDetails" },
              then: "$colorDetails", // Keep it as is if it's already an array
              else: [{ $ifNull: ["$colorDetails", []] }] // Convert it into an array if it's a single object
            }
          },
          // Ensure sizeDetails is an array, even if it contains just one element
          sizeDetails: {
            $cond: {
              if: { $isArray: "$sizeDetails" },
              then: "$sizeDetails", // Keep it as is if it's already an array
              else: [{ $ifNull: ["$sizeDetails", []] }] // Convert it into an array if it's a single object
            }
          }
        }
      },
      {
        $addFields: {
          suborderviews: {
            $map: {
              input: "$suborderviews", // Iterate over the suborderviews array
              as: "subOrder",
              in: {
                $mergeObjects: [
                  "$$subOrder", // Keep the existing suborder details
                  {
                    $let: {
                      vars: {
                        matchingProduct: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$productdetails",  
                                as: "product",  
                                cond: { $eq: ["$$product.ProductID", "$$subOrder.ProductID"] }  
                              }
                            }, 
                            0 // Get the first matching product
                          ]
                        },
                        matchingColor: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$colorDetails",  
                                as: "color",  
                                cond: { $eq: ["$$color.PrdColorCodeID", "$$subOrder.PrdColorCodeID"] }
                              }
                            }, 
                            0 // Get the first matching color
                          ]
                        },
                        matchingSize: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$sizeDetails",  
                                as: "size",  
                                cond: { $eq: ["$$size.PrdSizeID", "$$subOrder.PrdSizeID"] }
                              }
                            }, 
                            0 // Get the first matching size
                          ]
                        }
                      },
                      in: { 
                        Amount: { $ifNull: ["$$matchingProduct.PrdAmount", ""] },  
                        PrdName: { $ifNull: ["$$matchingProduct.PrdName", ""] },  
                        PrdThumb: { 
                          $ifNull: [
                            { 
                              $concat: [ThumbUrl, "$$matchingProduct.PrdThumb"] 
                            },
                            "" 
                          ]
                        },
                        PrdDesc: { $ifNull: ["$$matchingProduct.PrdDesc", ""] }, 
                        EnPrdColorName: { $ifNull: ["$$matchingColor.EnPrdColorName", ""] },
                        AdPrdColorName: { $ifNull: ["$$matchingColor.ArPrdColorName", ""] },
                        EnPrdSizeName: { $ifNull: ["$$matchingSize.EnPrdSizeName", ""] },  // Add EnPrdSizeName here
                        ArPrdSizeName: { $ifNull: ["$$matchingSize.ArPrdSizeName", ""] }   // Add ArPrdSizeName here
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          // Add city and store details
          citydetails: {
            $cond: {
              if: { $isArray: "$citydetails" },
              then: "$citydetails", // Keep it as is if it's already an array
              else: [{ $ifNull: ["$citydetails", []] }] // Convert it into an array if it's a single object
            }
          },
          storedetails: {
            $cond: {
              if: { $isArray: "$storedetails" },
              then: "$storedetails", // Keep it as is if it's already an array
              else: [{ $ifNull: ["$storedetails", []] }] // Convert it into an array if it's a single object
            }
          }
        }
      }
    ]).toArray();

    result.forEach(mainCategory => {
     
      
      // Log city and store details
      if (mainCategory.citydetails && mainCategory.citydetails.length > 0) {
        mainCategory.citydetails.forEach(city => {
        
        });
      }

      if (mainCategory.storedetails && mainCategory.storedetails.length > 0) {
        mainCategory.storedetails.forEach(store => {
        
        });
      }

      if (mainCategory.suborderviews) { 
        mainCategory.suborderviews.forEach(suborder => {
           // Log the size in Arabic
        });
      }

      console.log('---');
    
      // Log the user details
      if (mainCategory.userDetails && mainCategory.userDetails.length > 0) { 
        mainCategory.userDetails.forEach(user => { 
        
        });
      }
    });

    // Return the result to the client
    sendResponse(res, "Order data fetched successfully.", null, result);

  } catch (error) {
    console.log(error);
    next(error);  // Pass error to next middleware or handler
  }
};

exports.getorderbyorderrefnonew = async (req, res, next) => {
  const db = await connectToMongoDB();
  const OrderRefNoVal = req.body.OrderRefNo;
  const mainCategories = db.collection("tblorder");
  const url = process.env.IMAGEURL + "product/";
  const ThumbUrl = url + "images/";

  try {
    const result = await mainCategories.aggregate([
      {
        $match: { OrderRefNo: OrderRefNoVal }
      },
      {
        $lookup: {
          from: "tblorderdetails",
          localField: "OrderRefNo",
          foreignField: "OrderRefNo",
          as: "suborderviews"
        }
      },
      {
        $lookup: {
          from: "tblreginfo",
          localField: "RegUserID",
          foreignField: "RegUserID",
          as: "userDetails"
        }
      },
      {
        $lookup: {
          from: "tblProduct",
          localField: "suborderviews.ProductID",
          foreignField: "ProductID",
          as: "productdetails"
        }
      },
      {
        $lookup: {
          from: "tblProductColor",
          localField: "suborderviews.PrdColorCodeID",
          foreignField: "PrdColorCodeID",
          as: "colorDetails"
        }
      },
      {
        $lookup: {
          from: "tblPrdSpecialColor",
          localField: "suborderviews.SplColorCodeIDPrKey",
          foreignField: "SplColorCodeIDPrKey",
          as: "specialColorDetails"
        }
      },
      {
        $lookup: {
          from: "tblProductSize",
          localField: "suborderviews.PrdSizeID",
          foreignField: "PrdSizeID",
          as: "sizeDetails"
        }
      },
      {
        $lookup: {
          from: "tblcity",
          localField: "PickUpCityID",
          foreignField: "CityID",
          as: "citydetails"
        }
      },
      {
        $lookup: {
          from: "tblstoreinfo",
          let: { storeCode: { $toString: "$PickUpStoreID" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$StoreCodeID" }, "$$storeCode"]
                }
              }
            }
          ],
          as: "storedetails"
        }
      },
      {
        $addFields: {
          productdetails: {
            $cond: {
              if: { $isArray: "$productdetails" },
              then: "$productdetails",
              else: [{ $ifNull: ["$productdetails", []] }]
            }
          },
          colorDetails: {
            $cond: {
              if: { $isArray: "$colorDetails" },
              then: "$colorDetails",
              else: [{ $ifNull: ["$colorDetails", []] }]
            }
          },
          specialColorDetails: {
            $cond: {
              if: { $isArray: "$specialColorDetails" },
              then: "$specialColorDetails",
              else: [{ $ifNull: ["$specialColorDetails", []] }]
            }
          },
          sizeDetails: {
            $cond: {
              if: { $isArray: "$sizeDetails" },
              then: "$sizeDetails",
              else: [{ $ifNull: ["$sizeDetails", []] }]
            }
          }
        }
      },
      {
        $addFields: {
          suborderviews: {
            $map: {
              input: "$suborderviews",
              as: "subOrder",
              in: {
                $mergeObjects: [
                  "$$subOrder",
                  {
                    $let: {
                      vars: {
                        matchingProduct: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$productdetails",
                                as: "product",
                                cond: {
                                  $eq: ["$$product.ProductID", "$$subOrder.ProductID"]
                                }
                              }
                            },
                            0
                          ]
                        },
                        matchingColor: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$colorDetails",
                                as: "color",
                                cond: {
                                  $eq: [
                                    "$$color.PrdColorCodeID",
                                    "$$subOrder.PrdColorCodeID"
                                  ]
                                }
                              }
                            },
                            0
                          ]
                        },
                        matchingSpecialColor: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$specialColorDetails",
                                as: "specialColor",
                                cond: {
                                  $eq: [
                                    "$$specialColor.SplColorCodeIDPrKey",
                                    "$$subOrder.SplColorCodeIDPrKey"
                                  ]
                                }
                              }
                            },
                            0
                          ]
                        },
                        matchingSize: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$sizeDetails",
                                as: "size",
                                cond: {
                                  $eq: ["$$size.PrdSizeID", "$$subOrder.PrdSizeID"]
                                }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: {
                        Amount: { $ifNull: ["$$matchingProduct.PrdAmount", ""] },
                        PrdName: { $ifNull: ["$$matchingProduct.PrdName", ""] },
                        PrdThumb: {
                          $ifNull: [
                            {
                              $concat: [ThumbUrl, "$$matchingProduct.PrdThumb"]
                            },
                            ""
                          ]
                        },
                        PrdDesc: { $ifNull: ["$$matchingProduct.PrdDesc", ""] },

                        EnPrdColorName: {
                          $ifNull: ["$$matchingColor.EnPrdColorName", ""]
                        },
                        AdPrdColorName: {
                          $ifNull: ["$$matchingColor.ArPrdColorName", ""]
                        },

                        SplColorCodeIDPrKey: {
                          $ifNull: ["$$matchingSpecialColor.SplColorCodeIDPrKey", ""]
                        },
                        ColorKeyCode: {
                          $ifNull: ["$$matchingSpecialColor.ColorKeyCode", ""]
                        },
                        SplColorCodeID: {
                          $ifNull: ["$$matchingSpecialColor.SplColorCodeID", ""]
                        },
                        HexValue: {
                          $ifNull: ["$$matchingSpecialColor.HexValue", ""]
                        },
                        EnColorName: {
                          $ifNull: ["$$matchingSpecialColor.EnColorName", ""]
                        },
                        ArColorName: {
                          $ifNull: ["$$matchingSpecialColor.ArColorName", ""]
                        },

                        EnPrdSizeName: {
                          $ifNull: ["$$matchingSize.EnPrdSizeName", ""]
                        },
                        ArPrdSizeName: {
                          $ifNull: ["$$matchingSize.ArPrdSizeName", ""]
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          citydetails: {
            $cond: {
              if: { $isArray: "$citydetails" },
              then: "$citydetails",
              else: [{ $ifNull: ["$citydetails", []] }]
            }
          },
          storedetails: {
            $cond: {
              if: { $isArray: "$storedetails" },
              then: "$storedetails",
              else: [{ $ifNull: ["$storedetails", []] }]
            }
          }
        }
      }
    ]).toArray();

    return sendResponse(res, "Order data fetched successfully.", null, result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 exports.updateOrderStatus = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const { OrderRefNo, OrderStatus } = req.body;

    if (!OrderRefNo || !OrderStatus) {
      return res.status(400).json({ success: false, message: "OrderRefNo and OrderStatus are required" });
    }

    const updateFields = {
      OrderStatus,
      modifyAt: new Date()
    };

    // Update tblorderdetails
    const orderDetailsCollection = db.collection('tblorderdetails');
    const updateDetailsResult = await orderDetailsCollection.updateMany(
      { OrderRefNo },
      { $set: updateFields }
    );

    // Update tblorder
    const orderCollection = db.collection('tblorder');
    const updateOrderResult = await orderCollection.updateOne(
      { OrderRefNo },
      { $set: { orderstatus:req.body.OrderStatus, modifyAt: new Date() } }
    );

    if (updateDetailsResult.matchedCount === 0 && updateOrderResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No matching order found in either collection" });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully in both collections"
    });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


 