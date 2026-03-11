const { connectToMongoDB } = require("../../database/mongodb");
const { generateUniqueId } = require("../../controllers/operation/operation");

// Helper function to send responses
function sendResponse(res, message, error, results, totalCount) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message,
    data: results,
    error,
    totalCount,
  });
}

exports.getbannerlist = async (req, res, next) => {
  const ImageVal = process.env.IMAGEURL;  
  try {
    const { page = 1, limit = 5 } = req.body;

    const db = await connectToMongoDB();
    const collection = db.collection("tblBanner");

    const skip = (page - 1) * limit;

    const banners = await collection.aggregate([
      {
        $project: {
          BannerID: 1,
          BannerImage: 1,
          BannerImageUrl: {
            $concat: [ImageVal, "banner/", "$BannerImage"]
          }
        },
      },
      { $sort: { CreatedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]).toArray();

    const totalCount = await collection.countDocuments();

    sendResponse(res, "Banners found.", null, banners, totalCount);
  } catch (error) {
    console.error("Error in getBannerList:", error);
    next(error);
  }
};


exports.getbanner = async (req, res, next) => {
  const ImageVal = process.env.IMAGEURL;  
  try {
    const { BannerID } = req.body;

    if (!BannerID) {
      return res.status(400).json({ success: false, message: "BannerID is required" });
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblBanner");

    const banner = await collection.findOne({ BannerID });

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    // Add computed image URL
    banner.BannerImageUrl = ImageVal + "banner/" + banner.BannerImage;

    sendResponse(res, "Banner found.", null, banner, 1);
  } catch (error) {
    console.error("Error in getBannerByID:", error);
    next(error);
  }
};


exports.createbanner = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const bannerItem = {
      BannerID: generateUniqueId(),
      BannerImage: req.body.BannerImage,
      CreatedAt: new Date(),
      CreatedDate: new Date(),
      ModifyAt: new Date(),
      ModifyDate: new Date(),
    };

    const result = await db.collection('tblBanner').insertOne(bannerItem);

    sendResponse(res, "Banner inserted successfully.", null, result, null);
  } catch (error) {
    console.error("Error in createBanner:", error);
    next(error);
  }
};

exports.updatebanner = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tblBanner');
 
    const { BannerID, BannerImage } = req.body;

    if (!BannerID) {
      return res.status(400).json({ success: false, message: "BannerID is required" });
    }

    const updateFields = {
      BannerImage,
      ModifyAt: new Date(),
      ModifyDate: new Date(),
    };

    const updateResult = await collection.updateOne(
      { BannerID },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No banner found to update" });
    }

    return res.status(200).json({ success: true, message: "Banner updated successfully" });
  } catch (error) {
    console.error("Update Banner Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deletebanner = async (req, res, next) => {
  const { BannerID } = req.body;

  if (!BannerID) {
    return sendResponse(res, "BannerID is required", null, null, 400);
  }

  try {
    const db = await connectToMongoDB();

    // If you want to add any check to prevent deletion, e.g. check if banner is referenced in other collections,
    // you can add it here. For now, just delete.

    await db.collection('tblBanner').deleteOne({ BannerID });

    return sendResponse(res, "Banner deleted successfully", null, null, 200);
  } catch (error) {
    console.error("Error in deleteBanner:", error);
    return sendResponse(res, "Internal Server Error", null, error.message, 500);
  }
};
