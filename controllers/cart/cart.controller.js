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

 
exports.getCartList = async (req, res, next) => {

  const url = process.env.IMAGEURL + "product/";
  const ThumbUrl = url + "images/";
  
  try {
    const OrderRefNoVal = req.body.OrderRefNo;  // Retrieve OrderRefNo from request body
    console.log(OrderRefNoVal);

    const db = await connectToMongoDB();  // Connect to MongoDB
    const collection = db.collection('tblcart');  // Access the tblcart collection

    // Perform aggregation to join tblcart with tblproduct and filter by OrderRefNo
    collection.aggregate([
        { 
            $match: { OrderRefNo: OrderRefNoVal }  // Match documents with the provided OrderRefNo
        },
        {
            $lookup: {
                from: 'tblProduct',  // Join with tblproduct collection
                localField: 'ProductID',  // Field in tblcart to match
                foreignField: 'ProductID',  // Field in tblproduct to match
                as: 'productDetails'  // Alias for the resulting array of product details
            }
        },
        { 
            $unwind: {
                path: '$productDetails',  // Unwind the productDetails array to get a single product object
                preserveNullAndEmptyArrays: true  // Keep cart items even if no matching product exists
            }
        },
        {
            $lookup: {
                from: 'tblProductColor',  // Join with tblProductColor collection
                localField: 'PrdColorCodeID',  // Field in tblcart to match
                foreignField: 'PrdColorCodeID',  // Field in tblProductColor to match
                as: 'colorDetails'  // Alias for the resulting array of color details
            }
        },
        { 
            $unwind: {
                path: '$colorDetails',  // Unwind the colorDetails array to get a single color object
                preserveNullAndEmptyArrays: true  // Keep cart items even if no matching color exists
            }
        },
        {
            $lookup: {
                from: 'tblProductSize', // Join with tblProductSize collection
                localField: 'PrdSizeID', // Field in tblcart to match
                foreignField: 'PrdSizeID', // Field in tblProductSize to match
                as: 'sizeDetails' // Alias for the resulting array of size details
            }
        },
        { 
            $unwind: {
                path: '$sizeDetails',  // Unwind the sizeDetails array to get a single size object
                preserveNullAndEmptyArrays: true  // Keep cart items even if no matching size exists
            }
        },
        {
            $project: {
                // Include all fields from tblcart
                _id: 1,  
                OrderRefNo: 1,
                ProductID: 1,
                Quantity: 1,
                PrdAmount: 1,
                ProductAmount: 1,
                ProductQty: 1,
                CartID: 1,
                OrderTypeID :1 ,
                // Flatten the productDetails by including its fields directly in the main document
                PrdName: '$productDetails.PrdName',  // Flatten PrdName
                PrdThumb: '$productDetails.PrdThumb',  // Flatten PrdThumb
                Price: '$productDetails.Price',  // Flatten Price
                ProductDescription: '$productDetails.ProductDescription', // Flatten ProductDescription
                // Add any other fields from tblproduct that you want to include in the main array
                
                // Flatten the colorDetails to include the EnPrdColorName field
                EnPrdColorName: '$colorDetails.EnPrdColorName',
                ArPrdColorName: '$colorDetails.ArPrdColorName',   // Flatten EnPrdColorName
                
                // Flatten the sizeDetails to include the EnPrdSizeName and ArPrdSizeName fields
                EnPrdSizeName: '$sizeDetails.EnPrdSizeName',  // Add the English size name
                ArPrdSizeName: '$sizeDetails.ArPrdSizeName'   // Add the Arabic size name
            }
        }
    ]).toArray()
    .then(documents => {

      // Add full image URL for product thumbnail
      for (const product of documents) {
           product.PrdThumbImageUrl = ThumbUrl + product.PrdThumb;
      }
      
      sendResponse(res, "Cart Found.", null, documents);  // Send response with documents
    })
    .catch(err => {
        console.log(err);
        sendResponse(res, "Error fetching cart and product details.", null, []);  // Send error response
    });

  } catch (error) {
    console.log(error);
    next(error);  // Pass error to next middleware or handler
  }
};


 
exports.addToCartOld = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const item = req.body;
    const OrderRefNoVal = req.body.OrderRefNo;
    const ProductIDVal = req.body.ProductID;
    const ProductQtyVal = req.body.ProductQty;
    const ProductAmountVal = req.body.ProductAmount;
    const result = await db.collection('tblcart').insertOne(item);
    sendResponse(res, "Item inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 

exports.addToCart = async (req, res, next) => {
  let db;

  try {
    // Connect to MongoDB
    db = await connectToMongoDB();
    
    const OrderRefNoVal = req.body.OrderRefNo;
    const ProductIDVal = req.body.ProductID;
    const ProductQtyVal = req.body.ProductQty;
    const ProductAmountVal = req.body.ProductAmount;
    const PrdColorCodeIDVal = req.body.PrdColorCodeID;
    const PrdSizeIDVal = req.body.PrdSizeID;
    const OrderTypeIDVal = req.body.OrderTypeID;
    const PainterReqDateVal = req.body.PainterReqDate;
    const PainterReqTimeVal = req.body.PainterReqTime;
    const PainterReqWorkTypeVal = req.body.PainterReqWorkType;
    const PainterReqSizeVal = req.body.PainterReqSize;

    // ✅ NEW OPTIONAL FIELD
    const SplColorCodeIDPrKeyVal = req.body.SplColorCodeIDPrKey ?? "";

    // Define the order data object
    const orderData = {
      OrderRefNo: OrderRefNoVal,
      ProductID: ProductIDVal,
      ProductQty: ProductQtyVal,
      ProductAmount: ProductAmountVal,
      PrdColorCodeID: PrdColorCodeIDVal,
      PrdSizeID: PrdSizeIDVal,
      OrderTypeID: OrderTypeIDVal,
      CartID: generateUniqueId(),

      PainterReqDate: PainterReqDateVal,
      PainterReqTime: PainterReqTimeVal,
      PainterReqWorkType: PainterReqWorkTypeVal,
      PainterReqSize: PainterReqSizeVal,

      // ✅ ADD HERE
      SplColorCodeIDPrKey: SplColorCodeIDPrKeyVal,
    };

    // Reference to the tblcart collection
    const collection = db.collection('tblcart'); 

    // ✅ INCLUDE IN DUPLICATE CHECK
    const existingOrder = await collection.findOne({
      OrderRefNo: OrderRefNoVal,
      ProductID: ProductIDVal,
      PrdColorCodeID: PrdColorCodeIDVal,
      PrdSizeID: PrdSizeIDVal,
      SplColorCodeIDPrKey: SplColorCodeIDPrKeyVal, // NEW
    });

    if (existingOrder) {
      // If the product exists, increment the ProductQty by 1
      const updatedQty = existingOrder.ProductQty + 1;
      
      const updateResult = await collection.updateOne(
        { _id: existingOrder._id },
        { $set: { ProductQty: updatedQty } }
      );

      sendResponse(res, "Product Quantity Successfully Done.", null, updateResult);

    } else {
      // Insert new order
      const result = await collection.insertOne(orderData);  
      sendResponse(res, "Order added successfully.", null, result);
    }

  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: 'Error processing the request',
      error: error.message,
    });
  } finally {
    // connection handling if needed
  }
};
 
exports.updateQtyToCart = async (req, res, next) => {
 // Example usage:
 const OrderRefNoVal = req.body.OrderRefNo;
 const CartIDVal = req.body.CartID;
 const ProductQtyVal = req.body.ProductQty;
 console.log(OrderRefNoVal);
 console.log(CartIDVal);

updateCartQuantity(res,OrderRefNoVal, CartIDVal, ProductQtyVal); // Update ProductQty to 2 for CartID '989' and UserID '23'

};

 


const updateCartQuantity = async (res,OrderRefNo, CartID, ProductQtyVal) => {
  try {

    const db = await connectToMongoDB();
    const result = await db.collection('tblcart').updateOne(
      { OrderRefNo, CartID },   
      { $set: { ProductQty: ProductQtyVal } }   
    );
    
    if (result.modifiedCount > 0) {
      sendResponse(res, "Update Sucessfully Done.",  null , result);
    } else {
      sendResponse(res, "Update Failed.",  null , result);
    }
  } catch (err) {
    sendResponse(res, "error .",  null , null);
  }
};


exports.removeProduct = async (req, res, next) => {
 
  const OrderRefNo = req.body.OrderRefNo;
  const CartID = req.body.CartID;
 
  try {
    
    const db = await connectToMongoDB(); 
 
     
       
    const result = await db.collection('tblcart').deleteOne(
      { OrderRefNo, CartID }  // Filter by OrderRefNo and ProductID
  );

        // Send a response after the delete operation
        if (result.deletedCount > 0) {
            sendResponse(res, "  Delete Successfully Done.", null, result);
        } else {
            sendResponse(res, " ,   Delete Failed.", null, result);
        }
    
} catch (err) {
    console.log(err);
    sendResponse(res, "Error occurred.", null, null);
}

   
 
 };