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

 

 
// =========================================================
// getprdcolormatchlist
// POST /api/app/prdcolor/getprdcolormatchlist
// Body (send one or both):
//   sigmacolorcode : "8010-R70B"
//   ColorKeyCode   : "SCS"
//
// Finds every product that has this color:
//   Option 1: tblProductColor.sigmacolorcode = sigmacolorcode -> ProductID
//   Option 2: tblProductColor.ColorKeyCode   = ColorKeyCode   -> ProductID
// (case-insensitive, extra spaces ignored, deleted rows skipped)
// Then returns the active products from tblProduct (one per ProductID).
// =========================================================
exports.getprdcolormatchlist = async (req, res, next) => {
  try {
    const body = req.body || {};
    const sigmacolorcode = String(body.sigmacolorcode ?? "").trim();
    const ColorKeyCode = String(body.ColorKeyCode ?? "").trim();

    if (!sigmacolorcode && !ColorKeyCode) {
      return sendResponse(
        res,
        "sigmacolorcode or ColorKeyCode is required.",
        "validation_error",
        []
      );
    }

    const db = await connectToMongoDB();

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------
    const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // exact text, case-insensitive, ignores spaces around the value
    const exactText = (v) => ({ $regex: `^\\s*${escapeRegex(v)}\\s*$`, $options: "i" });

    const imageRoot = `${String(process.env.IMAGEURL || "").replace(/\/+$/, "")}/product/images`;
    const safeJoin = (base, file) => {
      const cleanFile = String(file || "").trim().replace(/^\/+/, "");
      if (!base || !cleanFile) return "";
      if (/^https?:\/\//i.test(cleanFile)) return cleanFile; // already a full URL
      return `${base}/${cleanFile}`;
    };

    // ---------------------------------------------------------
    // Step 1: find ProductIDs in tblProductColor
    // ---------------------------------------------------------
    const orConditions = [];
    if (sigmacolorcode) orConditions.push({ sigmacolorcode: exactText(sigmacolorcode) }); // Option 1
    if (ColorKeyCode) orConditions.push({ ColorKeyCode: exactText(ColorKeyCode) });       // Option 2

    const colorRows = await db
      .collection("tblProductColor")
      .find({
        $or: orConditions,
        IsDataStatus: { $ne: 0 },
        ProductID: { $nin: [null, "", "undefined"] },
      })
      .project({
        _id: 0,
        ProductID: 1,
        PrdColorCodeID: 1,
        PrdColorCode: 1,
        sigmacolorcode: 1,
        ColorKeyCode: 1,
        ColorKeyCodeID: 1,
      })
      .toArray();

    // Group color rows by ProductID and remember HOW each product matched
    const sigmaLower = sigmacolorcode.toLowerCase();
    const keyLower = ColorKeyCode.toLowerCase();
    const byProduct = new Map();

    for (const row of colorRows) {
      const pid = String(row.ProductID).trim();
      if (!byProduct.has(pid)) {
        byProduct.set(pid, { matchedBy: new Set(), colors: [] });
      }
      const entry = byProduct.get(pid);

      if (sigmacolorcode && String(row.sigmacolorcode || "").trim().toLowerCase() === sigmaLower) {
        entry.matchedBy.add("sigmacolorcode");
      }
      if (ColorKeyCode && String(row.ColorKeyCode || "").trim().toLowerCase() === keyLower) {
        entry.matchedBy.add("ColorKeyCode");
      }

      entry.colors.push({
        PrdColorCodeID: row.PrdColorCodeID || "",
        PrdColorCode: row.PrdColorCode || "",
        sigmacolorcode: row.sigmacolorcode || "",
        ColorKeyCode: String(row.ColorKeyCode || "").trim(),
        ColorKeyCodeID: String(row.ColorKeyCodeID || "").trim(),
      });
    }

    const productIds = [...byProduct.keys()];

    if (productIds.length === 0) {
      return sendResponse(res, "No products found for this color.", null, []);
    }

    // ---------------------------------------------------------
    // Step 2: get the active products from tblProduct
    // ---------------------------------------------------------
    const products = await db
      .collection("tblProduct")
      .find({ ProductID: { $in: productIds }, IsDataStatus: { $ne: 0 } })
      .toArray();

    // ---------------------------------------------------------
    // Step 3: build the response (one item per product)
    // ---------------------------------------------------------
    const documents = products.map((product) => {
      const pid = String(product.ProductID).trim();
      const entry = byProduct.get(pid) || { matchedBy: new Set(), colors: [] };
      const firstColor = entry.colors[0] || {};

      return {
        ProductID: pid,

        // How this product matched: ["sigmacolorcode"], ["ColorKeyCode"] or both
        MatchedBy: [...entry.matchedBy],
        RequestedSigmaColorCode: sigmacolorcode,
        RequestedColorKeyCode: ColorKeyCode,

        // First matching tblProductColor row (kept at root for older app code)
        PrdColorCodeID: firstColor.PrdColorCodeID || "",
        PrdColorCode: firstColor.PrdColorCode || "",
        sigmacolorcode: firstColor.sigmacolorcode || "",
        ColorKeyCode: firstColor.ColorKeyCode || "",
        ColorKeyCodeID: firstColor.ColorKeyCodeID || "",

        // All matching tblProductColor rows for this product
        MatchedColors: entry.colors,

        // Complete tblProduct document
        ProductInfo: product,

        // Complete image URLs
        PrdThumbUrl: safeJoin(imageRoot, product.PrdThumb),
        PrdLargeUrl: safeJoin(imageRoot, product.PrdLarge),
        PrdBannerUrl: safeJoin(imageRoot, product.PrdBanner ?? product.PrdBann),
      };
    });

    // Products that matched both ways first, then by name
    documents.sort(
      (a, b) =>
        b.MatchedBy.length - a.MatchedBy.length ||
        String(a.ProductInfo.PrdName || "").localeCompare(String(b.ProductInfo.PrdName || ""))
    );

    return sendResponse(
      res,
      `${documents.length} product(s) found.`,
      null,
      documents
    );
  } catch (error) {
    console.error("[getprdcolormatchlist] Error:", error);
    next(error);
  }
};

// =========================================================
// Helper: normalize HEX to "#RRGGBB" (uppercase). "" when empty, null when invalid.
// (getprdcolormatchlist keeps its own local version)
// =========================================================
function normalizeHexColor(value) {
  let hex = String(value || "").trim().replace(/\s+/g, "").toUpperCase();
  if (!hex) return "";
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9A-F]{3}$/.test(hex)) {
    hex = "#" + hex.slice(1).split("").map((c) => c + c).join("");
  }
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : null;
}

// =========================================================
// getnearhexcolor
// POST /api/app/prdcolor/getnearhexcolor
// Body:
//   HexValue     : "#E6E6E0"  (required; also accepts "E6E6E0", "#EEE")
//   Limit        : 15         (optional, 1-15, default 15, max 15)
//   ColorKeyCode : "SCS"      (optional, only search this category)
//
// Finds the nearest colors in tblPrdSpecialColor.
// Distance = CIEDE2000 (how different two colors look to the human eye):
//   0       -> exact same color
//   < 1     -> difference not visible
//   1 - 2   -> visible only on close look
//   2 - 10  -> visible at a glance
//   > 10    -> clearly different color
// =========================================================

// HEX "#RRGGBB" -> CIE Lab (D65)
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

    // tblProductColor colors are shown FIRST only when they are close enough.
    // CIEDE2000 distance: <= 10 means "same color family" to the eye.
    const PRODUCT_COLOR_MAX_DISTANCE = 10;

    const ColorKeyCode = String(body.ColorKeyCode || "").trim();
    const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const db = await connectToMongoDB();
    const targetLab = hexToLab(requestedHex);

    const measure = (hex) => {
      const distance = deltaE2000(targetLab, hexToLab(hex));
      return {
        Distance: Number(distance.toFixed(2)),
        // 0 distance = 100%, 50+ distance = 0%
        SimilarityPercent: Number(Math.max(0, 100 - distance * 2).toFixed(2)),
        IsExactMatch: hex === requestedHex,
      };
    };

    // =========================================================
    // STEP 1: tblProductColor.PrdColorCode (manual product colors)
    //   WHERE IsDataStatus != 0
    //     AND ProductID is set
    //     AND PrdColorCode is a HEX value
    // =========================================================
    const productQuery = {
      IsDataStatus: { $ne: 0 },
      ProductID: { $nin: [null, "", "undefined"] },
      PrdColorCode: { $type: "string", $ne: "" },
    };
    if (ColorKeyCode) {
      productQuery.ColorKeyCode = { $regex: `^\\s*${escapeRegex(ColorKeyCode)}\\s*$`, $options: "i" };
    }

    const productColors = await db
      .collection("tblProductColor")
      .find(productQuery)
      .project({
        _id: 1,
        PrdColorCodeID: 1,
        ProductID: 1,
        PrdColorCode: 1,
        sigmacolorcode: 1,
        EnPrdColorName: 1,
        ArPrdColorName: 1,
        ColorKeyCode: 1,
        ColorKeyCodeID: 1,
      })
      .toArray();

    const productRanked = [];
    for (const c of productColors) {
      const hex = normalizeHexColor(c.PrdColorCode);
      if (!hex) continue; // skip bad HEX values

      const m = measure(hex);
      if (m.Distance > PRODUCT_COLOR_MAX_DISTANCE) continue;

      productRanked.push({
        Source: "tblProductColor",
        _id: c._id,
        PrdColorCodeID: c.PrdColorCodeID || "",
        ProductID: c.ProductID || "",
        SplColorCodeIDPrKey: "",
        sigmacolorcode: c.sigmacolorcode || "", // Sigma Color Code
        ColorKeyCode: String(c.ColorKeyCode || "").trim(),
        ColorKeyCodeID: c.ColorKeyCodeID || "",
        HexValue: hex,
        EnColorName: c.EnPrdColorName || c.sigmacolorcode || "",
        ArColorName: c.ArPrdColorName || c.sigmacolorcode || "",
        MainColorCodeID: "",
        ...m,
      });
    }
    productRanked.sort((x, y) => x.Distance - y.Distance);

    // =========================================================
    // STEP 2: tblPrdSpecialColor.HexValue (category palettes)
    //   fills the remaining places up to Limit
    // =========================================================
    const specialQuery = { HexValue: { $type: "string", $ne: "" } };
    if (ColorKeyCode) {
      specialQuery.ColorKeyCode = { $regex: `^\\s*${escapeRegex(ColorKeyCode)}\\s*$`, $options: "i" };
    }

    const specialColors = await db
      .collection("tblPrdSpecialColor")
      .find(specialQuery)
      .project({
        _id: 1,
        SplColorCodeIDPrKey: 1,
        SplColorCodeID: 1,
        sigmacolorcode: 1,
        ColorKeyCode: 1,
        ColorKeyCodeID: 1,
        HexValue: 1,
        EnColorName: 1,
        ArColorName: 1,
        MainColorCodeID: 1,
      })
      .toArray();

    const specialRanked = [];
    for (const c of specialColors) {
      const hex = normalizeHexColor(c.HexValue);
      if (!hex) continue; // skip bad HEX values

      specialRanked.push({
        Source: "tblPrdSpecialColor",
        _id: c._id,
        PrdColorCodeID: "",
        ProductID: "",
        SplColorCodeIDPrKey: c.SplColorCodeIDPrKey || "",
        // Sigma Color Code: tblPrdSpecialColor.SplColorCodeID -> sigmacolorcode
        sigmacolorcode: c.SplColorCodeID || c.sigmacolorcode || "",
        ColorKeyCode: String(c.ColorKeyCode || "").trim(),
        ColorKeyCodeID: c.ColorKeyCodeID || "",
        HexValue: hex,
        EnColorName: c.EnColorName || "",
        ArColorName: c.ArColorName || "",
        MainColorCodeID: c.MainColorCodeID || "",
        ...measure(hex),
      });
    }
    specialRanked.sort((x, y) => x.Distance - y.Distance);

    // =========================================================
    // STEP 3: tblProductColor first, then tblPrdSpecialColor, max Limit
    // =========================================================
    const productPart = productRanked.slice(0, Limit);
    const specialPart = specialRanked.slice(0, Limit - productPart.length);
    const nearest = [...productPart, ...specialPart];

    return sendResponse(
      res,
      `Nearest ${nearest.length} color(s) for ${requestedHex}.`,
      null,
      {
        RequestedHex: requestedHex,
        ColorKeyCode: ColorKeyCode,
        Limit: Limit,
        ProductColorCount: productPart.length,
        SpecialColorCount: specialPart.length,
        TotalSearched: productColors.length + specialRanked.length,
        Data: nearest,
      }
    );
  } catch (error) {
    console.log("[getnearhexcolor] Error:", error);
    next(error);
  }
};
