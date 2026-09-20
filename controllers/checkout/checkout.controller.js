const { connectToMongoDB } = require("../../database/mongodb");
const { getAdminEmails, sendOrderEmails } = require('../services/emailservice');
require('dotenv').config();

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
  try {
    const db = await connectToMongoDB();

    const UserOrderNoVal = UserOrderNo();
    const RegUserIDVal = req.body.RegUserID;
    const OrderRefNoVal = req.body.OrderRefNo;

    const DeliveryTypeIDVal = req.body.DeliveryTypeID;
    const PickUpCityIDVal = req.body.PickUpCityID;
    const PickUpStoreIDVal = req.body.PickUpStoreID;
    const DeliveryAddressIDVal = req.body.DeliveryAddressID;

    // ---- guards -------------------------------------------------------
    // Without these, find()/deleteMany() run with undefined and can sweep
    // unrelated documents.
    if (!OrderRefNoVal) {
      return sendResponse(res, "OrderRefNo is required.", true, null);
    }
    if (!RegUserIDVal) {
      return sendResponse(res, "RegUserID is required.", true, null);
    }

    // ---- read the cart BEFORE writing anything -------------------------
    const cartItems = await db
      .collection("tblcart")
      .find({ OrderRefNo: OrderRefNoVal })
      .toArray();

    // insertMany([]) throws "Batch cannot be empty" and would leave an
    // orphan order header behind, so stop here instead.
    if (!cartItems.length) {
      return sendResponse(res, "Your cart is empty.", true, { status: "EMPTY-CART" });
    }

    // ---- order header --------------------------------------------------
    const OrderData = {
      DeliveryTypeID: DeliveryTypeIDVal,
      PickUpCityID: PickUpCityIDVal,
      PickUpStoreID: PickUpStoreIDVal,
      DeliveryAddressID: DeliveryAddressIDVal,

      UserOrderNo: UserOrderNoVal,
      OrderRefNo: OrderRefNoVal,
      RegUserID: RegUserIDVal,

      orderstatus: "NEW",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const Orderresult = await db.collection("tblorder").insertOne(OrderData);

    // ---- order details -------------------------------------------------
    const orderInfoItems = cartItems.map((item) => ({
      OrderRefNo: OrderRefNoVal,
      ProductQty: item.ProductQty,
      ProductAmount: item.ProductAmount,
      ProductID: item.ProductID,
      PrdColorCodeID: item.PrdColorCodeID,
      PrdSizeID: item.PrdSizeID,

      SplColorCodeIDPrKey: item?.SplColorCodeIDPrKey ? item.SplColorCodeIDPrKey : "",

      createdAt: new Date(),
      updatedAt: new Date(),
      RegUserID: RegUserIDVal,
      OrderTypeID: item.OrderTypeID,

      PainterReqDate: item.PainterReqDate,
      PainterReqTime: item.PainterReqTime,
      PainterReqWorkType: item.PainterReqWorkType,
      PainterReqSize: item.PainterReqSize,
    }));

    await db.collection("tblorderdetails").insertMany(orderInfoItems);

    // ---- clear the cart --------------------------------------------------
    await db.collection("tblcart").deleteMany({ OrderRefNo: OrderRefNoVal });

    // ---- emails ----------------------------------------------------------
    // The order is already committed, so email problems are reported back
    // as flags and never fail the checkout.
    let emailOutcome = {
      customerSent: false,
      adminSent: false,
      adminRecipients: [],
      errors: [],
    };

    try {
      const ctx = await buildOrderEmailContext(db, {
        RegUserIDVal,
        OrderRefNoVal,
        UserOrderNoVal,
        DeliveryTypeIDVal,
        PickUpStoreIDVal,
        cartItems,
      });

      const adminEmails = await getAdminEmails(db);

      emailOutcome = await sendOrderEmails(ctx, {
        customerEmail: ctx.CustomerEmail,
        adminEmails,
      });
    } catch (emailError) {
      console.error("CHECKOUT EMAIL ERROR:", emailError?.message || emailError);
      emailOutcome.errors.push("Order email step failed.");
    }

    // ---- response ---------------------------------------------------------
    Orderresult.status = "SUCCESS";
    Orderresult.UserOrderNo = UserOrderNoVal;
    Orderresult.customerEmailSent = emailOutcome.customerSent;
    Orderresult.adminEmailSent = emailOutcome.adminSent;
    Orderresult.adminRecipients = emailOutcome.adminRecipients;
    Orderresult.emailWarnings = emailOutcome.errors;

    return sendResponse(res, "Checkout successfully done", null, Orderresult);
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

/**
 * Collects everything the order emails need: customer, store, and the
 * ordered items resolved to real names, colours, sizes and prices.
 * Never throws - missing lookups just come back as empty strings.
 */
async function buildOrderEmailContext(db, args) {
  const {
    RegUserIDVal,
    OrderRefNoVal,
    UserOrderNoVal,
    DeliveryTypeIDVal,
    PickUpStoreIDVal,
    cartItems,
  } = args;

  // --- customer -----------------------------------------------------------
  // Pull the whole record (minus the secrets) - the city field name varies,
  // so we cannot rely on a fixed projection here.
  const user =
    (await db.collection("tblreginfo").findOne(
      { RegUserID: RegUserIDVal },
      { projection: { _id: 0, RegPassword: 0, RegOtpNo: 0 } }
    )) || {};

  // The city may be stored as an ID or already as a plain name, under any of
  // several field names. Take the first non-empty one, then try to resolve it
  // against tblcity; if that fails, assume it is already the name.
  const cityRaw = String(
    user.RegCityID ??
      user.CityID ??
      user.RegCity ??
      user.RegCityName ??
      user.City ??
      user.CityName ??
      ""
  ).trim();

  let cityName = "";

  if (cityRaw) {
    try {
      const city = await db.collection("tblcity").findOne({
        $or: [{ CityID: cityRaw }, { EnCityName: cityRaw }],
      });

      cityName = city?.EnCityName || cityRaw;
    } catch (err) {
      cityName = cityRaw;
    }
  }

  // --- store --------------------------------------------------------------
  let storeName = "";
  let storeAddress = "";

  if (PickUpStoreIDVal) {
    const store = await db.collection("tblstoreinfo").findOne({
      $expr: { $eq: [{ $toString: "$StoreCodeID" }, String(PickUpStoreIDVal)] },
    });

    storeName = store?.EnStoreName || store?.StoreName || "";
    // NOTE: the field really is spelled "StoreAdress" in tblstoreinfo.
    storeAddress = store?.StoreAdress || store?.StoreAddress || "";
  }

  // --- lookups for the line items ----------------------------------------
  const productIds = [...new Set(cartItems.map((i) => i.ProductID).filter(Boolean))];
  const colorIds = [...new Set(cartItems.map((i) => i.PrdColorCodeID).filter(Boolean))];
  const sizeIds = [...new Set(cartItems.map((i) => i.PrdSizeID).filter(Boolean))];
  const splIds = [...new Set(cartItems.map((i) => i.SplColorCodeIDPrKey).filter(Boolean))];

  const [products, colors, sizes, splColors] = await Promise.all([
    productIds.length
      ? db.collection("tblProduct").find({ ProductID: { $in: productIds } }).toArray()
      : [],
    colorIds.length
      ? db.collection("tblProductColor").find({ PrdColorCodeID: { $in: colorIds } }).toArray()
      : [],
    sizeIds.length
      ? db.collection("tblProductSize").find({ PrdSizeID: { $in: sizeIds } }).toArray()
      : [],
    splIds.length
      ? db
          .collection("tblPrdSpecialColor")
          .find({ SplColorCodeIDPrKey: { $in: splIds } })
          .toArray()
      : [],
  ]);

  const byKey = (rows, key) =>
    rows.reduce((map, row) => {
      map[String(row[key])] = row;
      return map;
    }, {});

  const productMap = byKey(products, "ProductID");
  const colorMap = byKey(colors, "PrdColorCodeID");
  const sizeMap = byKey(sizes, "PrdSizeID");
  const splMap = byKey(splColors, "SplColorCodeIDPrKey");

  // --- build the item rows -------------------------------------------------
  let orderTotal = 0;

  const Items = cartItems.map((item) => {
    const product = productMap[String(item.ProductID)] || {};
    const color = colorMap[String(item.PrdColorCodeID)] || {};
    const size = sizeMap[String(item.PrdSizeID)] || {};
    const spl = splMap[String(item.SplColorCodeIDPrKey)] || {};

    const qty = Number(item.ProductQty || 0);
    const amount = Number(item.ProductAmount || product.PrdAmount || 0);
    const lineTotal = qty * amount;

    orderTotal += lineTotal;

    // Colour is identified by its CODE only - never by EnColorName /
    // ArColorName. tblPrdSpecialColor.SplColorCodeID is the value to use;
    // tblProductColor.sigmacolorcode covers lines with no special colour.
    const colorCode = spl.SplColorCodeID || color.sigmacolorcode || "";

    // The hex is stored as HexValue on some rows and PrdColorCode on others.
    const hexValue =
      spl.HexValue || color.HexValue || color.PrdColorCode || "";

    return {
      Name: product.PrdName || "Product",
      ColorCode: colorCode,
      HexValue: hexValue,
      SizeName: size.EnPrdSizeName || "",
      Qty: qty,
      Amount: amount,
      LineTotal: lineTotal,
    };
  });

  return {
    CustomerName: user.RegFullName || "",
    CustomerEmail: user.RegEmailAddress || "",
    CustomerMobile: user.RegMobileNo || "",
    CustomerCity: cityName,

    UserOrderNo: UserOrderNoVal,
    OrderRefNo: OrderRefNoVal,

    DeliveryType: DeliveryTypeIDVal || "",
    StoreName: storeName,
    StoreAddress: storeAddress,

    Items,
    OrderTotal: orderTotal,
    PlacedAt: new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
