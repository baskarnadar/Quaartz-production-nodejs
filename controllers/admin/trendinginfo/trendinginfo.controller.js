const { connectToMongoDB } = require("../../../database/mongodb");
const { generateUniqueId } = require("../../../controllers/operation/operation");

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

// ✅ Collection holds exactly ONE record: the single "Trending Text"
// settings entry (text + one image) shown on the app's trend-color banner.
const COLLECTION = "tbltrendinginfo";

// Get the single Trending Info record (there is only ever one).
exports.gettrendinginfo = async (req, res, next) => {
  const ImageVal = process.env.IMAGEURL;
  try {
    const db = await connectToMongoDB();
    const collection = db.collection(COLLECTION);

    // Singleton record -> just take the most recently modified one.
    const info = await collection.findOne(
      {},
      { sort: { ModifyDate: -1 } }
    );

    if (!info) {
      // No record yet — not an error, just empty state for the form.
      return sendResponse(res, "No trending info found yet.", null, null, 0);
    }

    info.TrendingImageUrl = info.TrendingImage
      ? ImageVal + "product/images/" + info.TrendingImage
      : "";

    sendResponse(res, "Trending info found.", null, info, 1);
  } catch (error) {
    console.error("Error in gettrendinginfo:", error);
    next(error);
  }
};

// Create or update the single Trending Info record (upsert).
// Since only one record may ever exist, this finds the existing
// document (if any) and updates it; otherwise it inserts the first one.
exports.savetrendinginfo = async (req, res, next) => {
  const ImageVal = process.env.IMAGEURL;
  try {
    const { TrendingText, TrendingImage } = req.body;

    if (!TrendingText || !TrendingText.trim()) {
      return sendResponse(res, "TrendingText is required", true, null, 0);
    }

    const db = await connectToMongoDB();
    const collection = db.collection(COLLECTION);

    const existing = await collection.findOne({});

    if (existing) {
      const updateFields = {
        TrendingText: String(TrendingText).trim(),
        ModifyDate: new Date(),
        ModifyBY: req.body.ModifyBY || "USER",
      };

      // Only overwrite the image when a new one was uploaded.
      if (TrendingImage) {
        updateFields.TrendingImage = TrendingImage;
      }

      await collection.updateOne(
        { TredingID: existing.TredingID },
        { $set: updateFields }
      );

      const updated = await collection.findOne({ TredingID: existing.TredingID });
      updated.TrendingImageUrl = updated.TrendingImage
        ? ImageVal + "product/images/" + updated.TrendingImage
        : "";

      return sendResponse(res, "Trending info updated successfully.", null, updated, 1);
    }

    // No record exists yet — create the first (and only) one.
    if (!TrendingImage) {
      return sendResponse(res, "TrendingImage is required", true, null, 0);
    }

    const newItem = {
      TredingID: generateUniqueId(),
      TrendingText: String(TrendingText).trim(),
      TrendingImage,
      CreatedBy: req.body.CreatedBy || "USER",
      CreatedDate: new Date(),
      ModifyDate: new Date(),
      ModifyBY: req.body.ModifyBY || "USER",
    };

    await collection.insertOne(newItem);

    newItem.TrendingImageUrl = ImageVal + "product/images/" + newItem.TrendingImage;

    sendResponse(res, "Trending info saved successfully.", null, newItem, 1);
  } catch (error) {
    console.error("Error in savetrendinginfo:", error);
    next(error);
  }
};
