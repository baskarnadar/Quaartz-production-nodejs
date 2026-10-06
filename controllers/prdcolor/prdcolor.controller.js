 const { connectToMongoDB } = require("../../database/mongodb");
const { generateUniqueId } = require("../../controllers/operation/operation");
// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'data': results,
    'error': error,
  });
}

// =========================================================
// Helper: normalize HEX to "#RRGGBB" (uppercase).
// Accepts "#fff", "fff", "#ffffff", "ffffff".
// Returns "" when empty, null when invalid.
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
// Helper: look up a category in tblprdColorKeyCode.
// Returns { ColorKeyCode, ColorKeyCodeID } using the values stored
// in tblprdColorKeyCode. Matching is case-insensitive and trimmed.
// If the category is not found, falls back to the ColorKeyCodeID
// the client sent (if any), otherwise "".
// =========================================================
async function resolveColorKeyCode(db, ColorKeyCode, clientColorKeyCodeID) {
  const key = String(ColorKeyCode || "").trim();
  if (!key) return { ColorKeyCode: "", ColorKeyCodeID: "" };

  const found = await db.collection("tblprdColorKeyCode").findOne(
    {
      $expr: {
        $eq: [
          { $toUpper: { $trim: { input: { $toString: "$ColorKeyCode" } } } },
          key.toUpperCase(),
        ],
      },
    },
    { projection: { ColorKeyCode: 1, ColorKeyCodeID: 1 } }
  );

  if (found) {
    return {
      ColorKeyCode: String(found.ColorKeyCode || key).trim(),
      ColorKeyCodeID: String(found.ColorKeyCodeID || "").trim(),
    };
  }

  console.warn(`[prdcolor] ColorKeyCode "${key}" not found in tblprdColorKeyCode`);
  return {
    ColorKeyCode: key,
    ColorKeyCodeID: String(clientColorKeyCodeID || "").trim(),
  };
}


exports.getprdcolorbyidgroup = async (req, res, next) => {
  try {
    const ProductID = req.body.ProductID; 
    const db = await connectToMongoDB();
    
   const collection = await db.collection('tblProductColor'); 
   collection.find({ ProductID: ProductID }).toArray()
   .then(documents => {
    sendResponse(res, "Color  successfully.",  null , documents);
   })
   .catch(err => {
    sendResponse(res, "No Color  ",  null , documents);
   });
 
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 exports.getprdcolorbyid = async (req, res, next) => {
  try {
    const ProductID = String(req.body.ProductID || "").trim();

    if (!ProductID) {
      return sendResponse(
        res,
        "ProductID is required.",
        "ProductID is required.",
        []
      );
    }

    const db = await connectToMongoDB();

    const productColorCollection = db.collection("tblProductColor");
    const specialColorCollection = db.collection("tblPrdSpecialColor");

    const escapeRegex = (value) =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ---------------------------------------------------------
    // 1) Product colors
    //    WHERE tblProductColor.ProductID = ProductID
    //      AND tblProductColor.IsDataStatus != 0  (skip deleted)
    // ---------------------------------------------------------
    const productColors = await productColorCollection
      .find({ ProductID, IsDataStatus: { $ne: 0 } })
      .toArray();

    const finalColors = [];
    const addedCategories = new Set(); // avoid showing the same palette twice

    for (const color of productColors) {
      const ColorKeyCode = String(color.ColorKeyCode || "").trim();
      const ColorKeyCodeID = String(color.ColorKeyCodeID || "").trim();

      // Manual color (no category) -> return the row itself
      if (!ColorKeyCode && !ColorKeyCodeID) {
        finalColors.push({
          ...color,
          // tblProductColor stores the HEX in PrdColorCode
          HexValue: color.HexValue || color.PrdColorCode || "",
          SplColorCodeID: color.SplColorCodeID || "",
          ColorKeyCode: "",
          ColorKeyCodeID: "",
          sigmacolorcode: color.sigmacolorcode || "",
        });
        continue;
      }

      const categoryKey = (ColorKeyCodeID || ColorKeyCode).toUpperCase();
      if (addedCategories.has(categoryKey)) continue;

      // ---------------------------------------------------------
      // 2) Category palette
      //    WHERE tblPrdSpecialColor.ColorKeyCodeID = tblProductColor.ColorKeyCodeID
      //       OR tblPrdSpecialColor.ColorKeyCode   = tblProductColor.ColorKeyCode
      //    (ColorKeyCode match ignores case and spaces)
      // ---------------------------------------------------------
      const orConditions = [];
      if (ColorKeyCodeID) {
        orConditions.push({ ColorKeyCodeID: ColorKeyCodeID });
      }
      if (ColorKeyCode) {
        orConditions.push({
          ColorKeyCode: {
            $regex: `^\\s*${escapeRegex(ColorKeyCode)}\\s*$`,
            $options: "i",
          },
        });
      }

      const specialColors = await specialColorCollection
        .find({ $or: orConditions })
        .toArray();

      if (specialColors.length > 0) {
        addedCategories.add(categoryKey);

        specialColors.forEach((spColor) => {
          finalColors.push({
            _id: spColor._id,
            EnPrdColorName: spColor.EnColorName || spColor.EnPrdColorName || "",
            ArPrdColorName: spColor.ArColorName || spColor.ArPrdColorName || "",
            ProductID,

            // Color value from tblPrdSpecialColor
            HexValue: spColor.HexValue || "",
            PrdColorCode: spColor.HexValue || "",

            PrdColorCodeID: spColor.SplColorCodeIDPrKey || "",
            SplColorCodeID: spColor.SplColorCodeID || "",
            SplColorCodeIDPrKey: spColor.SplColorCodeIDPrKey || "",
            ColorKeyCode: String(spColor.ColorKeyCode || ColorKeyCode).trim(),
            ColorKeyCodeID: spColor.ColorKeyCodeID || ColorKeyCodeID,

            // Sigma Color Code
            sigmacolorcode: spColor.SplColorCodeID || "",
          });
        });
      } else {
        // Category has no palette colors -> return the row itself
        console.warn(
          `[getprdcolorbyid] No tblPrdSpecialColor rows for ColorKeyCodeID="${ColorKeyCodeID}" / ColorKeyCode="${ColorKeyCode}"`
        );
        finalColors.push({
          ...color,
          HexValue: color.HexValue || color.PrdColorCode || "",
          SplColorCodeID: color.SplColorCodeID || "",
          ColorKeyCode: ColorKeyCode,
          ColorKeyCodeID: ColorKeyCodeID,
          sigmacolorcode: color.sigmacolorcode || "",
        });
      }
    }

    return sendResponse(res, "Color successfully.", null, finalColors);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
exports.getprdcolorbycolorcode = async (req, res, next) => {
  try {
    const PrdColorCode = req.body.PrdColorCode; 
    const db = await connectToMongoDB();
    
   const collection = await db.collection('tblProductColor'); 
   collection.find({ PrdColorCode: PrdColorCode }).toArray()
   .then(documents => {
    sendResponse(res, "Color  successfully.",  null , documents);
   })
   .catch(err => {
    sendResponse(res, "No Color  ",  null , documents);
   });
 
  } catch (error) {
    console.log(error);
    next(error);
  }
};


exports.getprdcolorlist = async (req, res, next) => {
  try {
   
    const db = await connectToMongoDB();
    
   const collection = await db.collection('tblProductColor'); 
   collection.find().toArray()
   .then(documents => {
    sendResponse(res, "Color  successfully.",  null , documents);
   })
   .catch(err => {
    sendResponse(res, "No Color  ",  null , documents);
   });
 
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.editPrdColor = async (req, res, next) => {
  const { PrdColorCodeID, ProductID, EnPrdColorName, ArPrdColorName } = req.body;

  // Sigma Color Code is OPTIONAL now
  const sigmacolorcode = String(req.body.sigmacolorcode || "").trim();

  // Color Code (HEX) is optional, but if sent it must be valid
  const PrdColorCode = normalizeHexColor(req.body.PrdColorCode);
  if (PrdColorCode === null) {
    return res.status(400).json({ statusCode: 400, error: 'validation_error',
      message: 'Invalid Color Code. Use HEX format such as #AABBCC or #ABC.' });
  }

  const updatedData = {
    EnPrdColorName: String(EnPrdColorName || "").trim() || sigmacolorcode || PrdColorCode,
    ArPrdColorName: String(ArPrdColorName || "").trim() || sigmacolorcode || PrdColorCode,
    modifiedAt: new Date(),
    PrdColorCode: PrdColorCode,
    sigmacolorcode: sigmacolorcode
  };

  // Category (ColorKeyCode): one per color row. Only touched when the client sends it,
  // so older clients that don't send it keep the current value.
  const hasColorKeyCode = Object.prototype.hasOwnProperty.call(req.body, 'ColorKeyCode');
  let rawKey = '';
  if (hasColorKeyCode) {
    const raw = req.body.ColorKeyCode;
    const arr = (Array.isArray(raw) ? raw : [raw])
      .map((x) => String(x || '').trim())
      .filter((x) => x !== '');
    if (arr.length > 1) {
      return res.status(400).json({ statusCode: 400, error: 'validation_error',
        message: 'A color can have only one Category. Use "Add New Color" to add the other categories.' });
    }
    rawKey = arr[0] || '';
  }

  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tblProductColor');

    let ColorKeyCode = '';
    if (hasColorKeyCode) {
      // Save ColorKeyCode + ColorKeyCodeID from tblprdColorKeyCode
      const resolved = await resolveColorKeyCode(db, rawKey, req.body.ColorKeyCodeID);
      ColorKeyCode = resolved.ColorKeyCode;
      updatedData.ColorKeyCode = resolved.ColorKeyCode;
      updatedData.ColorKeyCodeID = resolved.ColorKeyCodeID;
    }

    // Manual color (no Category) -> Sigma Color Code is required
    if (hasColorKeyCode && !ColorKeyCode && !sigmacolorcode) {
      return res.status(400).json({ statusCode: 400, error: 'validation_error',
        message: 'Sigma Color Code is required when no Category is selected.' });
    }

    if (hasColorKeyCode && ColorKeyCode) {
      const duplicate = await collection.findOne({
        ProductID: ProductID,
        ColorKeyCode: ColorKeyCode,
        IsDataStatus: 1,
        PrdColorCodeID: { $ne: PrdColorCodeID }
      });
      if (duplicate) {
        return res.status(409).json({ statusCode: 409, error: 'duplicate',
          message: `Category "${ColorKeyCode}" is already added to this product (Sigma Color Code: ${duplicate.sigmacolorcode || '-'}).` });
      }
    }

    const result = await collection.updateOne(
      { PrdColorCodeID: PrdColorCodeID, ProductID: ProductID },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Product color not found or update failed.' });
    }

    return res.status(200).json({ message: 'Product color updated successfully.', data: updatedData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error, please try again.' });
  }
};

 exports.addPrdColor = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tblProductColor');

    const ProductID = req.body.ProductID;

    if (!ProductID) {
      return sendResponse(res, "ProductID is required.", "validation_error", []);
    }

    // Sigma Color Code is OPTIONAL now
    const sigmacolorcode = String(req.body.sigmacolorcode || "").trim();

    // Color Code (HEX) is optional, but if sent it must be valid.
    // Saved as "#RRGGBB" so the app color-match API (getprdcolormatchlist) can find it.
    const PrdColorCode = normalizeHexColor(req.body.PrdColorCode);
    if (PrdColorCode === null) {
      return sendResponse(res, "Invalid Color Code. Use HEX format such as #AABBCC or #ABC.", "validation_error", []);
    }

    // Names fall back to Sigma Color Code, then HEX, when not sent
    const EnPrdColorName = String(req.body.EnPrdColorName || "").trim() || sigmacolorcode || PrdColorCode;
    const ArPrdColorName = String(req.body.ArPrdColorName || "").trim() || sigmacolorcode || PrdColorCode;

    const rawColorKeyCode = req.body.ColorKeyCode;

    const ColorKeyCodeArray = Array.isArray(rawColorKeyCode)
      ? rawColorKeyCode
      : rawColorKeyCode
        ? [rawColorKeyCode]
        : [];

    const cleanColorKeyCodeArray = ColorKeyCodeArray
      .map((x) => String(x || '').trim())
      .filter((x) => x !== '');

    // Rules:
    //  - Category selected       -> Sigma Color Code / Color Code not needed
    //  - Manual color (no Category) -> Sigma Color Code is required
    if (cleanColorKeyCodeArray.length === 0 && !sigmacolorcode) {
      return sendResponse(
        res,
        PrdColorCode
          ? "Sigma Color Code is required for a manual Color Code."
          : "Select a Category, or enter a Sigma Color Code for a manual color.",
        "validation_error",
        []
      );
    }

    // Optional: client may send ColorKeyCodeID as a single value (only used
    // as a fallback when the category is not found in tblprdColorKeyCode)
    const clientColorKeyCodeID = Array.isArray(req.body.ColorKeyCodeID) ? "" : req.body.ColorKeyCodeID;

    const insertedItems = [];
    const skippedItems = [];

    // If ColorKeyCode has values, insert one record per key
    if (cleanColorKeyCodeArray.length > 0) {
      for (const rawKey of cleanColorKeyCodeArray) {
        // Get ColorKeyCode + ColorKeyCodeID from tblprdColorKeyCode
        const { ColorKeyCode, ColorKeyCodeID } = await resolveColorKeyCode(db, rawKey, clientColorKeyCodeID);

        const existingColor = await collection.findOne({
          ProductID: ProductID,
          ColorKeyCode: ColorKeyCode,
          IsDataStatus: 1
        });

        if (existingColor) {
          skippedItems.push({
            ProductID: ProductID,
            ColorKeyCode: ColorKeyCode,
            ColorKeyCodeID: ColorKeyCodeID,
            sigmacolorcode: existingColor.sigmacolorcode || "",
            message: `Category "${ColorKeyCode}" is already added to this product`
          });
          continue;
        }

        const Productitem = {
          // Category rows: name falls back to the category code
          EnPrdColorName: EnPrdColorName || ColorKeyCode,
          ArPrdColorName: ArPrdColorName || ColorKeyCode,
          modifiedAt: new Date(),
          createdAt: new Date(),
          PrdColorCode: PrdColorCode,
          sigmacolorcode: sigmacolorcode,
          ProductID: ProductID,
          PrdColorCodeID: generateUniqueId(),
          createdBy: "USER",
          updatedBy: "USER",
          IsDataStatus: 1,
          ColorKeyCode: ColorKeyCode,
          ColorKeyCodeID: ColorKeyCodeID
        };

        await collection.insertOne(Productitem);
        insertedItems.push(Productitem);
      }
    } else {
      // If ColorKeyCode empty, insert normal product color only
      const existingColor = await collection.findOne({
        ProductID: ProductID,
        EnPrdColorName: EnPrdColorName,
        ArPrdColorName: ArPrdColorName,
        PrdColorCode: PrdColorCode,
        IsDataStatus: 1,
        $or: [
          { ColorKeyCode: { $exists: false } },
          { ColorKeyCode: null },
          { ColorKeyCode: "" }
        ]
      });

      if (existingColor) {
        skippedItems.push({
          ProductID: ProductID,
          sigmacolorcode: existingColor.sigmacolorcode || "",
          message: "This color already exists for this product"
        });
      } else {
        const Productitem = {
          EnPrdColorName: EnPrdColorName,
          ArPrdColorName: ArPrdColorName,
          modifiedAt: new Date(),
          createdAt: new Date(),
          PrdColorCode: PrdColorCode,
          sigmacolorcode: sigmacolorcode,
          ProductID: ProductID,
          PrdColorCodeID: generateUniqueId(),
          createdBy: "USER",
          updatedBy: "USER",
          IsDataStatus: 1,
          ColorKeyCode: "",
          ColorKeyCodeID: ""
        };

        await collection.insertOne(Productitem);
        insertedItems.push(Productitem);
      }
    }

    const resultData = {
      insertedCount: insertedItems.length,
      skippedCount: skippedItems.length,
      insertedItems: insertedItems,
      skippedItems: skippedItems,
      // first saved row (used by "Save & Add Sizes")
      PrdColorCodeID: insertedItems[0] ? insertedItems[0].PrdColorCodeID : ""
    };

    // Nothing saved -> tell the client (was reported as success before)
    if (insertedItems.length === 0) {
      const skippedKeys = skippedItems.map((x) => x.ColorKeyCode).filter(Boolean);
      const message = skippedKeys.length > 0
        ? `Not added: Category ${skippedKeys.join(", ")} is already added to this product.`
        : "Not added: this color already exists for this product.";
      return res.status(409).json({ statusCode: 409, message, data: resultData, error: "duplicate" });
    }

    const message = skippedItems.length > 0
      ? `Added ${insertedItems.length} color(s). Skipped (already added): ${skippedItems.map((x) => x.ColorKeyCode).filter(Boolean).join(", ")}.`
      : "Product Color added successfully.";
    return sendResponse(res, message, null, resultData);

  } catch (error) {
    console.log(error);
    next(error);
  }
};
 exports.delPrdColor = async (req, res, next) => {
  const { PrdColorCodeID, ProductID } = req.body;  // Extract data from the request body

  const db = await connectToMongoDB();  // Connect to the MongoDB database
  try {
    // Run a delete operation to remove the color from the database
    const result = await db.collection('tblProductColor').deleteOne(
      { PrdColorCodeID: PrdColorCodeID, ProductID: ProductID }  // The filter for deleting the color
    );
  
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Product color not found or delete failed.' });
    }
  
    return res.status(200).json({ message: 'Product color deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error, please try again.' });
  }
};


 
 exports.getcolorkeycodelist = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const collection = db.collection("tblprdColorKeyCode");

    const documents = await collection
      .find({})
      .project({
        _id: 1,
        ColorKeyCodeID: 1,
        ColorKeyCode: 1,
        ColorKeyCodeEnName: 1,
        ColorKeyCodeArName: 1,
      })
      .toArray();

    return sendResponse(
      res,
      "Color key code list fetched successfully.",
      null,
      documents
    );
  } catch (error) {
    console.log(error);
    return sendResponse(
      res,
      "Failed to fetch color key code list.",
      true,
      []
    );
  }
};
 
   
 
exports.getcolorkeycodelistbyid = async (req, res, next) => {
  try {
    const ColorKeyCode = String(req.body?.ColorKeyCode ?? "").trim();

    // ✅ Default PageSize = 50
    const PageNo = Math.max(parseInt(req.body?.PageNo ?? 1, 10), 1);
    const PageSize = Math.min(Math.max(parseInt(req.body?.PageSize ?? 50, 10), 1), 100);
    const skip = (PageNo - 1) * PageSize;

    if (!ColorKeyCode) {
      return sendResponse(res, "ColorKeyCode is required.", true, []);
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblPrdSpecialColor");

    const matchQuery = {
      $expr: {
        $eq: [
          { $toUpper: { $trim: { input: "$ColorKeyCode" } } },
          ColorKeyCode.toUpperCase()
        ]
      }
    };

    const totalRecords = await collection.countDocuments(matchQuery);

    const documents = await collection
      .find(matchQuery)
      .project({
        SplColorCodeIDPrKey: 1,
        HexValue: 1,
        EnColorName: 1,
        ArColorName: 1,
      })
      .sort({ EnColorName: 1 })
      .skip(skip)
      .limit(PageSize)
      .toArray();

    return sendResponse(
      res,
      "Special color list fetched successfully.",
      null,
      {
        PageNo,
        PageSize,
        TotalRecords: totalRecords,
        TotalPages: Math.ceil(totalRecords / PageSize),
        Data: documents,
      },
      documents.length
    );

  } catch (error) {
    console.log(error);
    return sendResponse(
      res,
      "Failed to fetch special color list.",
      true,
      []
    );
  }
};

 exports.getspecialcolorcode = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const collection = db.collection('tblprdColorKeyCode');

    const documents = await collection.find({}).toArray();

    sendResponse(res, "Color key code successfully.", null, documents);
  } catch (error) {
    console.log(error);
    sendResponse(res, "No Color key code found.", error, []);
  }
};
// =========================================================
// getnearhexcolor
// POST /api/prdcolor/getnearhexcolor
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

 
