// controllers/lookupdata/country/country.controller.js
// Country lookup (tblcountry) - add / modify / delete / list.
// Each city in tblcity belongs to one country through tblcity.CountryID.

const { connectToMongoDB } = require("../../../database/mongodb");
const { generateUniqueId } = require("../../../controllers/operation/operation");

function sendResponse(res, message, error, results, totalCount) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message: message,
    data: results,
    error: error,
    totalCount: totalCount,
  });
}

const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());

// "1" = active, "0" = inactive (stored as string, same as other lookups)
const toStatus = (v) => {
  if (v === undefined || v === null || v === "") return "1";
  return String(v) === "0" || v === false ? "0" : "1";
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PROJECTION = {
  _id: 0,
  CountryID: 1,
  EnCountryName: 1,
  ArCountryName: 1,
  CountryCode: 1,
  PhoneCode: 1,
  SortOrder: 1,
  IsDataStatus: 1,
  CreatedAt: 1,
  CreatedBy: 1,
  ModifyAt: 1,
  ModifyBy: 1,
};

// --------------------------------------------------------------------
// POST /api/lookupdata/country/getcountrylist   (CMS, paged)
// body: { page, limit, search }
// --------------------------------------------------------------------
exports.getcountrylist = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.body?.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.body?.limit, 10) || 10);
    const search = clean(req.body?.search);
    const skip = (page - 1) * limit;

    const db = await connectToMongoDB();
    const collection = db.collection("tblcountry");

    const match = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      match.$or = [{ EnCountryName: rx }, { ArCountryName: rx }, { CountryCode: rx }];
    }

    const rows = await collection
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "tblcity",
            localField: "CountryID",
            foreignField: "CountryID",
            as: "cities",
          },
        },
        { $addFields: { CityCount: { $size: "$cities" } } },
        { $project: { ...PROJECTION, CityCount: 1 } },
        { $sort: { SortOrder: 1, EnCountryName: 1 } },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    const totalCount = await collection.countDocuments(match);
    sendResponse(res, "Country found.", null, rows, totalCount);
  } catch (error) {
    console.error("Error in getcountrylist:", error);
    next(error);
  }
};

// --------------------------------------------------------------------
// POST /api/lookupdata/country/getallcountry  (CMS dropdowns, no paging)
// --------------------------------------------------------------------
exports.getallcountry = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const rows = await db
      .collection("tblcountry")
      .find({}, { projection: PROJECTION })
      .sort({ SortOrder: 1, EnCountryName: 1 })
      .toArray();
    sendResponse(res, "Country found.", null, rows, rows.length);
  } catch (error) {
    console.error("Error in getallcountry:", error);
    next(error);
  }
};

// --------------------------------------------------------------------
// POST /api/lookupdata/country/getCountry   body: { CountryID }
// --------------------------------------------------------------------
exports.getCountry = async (req, res, next) => {
  try {
    const CountryID = clean(req.body?.CountryID);
    if (!CountryID) {
      return sendResponse(res, "CountryID is required", { type: "validation_error" }, null, 0);
    }

    const db = await connectToMongoDB();
    const country = await db
      .collection("tblcountry")
      .findOne({ CountryID }, { projection: PROJECTION });

    if (!country) {
      return res.status(404).json({ statusCode: 404, success: false, message: "Country not found" });
    }

    sendResponse(res, "Country found.", null, country, 1);
  } catch (error) {
    console.error("Error in getCountry:", error);
    next(error);
  }
};

// --------------------------------------------------------------------
// POST /api/lookupdata/country/createCountry
// body: { EnCountryName, ArCountryName, CountryCode, PhoneCode, SortOrder, IsDataStatus, CreatedBy }
// --------------------------------------------------------------------
exports.createCountry = async (req, res, next) => {
  try {
    const EnCountryName = clean(req.body?.EnCountryName);
    const ArCountryName = clean(req.body?.ArCountryName);
    const CountryCode = clean(req.body?.CountryCode).toUpperCase();

    if (!EnCountryName || !ArCountryName) {
      return sendResponse(
        res,
        "English and Arabic country names are required.",
        { type: "validation_error" },
        null,
        0
      );
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblcountry");

    const duplicate = await collection.findOne({
      EnCountryName: new RegExp(`^${escapeRegex(EnCountryName)}$`, "i"),
    });
    if (duplicate) {
      return sendResponse(res, "This country already exists.", { type: "duplicate" }, null, 0);
    }

    const doc = {
      CountryID: generateUniqueId(),
      EnCountryName,
      ArCountryName,
      CountryCode,
      PhoneCode: clean(req.body?.PhoneCode),
      SortOrder: parseInt(req.body?.SortOrder, 10) || 0,
      IsDataStatus: toStatus(req.body?.IsDataStatus),
      CreatedAt: new Date(),
      CreatedBy: clean(req.body?.CreatedBy) || null,
      ModifyAt: new Date(),
      ModifyBy: clean(req.body?.ModifyBy || req.body?.CreatedBy) || null,
    };

    const result = await collection.insertOne(doc);
    sendResponse(res, "Country inserted successfully.", null, { ...doc, insertedId: result.insertedId }, 1);
  } catch (error) {
    console.error("Error in createCountry:", error);
    next(error);
  }
};

// --------------------------------------------------------------------
// POST /api/lookupdata/country/updateCountry   body: { CountryID, ...fields }
// Country names are copied onto registered users / push tokens, so a rename
// is pushed to those records as well.
// --------------------------------------------------------------------
exports.updateCountry = async (req, res, next) => {
  try {
    const CountryID = clean(req.body?.CountryID);
    if (!CountryID) {
      return sendResponse(res, "CountryID is required", { type: "validation_error" }, null, 0);
    }

    const EnCountryName = clean(req.body?.EnCountryName);
    const ArCountryName = clean(req.body?.ArCountryName);
    if (!EnCountryName || !ArCountryName) {
      return sendResponse(
        res,
        "English and Arabic country names are required.",
        { type: "validation_error" },
        null,
        0
      );
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblcountry");

    const duplicate = await collection.findOne({
      CountryID: { $ne: CountryID },
      EnCountryName: new RegExp(`^${escapeRegex(EnCountryName)}$`, "i"),
    });
    if (duplicate) {
      return sendResponse(res, "Another country already has this name.", { type: "duplicate" }, null, 0);
    }

    const updateFields = {
      EnCountryName,
      ArCountryName,
      CountryCode: clean(req.body?.CountryCode).toUpperCase(),
      PhoneCode: clean(req.body?.PhoneCode),
      SortOrder: parseInt(req.body?.SortOrder, 10) || 0,
      IsDataStatus: toStatus(req.body?.IsDataStatus),
      ModifyAt: new Date(),
      ModifyBy: clean(req.body?.ModifyBy) || null,
    };

    const result = await collection.updateOne({ CountryID }, { $set: updateFields });
    if (result.matchedCount === 0) {
      return res.status(404).json({ statusCode: 404, success: false, message: "No country found to update" });
    }

    // keep denormalised names in sync
    await Promise.all([
      db.collection("tblreginfo").updateMany(
        { RegCountryID: CountryID },
        { $set: { RegCountryName: EnCountryName, RegArCountryName: ArCountryName } }
      ),
      db.collection("tblpushtoken").updateMany(
        { RegCountryID: CountryID },
        { $set: { RegCountryName: EnCountryName, RegArCountryName: ArCountryName } }
      ),
    ]);

    return res.status(200).json({ statusCode: 200, success: true, message: "Country updated successfully" });
  } catch (error) {
    console.error("Error in updateCountry:", error);
    return res.status(500).json({ statusCode: 500, success: false, message: "Internal server error" });
  }
};

// --------------------------------------------------------------------
// POST /api/lookupdata/country/delCountry   body: { CountryID }
// Blocked while cities or registered users still use the country.
// --------------------------------------------------------------------
exports.delCountry = async (req, res, next) => {
  const CountryID = clean(req.body?.CountryID);
  if (!CountryID) {
    return sendResponse(res, "CountryID is required", { type: "validation_error" }, null, 0);
  }

  try {
    const db = await connectToMongoDB();

    const cityCount = await db.collection("tblcity").countDocuments({ CountryID });
    if (cityCount > 0) {
      return sendResponse(
        res,
        `Country cannot be deleted. ${cityCount} city record(s) belong to it. Delete or move those cities first.`,
        { type: "in_use", cityCount },
        null,
        0
      );
    }

    const userCount = await db.collection("tblreginfo").countDocuments({ RegCountryID: CountryID });
    if (userCount > 0) {
      return sendResponse(
        res,
        `Country cannot be deleted. ${userCount} registered user(s) use it. Set it inactive instead.`,
        { type: "in_use", userCount },
        null,
        0
      );
    }

    const result = await db.collection("tblcountry").deleteOne({ CountryID });
    if (result.deletedCount === 0) {
      return res.status(404).json({ statusCode: 404, success: false, message: "Country not found" });
    }

    return sendResponse(res, "Country deleted successfully", null, { deletedCount: 1 }, 1);
  } catch (error) {
    console.error("Error in delCountry:", error);
    return res.status(500).json({ statusCode: 500, success: false, message: "Internal Server Error" });
  }
};
