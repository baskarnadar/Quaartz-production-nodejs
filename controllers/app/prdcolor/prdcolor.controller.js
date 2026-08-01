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

    if (!MainColorCodeID || String(MainColorCodeID).trim() === "") {
      return sendResponse(
        res,
        "MainColorCodeID is required.",
        "validation_error",
        null
      );
    }

    const documents = await db
      .collection("tblSubColorCode")
      .aggregate([
        {
          $match: {
            MainColorCodeID: String(MainColorCodeID).trim(),
          },
        },
        {
          $set: {
            // Display ColorCode data in both fields
            EnSubColorName: {
              $ifNull: ["$ColorCode", ""],
            },
            ArSubColorName: {
              $ifNull: ["$ColorCode", ""],
            },
          },
        },
      ])
      .toArray();

    return sendResponse(
      res,
      "Sub colors fetched successfully.",
      null,
      documents
    );
  } catch (error) {
    console.error("Get Sub Color Error:", error);
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

 
 exports.getprdcolormatchlist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const {
      PrdColorCode,
      usercategory, // Currently accepted but not used unless product has this field
    } = req.body || {};

    // =========================================================
    // Helper: Normalize HEX color
    // Supports #FFFFFF, FFFFFF, #FFF and FFF
    // =========================================================
    const normalizeHexColor = (value) => {
      let hex = String(value || "")
        .trim()
        .replace(/\s+/g, "")
        .toUpperCase();

      if (!hex) {
        return "";
      }

      if (!hex.startsWith("#")) {
        hex = `#${hex}`;
      }

      // Convert short HEX such as #FFF to #FFFFFF
      if (/^#[0-9A-F]{3}$/.test(hex)) {
        hex =
          "#" +
          hex
            .slice(1)
            .split("")
            .map((char) => char + char)
            .join("");
      }

      if (!/^#[0-9A-F]{6}$/.test(hex)) {
        return "";
      }

      return hex;
    };

    const requestedColorCode = normalizeHexColor(PrdColorCode);

    if (!String(PrdColorCode || "").trim()) {
      return sendResponse(
        res,
        "PrdColorCode is required.",
        "validation_error",
        null
      );
    }

    if (!requestedColorCode) {
      return sendResponse(
        res,
        "Invalid PrdColorCode. Use HEX format such as #FAF9F6.",
        "validation_error",
        null
      );
    }

    // =========================================================
    // Image URL
    // =========================================================
    const imageRoot = `${
      String(process.env.IMAGEURL || "").replace(/\/+$/, "")
    }/product/images`;

    const safeJoin = (base, file) => {
      const cleanBase = String(base || "").replace(/\/+$/, "");
      const cleanFile = String(file || "")
        .trim()
        .replace(/^\/+/, "");

      if (!cleanBase || !cleanFile) {
        return "";
      }

      // Already a complete URL
      if (/^https?:\/\//i.test(cleanFile)) {
        return cleanFile;
      }

      return `${cleanBase}/${cleanFile}`;
    };

    // =========================================================
    // Helper: Escape text used inside regular expression
    // =========================================================
    const escapeRegex = (value) => {
      return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    // =========================================================
    // Helper: Convert HEX to RGB
    // =========================================================
    const hexToRgb = (hexColor) => {
      const normalized = normalizeHexColor(hexColor);

      if (!normalized) {
        return null;
      }

      return {
        red: parseInt(normalized.substring(1, 3), 16),
        green: parseInt(normalized.substring(3, 5), 16),
        blue: parseInt(normalized.substring(5, 7), 16),
      };
    };

    // =========================================================
    // Helper: Calculate RGB color distance
    // Smaller value means a closer color
    // Exact match = 0
    // Maximum possible distance = approximately 441.67
    // =========================================================
    const calculateColorDistance = (firstHex, secondHex) => {
      const firstColor = hexToRgb(firstHex);
      const secondColor = hexToRgb(secondHex);

      if (!firstColor || !secondColor) {
        return Number.MAX_SAFE_INTEGER;
      }

      const redDifference = firstColor.red - secondColor.red;
      const greenDifference = firstColor.green - secondColor.green;
      const blueDifference = firstColor.blue - secondColor.blue;

      return Math.sqrt(
        redDifference * redDifference +
          greenDifference * greenDifference +
          blueDifference * blueDifference
      );
    };

    // =========================================================
    // Helper: Convert distance to similarity percentage
    // =========================================================
    const calculateSimilarityPercent = (distance) => {
      const maximumRgbDistance = Math.sqrt(
        255 * 255 + 255 * 255 + 255 * 255
      );

      const similarity =
        100 - (Number(distance || 0) / maximumRgbDistance) * 100;

      return Number(
        Math.max(0, Math.min(100, similarity)).toFixed(2)
      );
    };

    // =========================================================
    // Helper: Fetch products for a selected color
    // =========================================================
    const getProductsByColorCode = async (colorCode) => {
      const lookupProductPipeline = [
        {
          $match: {
            $expr: {
              $eq: ["$ProductID", "$$productId"],
            },
          },
        },
        {
          $match: {
            IsDataStatus: {
              $ne: 0,
            },
          },
        },
      ];

      /*
       * Optional usercategory filtering:
       *
       * Enable this only when tblProduct contains a field named
       * usercategory.
       *
       * Example:
       *
       * if (String(usercategory || "").trim()) {
       *   lookupProductPipeline.push({
       *     $match: {
       *       usercategory: String(usercategory).trim().toUpperCase(),
       *     },
       *   });
       * }
       */

      return db
        .collection("tblProductColor")
        .aggregate([
          {
            $match: {
              PrdColorCode: {
                $regex: `^${escapeRegex(colorCode)}$`,
                $options: "i",
              },
              IsDataStatus: {
                $ne: 0,
              },
              ProductID: {
                $nin: [null, "", "undefined"],
              },
            },
          },
          {
            $lookup: {
              from: "tblProduct",
              let: {
                productId: "$ProductID",
              },
              pipeline: lookupProductPipeline,
              as: "product",
            },
          },
          {
            $unwind: {
              path: "$product",

              // Do not return color records that have no real product
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $project: {
              _id: 1,

              // tblProductColor fields
              PCID: 1,
              PrdColorCodeID: 1,
              ProductID: 1,
              PrdColorCode: 1,
              PrdColorType: 1,
              EnPrdColorName: 1,
              ArPrdColorName: 1,
              IsDataStatus: 1,
              createdAt: 1,
              modifiedAt: 1,

              // Optional root image fields
              PrdThumb: 1,
              PrdLarge: 1,
              PrdBann: 1,
              PrdBanner: 1,

              // Complete tblProduct document
              ProductInfo: "$product",
            },
          },
        ])
        .toArray();
    };

    // =========================================================
    // Step 1: Try exact color match
    // =========================================================
    let matchedColorCode = requestedColorCode;
    let matchType = "EXACT";
    let colorDistance = 0;

    let rows = await getProductsByColorCode(requestedColorCode);

    // =========================================================
    // Step 2: Exact product color not found
    // Find the nearest available product color
    // =========================================================
    if (!rows.length) {
      const availableColors = await db
        .collection("tblProductColor")
        .aggregate([
          {
            $match: {
              IsDataStatus: {
                $ne: 0,
              },
              ProductID: {
                $nin: [null, "", "undefined"],
              },
              PrdColorCode: {
                $type: "string",
                $regex: /^#[0-9A-Fa-f]{6}$/,
              },
            },
          },
          {
            $lookup: {
              from: "tblProduct",
              let: {
                productId: "$ProductID",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$ProductID", "$$productId"],
                    },
                    IsDataStatus: {
                      $ne: 0,
                    },
                  },
                },
              ],
              as: "product",
            },
          },
          {
            // Only use colors that have an existing active product
            $match: {
              "product.0": {
                $exists: true,
              },
            },
          },
          {
            $project: {
              _id: 0,
              PrdColorCode: 1,
            },
          },
          {
            // Avoid calculating the same color many times
            $group: {
              _id: {
                $toUpper: "$PrdColorCode",
              },
            },
          },
        ])
        .toArray();

      let nearestColor = null;
      let nearestDistance = Number.MAX_SAFE_INTEGER;

      for (const colorDocument of availableColors) {
        const candidateColorCode = normalizeHexColor(
          colorDocument?._id
        );

        if (!candidateColorCode) {
          continue;
        }

        const currentDistance = calculateColorDistance(
          requestedColorCode,
          candidateColorCode
        );

        if (currentDistance < nearestDistance) {
          nearestDistance = currentDistance;
          nearestColor = candidateColorCode;
        }
      }

      if (!nearestColor) {
        return sendResponse(
          res,
          "No product colors are available.",
          null,
          []
        );
      }

      matchedColorCode = nearestColor;
      colorDistance = Number(nearestDistance.toFixed(2));
      matchType = "NEAREST";

      rows = await getProductsByColorCode(matchedColorCode);
    }

    // =========================================================
    // Step 3: Build final documents and image URLs
    // =========================================================
    const similarityPercent = calculateSimilarityPercent(
      colorDistance
    );

    const documents = rows.map((item) => {
      const prdThumb =
        item?.ProductInfo?.PrdThumb ??
        item?.PrdThumb ??
        "";

      const prdLarge =
        item?.ProductInfo?.PrdLarge ??
        item?.PrdLarge ??
        "";

      const prdBanner =
        item?.ProductInfo?.PrdBanner ??
        item?.ProductInfo?.PrdBann ??
        item?.PrdBanner ??
        item?.PrdBann ??
        "";

      return {
        ...item,

        // Matching information
        MatchType: matchType,
        IsExactMatch: matchType === "EXACT",
        RequestedColorCode: requestedColorCode,
        MatchedColorCode: matchedColorCode,
        ColorDistance: colorDistance,
        SimilarityPercent: similarityPercent,

        // Complete image URLs
        PrdThumbUrl: safeJoin(imageRoot, prdThumb),
        PrdLargeUrl: safeJoin(imageRoot, prdLarge),
        PrdBannerUrl: safeJoin(imageRoot, prdBanner),
      };
    });

    const message =
      matchType === "EXACT"
        ? "Exact product color match fetched successfully."
        : `Exact color was not found. Nearest available color ${matchedColorCode} was selected.`;

    return sendResponse(res, message, null, documents);
  } catch (error) {
    console.error(
      "[getprdcolormatchlist] Error:",
      error
    );

    next(error);
  }
};
 
 

 