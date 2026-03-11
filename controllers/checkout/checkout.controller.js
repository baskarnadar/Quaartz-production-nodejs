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
 
 
function UserOrderNo() {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Uppercase letters and digits
  let uniqueId = "";

  // Loop 7 times to generate a 7-character string
  for (let i = 0; i < 7; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length); // Random index in charset
    uniqueId += charset[randomIndex]; // Append the random character to the ID
  }

  return uniqueId;
}

exports.checkout = async (req, res, next) => { 
  
  const UserOrderNoVal=UserOrderNo();
  const RegUserIDVal = req.body.RegUserID;
  const OrderRefNoVal = req.body.OrderRefNo; 

  const DeliveryTypeIDVal = req.body.DeliveryTypeID;
  const PickUpCityIDVal = req.body.PickUpCityID; 
  const PickUpStoreIDVal = req.body.PickUpStoreID;
  const DeliveryAddressIDVal = req.body.DeliveryAddressID; 


 


  const db = await connectToMongoDB();  
 //Create Order Table ---------------------------------------------- 
let OrderData = {

  DeliveryTypeID: DeliveryTypeIDVal,
  PickUpCityID:PickUpCityIDVal,
  PickUpStoreID:PickUpStoreIDVal,
  DeliveryAddressID: DeliveryAddressIDVal,

  UserOrderNo : UserOrderNoVal,
  OrderRefNo: OrderRefNoVal,  
  RegUserID:RegUserIDVal,

  orderstatus: "NEW",  
  createdAt: new Date(),
  updatedAt: new Date(), 

};  
const Ordercollection = db.collection('tblorder');
const Orderresult = await Ordercollection.insertOne(OrderData);
console.log('OrderRefNoVal');
console.log(OrderRefNoVal);
 //Create Orderinfo Table ---with many orders-------------------------------------------


 
 

 const collection = db.collection('tblcart');   
 const cartItems = await collection.find({ "OrderRefNo": OrderRefNoVal }).toArray(); 
   
   const orderInfoItems = cartItems.map(item => ({ 
      OrderRefNo: OrderRefNoVal,       
      ProductQty: item.ProductQty, 
      ProductAmount: item.ProductAmount,
      ProductID: item.ProductID,
      PrdColorCodeID: item.PrdColorCodeID,
      PrdSizeID: item.PrdSizeID,
      createdAt: new Date(),     
      updatedAt: new Date(),     
      RegUserID: RegUserIDVal,
      OrderTypeID:   item.OrderTypeID,
      PainterReqDate:  item.PainterReqDate,
  PainterReqTime:  item.PainterReqTime,
  PainterReqWorkType:  item.PainterReqWorkType,
  PainterReqSize: item.PainterReqSize,
    })); artItemsresult = await db.collection('tblorderdetails').insertMany(orderInfoItems); 
 
    //remove Cart Item------------ 
    const Removecollection = db.collection('tblcart'); 
    const Removecondition = { OrderRefNo: OrderRefNoVal };
    const Removeresult = await Removecollection.deleteMany(Removecondition); 

    //-----------Return Result
    console.log('UserOrderNoVal');
    console.log(UserOrderNoVal);
    Orderresult.status="SUCCESS";
    Orderresult.UserOrderNo=UserOrderNoVal;
    sendResponse(res, "Checkout successfully done", null , Orderresult);  

};


