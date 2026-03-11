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


exports.getbanner = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const items = await db.collection('tblBanner').find().toArray();
    const url =process.env.IMAGEURL+"banner/";
    

    for (const product of items) {
      product.BannerImage =  url+product.BannerImage; 
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


exports.menulist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    // Only find documents where LangType is 'ICON'
    const items = await db.collection('tbllangpack').find({ LangType: 'FOOTER' }).toArray();

    const url = process.env.IMAGEURL + "icon/";

    for (const product of items) {
      product.LangIconUrl = url + product.LangIcon;
      product.LangIcon = url + product.LangIcon;
    }

    sendResponse(res, "Data fetched successfully.", null, items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

 exports.getlang = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    // Step 1: Build filter from query params
    const filter = {};

    // Optional filters from query
    if (req.query.LangCode) {
      filter.LangCode = req.query.LangCode;
    }

    if (req.query.LangStatus) {
      filter.LangStatus = req.query.LangStatus;
    }

    if (req.query.LangName) {
      filter.LangName = {
        $regex: req.query.LangName,
        $options: 'i',
      };
    }

    // Step 2: Mandatory conditions
    filter.LangType = { $ne: "DUMMY" };
    filter.IsDataStatus = "1"; // ✅ WHERE IsDataStatus = "1"

    // Step 3: Fetch filtered data
    const items = await db
      .collection('tbllangpack')
      .find(filter)
      .toArray();

    // Step 4: Add full image URLs
    const url = process.env.IMAGEURL + "icon/";
    for (const product of items) {
      product.LangIconUrl = url + product.LangIcon;
      product.LangIcon = url + product.LangIcon;
    }

    // Step 5: Send response
    sendResponse(res, "Data fetched successfully.", null, items);

  } catch (error) {
    console.error(error);
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

exports.getProduct = async (req, res, next) => {
  try {
    const url =process.env.IMAGEURL+"product/";
    const db = await connectToMongoDB();
    const items = await db.collection('tblProduct').find().toArray();
   
    const GridListUrl=url+"images/"
    const LargeUrl=url+"images/"
    const ThumbUrl=url+"images/"
    const BannerUrl=url+"images/"

    for (const product of items) {
         
      product.PrdGridListUrl = GridListUrl+product.PrdGridList;
      product.PrdThumbImageUrl = ThumbUrl+product.PrdThumb;
      product.PrdLargeImageUrl = LargeUrl+product.PrdLarge;
      product.PrdBannerImageUrl =BannerUrl+ product.PrdBanner;
      
     
      product.PrdGridList = GridListUrl+product.PrdGridList;
      product.PrdThumbImage = ThumbUrl+product.PrdThumb;
      product.PrdLargeImage = LargeUrl+product.PrdLarge;
      product.PrdBannerImage =BannerUrl+ product.PrdBanner;
      
  } 
    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.OldgetProduct = async (req, res, next) => {
  try {
    const url =process.env.IMAGEURL+"product/";
    const db = await connectToMongoDB();
    const items = await db.collection('tblProduct').find().toArray();
   
    const GridListUrl=url+"images/"
    const LargeUrl=url+"images/"
    const ThumbUrl=url+"images/"
    const BannerUrl=url+"images/"

    for (const product of items) {
         
      product.PrdGridListUrl = GridListUrl+product.PrdGridList;
      product.PrdThumbImageUrl = ThumbUrl+product.PrdThumb;
      product.PrdLargeImageUrl = LargeUrl+product.PrdLarge;
      product.PrdBannerImageUrl =BannerUrl+ product.PrdBanner;
      
     
      product.PrdGridList = GridListUrl+product.PrdGridList;
      product.PrdThumbImage = ThumbUrl+product.PrdThumb;
      product.PrdLargeImage = LargeUrl+product.PrdLarge;
      product.PrdBannerImage =BannerUrl+ product.PrdBanner;
      
  } 
    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
exports.getColor = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID;
    const query = { productId: ProductID };
    const db = await connectToMongoDB();
    const items = await db.collection('tblProductColor').find().toArray();
    sendResponse(res, "Data fetched successfully .", null , items);
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

exports.addCity = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
     
    // If both are unique, proceed with registration
    const insertData = {
      ...req.body,
      createdBy: "", 
      createdAt: new Date(),    
      modifiedBy: "", 
      modifiedAt: new Date(),    
      CityID:  generateUniqueId(),     
          
    };


    const result = await db.collection('tblcity').insertOne(insertData);
    sendResponse(res, "City inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getCity = async (req, res, next) => {
  try {
 
    const db = await connectToMongoDB();
    const items = await db.collection('tblcity').find().toArray(); 
    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
  
};

exports.getstoreInfoByCityID = async (req, res, next) => {
  try {
    const { CityID } = req.body; // Extract CityID from the request body
    
    if (!CityID) {
      return res.status(400).json({
        message: "CityID is required"
      });
    }

    const db = await connectToMongoDB();
    const items = await db.collection('tblstoreinfo').find({ CityID }).toArray(); // Filter by CityID

    if (items.length === 0) {
      return res.status(404).json({
        message: "No city found with the provided CityID"
      });
    }

    sendResponse(res, "Data fetched successfully.", null, items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
