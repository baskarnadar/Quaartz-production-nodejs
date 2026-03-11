const { connectToMongoDB } = require("../../../database/mongodb");
const { generateUniqueId } = require("../../../controllers/operation/operation");
// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'data': results,
    'error': error,
  });
}


exports.getmaincolor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    // ✅ Get all data from tblMainColorCode (no ProductID filter)
    const documents = await db.collection("tblMainColorCode").find({}).toArray();

    return sendResponse(res, "Color fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getsubcolor = async (req, res, next) => {
  try {
    const { MainColorCodeID } = req.body || {};
    const db = await connectToMongoDB();

    if (!MainColorCodeID) {
      return sendResponse(
        res,
        "MainColorCodeID is required.",
        "validation_error",
        null
      );
    }

    // ✅ Get all sub colors linked to the given MainColorCodeID
    const documents = await db
      .collection("tblSubColorCode")
      .find({ MainColorCodeID: String(MainColorCodeID) })
      .toArray();

    return sendResponse(res, "Sub colors fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getsubcolor = async (req, res, next) => {
  try {
    const { MainColorCodeID } = req.body || {};
    const db = await connectToMongoDB();

    if (!MainColorCodeID) {
      return sendResponse(
        res,
        "MainColorCodeID is required.",
        "validation_error",
        null
      );
    }

    // ✅ Get all sub colors linked to the given MainColorCodeID
    const documents = await db
      .collection("tblSubColorCode")
      .find({ MainColorCodeID: String(MainColorCodeID) })
      .toArray();

    return sendResponse(res, "Sub colors fetched successfully.", null, documents);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

 
 
 
 // controllers/prdcolor/prdcolor.controller.js
// (full function, no import/require block)

// controllers/prdcolor/prdcolor.controller.js
// (full function, no import/require block)

exports.getprdcolormatchlist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const { PrdColorCode } = req.body || {};
    const prdColorCodeStr = String(PrdColorCode || "").trim();

    if (!prdColorCodeStr) {
      return sendResponse(res, "PrdColorCode is required.", "validation_error", null);
    }
    var IMAGEURL=process.env.IMAGEURL+"product/images/";

    // ✅ Base image URL from .env (IMAGEURL)
    const rawBase = String(IMAGEURL || "").trim();
    const baseUrl = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

    const rows = await db
      .collection("tblProductColor")
      .aggregate([
        { $match: { PrdColorCode: prdColorCodeStr } },
        {
          $lookup: {
            from: "tblProduct",
            localField: "ProductID",
            foreignField: "ProductID",
            as: "product",
          },
        },
        {
          $unwind: {
            path: "$product",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,

            // tblProductColor fields
            PrdColorCodeID: 1,
            ProductID: 1,
            PrdColorCode: 1,
            EnPrdColorName: 1,
            ArPrdColorName: 1,
            IsDataStatus: 1,
            createdAt: 1,
            modifiedAt: 1,

            // keep if you have images in tblProductColor too (optional)
            PrdThumb: 1,
            PrdLarge: 1,
            PrdBann: 1,

            // tblProduct fields nested
            ProductInfo: "$product",
          },
        },
      ])
      .toArray();

    const safeJoin = (base, file) => {
      const f = String(file || "").trim();
      if (!base || !f) return "";
      return `${base}/${f.replace(/^\/+/, "")}`;
    };

    const documents = (rows || []).map((x) => {
      // ✅ Prefer ProductInfo.* (because your response shows images are there)
      // Fallback to root fields if needed
      const prdThumb =
        x?.ProductInfo?.PrdThumb ?? x?.PrdThumb ?? "";

      const prdLarge =
        x?.ProductInfo?.PrdLarge ?? x?.PrdLarge ?? "";

      // IMPORTANT: tblProduct uses PrdBanner (not PrdBann)
      const prdBanner =
        x?.ProductInfo?.PrdBanner ??
        x?.ProductInfo?.PrdBann ??
        x?.PrdBanner ??
        x?.PrdBann ??
        "";

      return {
        ...x,

        // ✅ required names (your requirement)
        PrdThumbUrl: safeJoin(baseUrl, prdThumb),
        PrdLargeUrl: safeJoin(baseUrl, prdLarge),
        PrdBannerUrl: safeJoin(baseUrl, prdBanner),
      };
    });

    return sendResponse(
      res,
      "Product colors + product data fetched successfully.",
      null,
      documents
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};

 
 

 