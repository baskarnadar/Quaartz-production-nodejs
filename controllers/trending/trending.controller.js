const { connectToMongoDB } = require("../../database/mongodb");

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

// ✅ App-facing (unprotected) read of the single "Trending Text" record
// — text + one image shown on the app's Color By Trend banner.
// Collection `tbltrendinginfo` only ever holds one document; it is
// managed from the admin side at /api/admin/trendinginfo.
exports.gettrendinginfo = async (req, res, next) => {
  const ImageVal = process.env.IMAGEURL;
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tbltrendinginfo");

    const info = await collection.findOne({}, { sort: { ModifyDate: -1 } });

    if (!info) {
      return sendResponse(res, "No trending info found yet.", null, null, 0);
    }

    const data = {
      TredingID: info.TredingID,
      TrendingText: info.TrendingText,
      TrendingImage: info.TrendingImage,
      TrendingImageUrl: info.TrendingImage
        ? ImageVal + "product/images/" + info.TrendingImage
        : "",
    };

    sendResponse(res, "Trending info found.", null, data, 1);
  } catch (error) {
    console.error("Error in gettrendinginfo (app):", error);
    next(error);
  }
};
