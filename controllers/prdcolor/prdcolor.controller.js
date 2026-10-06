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
    const ProductID = req.body.ProductID;

    if (!ProductID || String(ProductID).trim() === "") {
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

    const productColors = await productColorCollection
      .find({ ProductID })
      .toArray();

    const finalColors = [];

    for (const color of productColors) {
      const ColorKeyCode = String(color.ColorKeyCode || "").trim();

      if (ColorKeyCode !== "") {
        const specialColors = await specialColorCollection
          .find({ ColorKeyCode })
          .toArray();

        if (specialColors.length > 0) {
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
              ColorKeyCode: spColor.ColorKeyCode || ColorKeyCode,

              // Sigma Color Code
              sigmacolorcode: spColor.SplColorCodeID || "",
            });
          });
        } else {
          finalColors.push({
            ...color,
            HexValue: color.HexValue || "",
            SplColorCodeID: color.SplColorCodeID || "",
            ColorKeyCode: color.ColorKeyCode || "",
            sigmacolorcode: color.sigmacolorcode || "",
          });
        }
      } else {
        finalColors.push({
          ...color,
          HexValue: color.HexValue || "",
          SplColorCodeID: color.SplColorCodeID || "",
          ColorKeyCode: color.ColorKeyCode || "",
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

    // Since Sigma Color Code is optional, at least ONE of these must be given
    if (!sigmacolorcode && !PrdColorCode && cleanColorKeyCodeArray.length === 0) {
      return sendResponse(res, "Enter a Sigma Color Code, a Color Code, or select a Category.", "validation_error", []);
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