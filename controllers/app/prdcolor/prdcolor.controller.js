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

    // Get all data ordered by OrderID (Ascending)
    const documents = await db
      .collection("tblMainColorCode")
      .find({})
      .sort({ OrderID: 1 })
      .toArray();

    return sendResponse(
      res,
      "Color fetched successfully.",
      null,
      documents
    );
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
      .collection("tblPrdSpecialColor")
      .find({
        MainColorCodeID: String(MainColorCodeID).trim(),
      })
      .sort({ OrderID: 1 }) // Sort by OrderID ASC
      .toArray();

    const updatedDocuments = documents.map((item) => ({
      ...item,
      ColorCode: item.SplColorCodeID || "",
      ColorName: item.SplColorCodeID || "",
      subColorCode : item.HexValue || "",
       SubColorCode : item.HexValue || "",
    }));

    return sendResponse(
      res,
      "Sub colors fetched successfully.",
      null,
      updatedDocuments
    );
  } catch (error) {
    console.error("Get Sub Color Error:", error);
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

              //  fields
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

function normalizeHexColor(value) {
  let hex = String(value || "").trim().replace(/\s+/g, "").toUpperCase();
  if (!hex) return "";
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9A-F]{3}$/.test(hex)) {
    hex = "#" + hex.slice(1).split("").map((c) => c + c).join("");
  }
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : null;
}

function hexToLab(hex) {
  const n = normalizeHexColor(hex);
  if (!n) return null;

  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(parseInt(n.substring(1, 3), 16));
  const g = toLinear(parseInt(n.substring(3, 5), 16));
  const b = toLinear(parseInt(n.substring(5, 7), 16));

  // sRGB -> XYZ (D65), normalised by the white point
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.0;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

// CIEDE2000 colour difference between two Lab colours
function deltaE2000(lab1, lab2) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const hp = (bb, ap) => {
    if (bb === 0 && ap === 0) return 0;
    const h = Math.atan2(bb, ap) * deg;
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(b1, a1p);
  const h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) {
      hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    } else {
      hbp = (h1p + h2p) / 2;
    }
  }

  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);

  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Cbp7 = Math.pow(Cbp, 7);
  const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;

  return Math.sqrt(
    Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh)
  );
}
 exports.getnearhexcolor = async (req, res, next) => {
  try {
    const body = req.body || {};
    const rawHex = body.HexValue ?? body.HexColor ?? body.PrdColorCode ?? "";

    if (!String(rawHex).trim()) {
      return sendResponse(res, "HexValue is required. Example: #E6E6E0", "validation_error", []);
    }

    const requestedHex = normalizeHexColor(rawHex);
    if (!requestedHex) {
      return sendResponse(res, "Invalid HexValue. Use HEX format such as #E6E6E0 or #EEE.", "validation_error", []);
    }

    // Maximum 15 colors (Limit can ask for fewer, never more)
    const MAX_LIMIT = 15;
    const limitNum = parseInt(body.Limit ?? MAX_LIMIT, 10);
    const Limit = Math.min(Math.max(Number.isNaN(limitNum) ? MAX_LIMIT : limitNum, 1), MAX_LIMIT);

    const ColorKeyCode = String(body.ColorKeyCode || "").trim();

    const db = await connectToMongoDB();
    const collection = db.collection("tblPrdSpecialColor");

    // Optional category filter (ignores case and spaces)
    const query = { HexValue: { $type: "string", $ne: "" } };
    if (ColorKeyCode) {
      const escaped = ColorKeyCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.ColorKeyCode = { $regex: `^\\s*${escaped}\\s*$`, $options: "i" };
    }

    const colors = await collection
      .find(query)
      .project({
        _id: 1,
        SplColorCodeIDPrKey: 1,
        SplColorCodeID: 1,
        ColorKeyCode: 1,
        ColorKeyCodeID: 1,
        HexValue: 1,
        EnColorName: 1,
        ArColorName: 1,
        MainColorCodeID: 1,
      })
      .toArray();

    const targetLab = hexToLab(requestedHex);

    const ranked = [];
    for (const c of colors) {
      const hex = normalizeHexColor(c.HexValue);
      if (!hex) continue; // skip bad HEX values in the table

      const distance = deltaE2000(targetLab, hexToLab(hex));

      ranked.push({
        _id: c._id,
        SplColorCodeIDPrKey: c.SplColorCodeIDPrKey || "",
        SplColorCodeID: c.SplColorCodeID || "", // Sigma Color Code
        ColorKeyCode: String(c.ColorKeyCode || "").trim(),
        ColorKeyCodeID: c.ColorKeyCodeID || "",
        HexValue: hex,
        EnColorName: c.EnColorName || "",
        ArColorName: c.ArColorName || "",
        MainColorCodeID: c.MainColorCodeID || "",
        Distance: Number(distance.toFixed(2)),
        // 0 distance = 100%, 50+ distance = 0%
        SimilarityPercent: Number(Math.max(0, 100 - distance * 2).toFixed(2)),
        IsExactMatch: hex === requestedHex,
      });
    }

    ranked.sort((x, y) => x.Distance - y.Distance);
    const nearest = ranked.slice(0, Limit);

    return sendResponse(
      res,
      `Nearest ${nearest.length} color(s) for ${requestedHex}.`,
      null,
      {
        RequestedHex: requestedHex,
        ColorKeyCode: ColorKeyCode,
        Limit: Limit,
        TotalSearched: ranked.length,
        Data: nearest,
      }
    );
  } catch (error) {
    console.log("[getnearhexcolor] Error:", error);
    next(error);
  }
};

 