// controllers/lookupdata/city/city.controller.js
// City lookup (tblcity). Every city now belongs to a country (tblcity.CountryID -> tblcountry.CountryID).

const { connectToMongoDB } = require("../../../database/mongodb");
const { generateUniqueId } = require("../../../controllers/operation/operation");

// Helper function to send responses
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
const toStatus = (v) => {
  if (v === undefined || v === null || v === "") return "1";
  return String(v) === "0" || v === false ? "0" : "1";
};
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CITY_PROJECTION = {
  _id: 0,
  CityID: 1,
  EnCityName: 1,
  ArCityName: 1,
  CountryID: 1,
  EnCountryName: 1,
  ArCountryName: 1,
  IsDataStatus: 1,
  CreatedAt: 1,
  CreatedBy: 1,
  ModifyAt: 1,
  ModifyBy: 1,
};

// joins the country name onto each city
const countryLookupStages = [
  {
    $lookup: {
      from: "tblcountry",
      localField: "CountryID",
      foreignField: "CountryID",
      as: "country",
    },
  },
  {
    $addFields: {
      EnCountryName: { $ifNull: [{ $arrayElemAt: ["$country.EnCountryName", 0] }, ""] },
      ArCountryName: { $ifNull: [{ $arrayElemAt: ["$country.ArCountryName", 0] }, ""] },
    },
  },
];

// --------------------------------------------------------------------
// POST /api/lookupdata/city/getcitylist
// body: { page, limit, CountryID?, search? }
// --------------------------------------------------------------------
exports.getcitylist = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.body?.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.body?.limit, 10) || 5);
    const CountryID = clean(req.body?.CountryID);
    const search = clean(req.body?.search);

    const db = await connectToMongoDB();
    const collection = db.collection("tblcity");

    const match = {};
    if (CountryID === "NONE") {
      // cities that are not linked to any country yet
      match.$or = [{ CountryID: { $exists: false } }, { CountryID: "" }, { CountryID: null }];
    } else if (CountryID) {
      match.CountryID = CountryID;
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      const searchOr = [{ EnCityName: rx }, { ArCityName: rx }];
      if (match.$or) {
        match.$and = [{ $or: match.$or }, { $or: searchOr }];
        delete match.$or;
      } else {
        match.$or = searchOr;
      }
    }

    const skip = (page - 1) * limit;

    const City = await collection
      .aggregate([
        { $match: match },
        ...countryLookupStages,
        { $project: CITY_PROJECTION },
        { $sort: { EnCountryName: 1, EnCityName: 1 } },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    const totalCount = await collection.countDocuments(match);

    sendResponse(res, "City found.", null, City, totalCount);
  } catch (error) {
    console.error("Error in getAllCityList:", error);
    next(error);
  }
};

exports.getCity = async (req, res, next) => {
  try {
    const CityID = clean(req.body?.CityID);
    if (!CityID) {
      return sendResponse(res, "CityID is required", { type: "validation_error" }, null, 0);
    }

    const db = await connectToMongoDB();
    const rows = await db
      .collection("tblcity")
      .aggregate([{ $match: { CityID } }, ...countryLookupStages, { $project: CITY_PROJECTION }])
      .toArray();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    sendResponse(res, "City found.", null, rows[0], 1);
  } catch (error) {
    console.error("Error in getCity:", error);
    next(error);
  }
};

async function assertCountry(db, CountryID) {
  if (!CountryID) return null;
  return db.collection("tblcountry").findOne({ CountryID });
}

exports.createCity = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const EnCityName = clean(req.body?.EnCityName);
    const ArCityName = clean(req.body?.ArCityName);
    const CountryID = clean(req.body?.CountryID);

    if (!EnCityName || !ArCityName || !CountryID) {
      return sendResponse(
        res,
        "Country, English city name and Arabic city name are required.",
        { type: "validation_error" },
        null,
        0
      );
    }

    const country = await assertCountry(db, CountryID);
    if (!country) {
      return sendResponse(res, "Selected country was not found.", { type: "validation_error" }, null, 0);
    }

    const duplicate = await db.collection("tblcity").findOne({
      CountryID,
      EnCityName: new RegExp(`^${escapeRegex(EnCityName)}$`, "i"),
    });
    if (duplicate) {
      return sendResponse(res, "This city already exists in the selected country.", { type: "duplicate" }, null, 0);
    }

    const CityItem = {
      CityID: generateUniqueId(),
      EnCityName,
      ArCityName,
      CountryID,
      IsDataStatus: toStatus(req.body?.IsDataStatus),
      CreatedAt: new Date(),
      CreatedBy: req.body.CreatedBy || null,
      ModifyAt: new Date(),
      ModifyBy: req.body.ModifyBy || null,
    };

    const result = await db.collection("tblcity").insertOne(CityItem);
    sendResponse(res, "City inserted successfully.", null, result, null);
  } catch (error) {
    console.error("Error in createCity:", error);
    next(error);
  }
};

exports.updateCity = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblcity");

    const CityID = clean(req.body?.CityID);
    if (!CityID) {
      return res.status(400).json({ success: false, message: "CityID is required" });
    }

    const EnCityName = clean(req.body?.EnCityName);
    const ArCityName = clean(req.body?.ArCityName);
    const CountryID = clean(req.body?.CountryID);

    if (!EnCityName || !ArCityName) {
      return res.status(400).json({ success: false, message: "City names are required" });
    }

    const updateFields = {
      EnCityName,
      ArCityName,
      ModifyAt: new Date(),
      ModifyBy: req.body.ModifyBy || null,
    };

    if (req.body?.IsDataStatus !== undefined) {
      updateFields.IsDataStatus = toStatus(req.body.IsDataStatus);
    }

    let country = null;
    if (CountryID) {
      country = await assertCountry(db, CountryID);
      if (!country) {
        return res.status(400).json({ success: false, message: "Selected country was not found" });
      }
      updateFields.CountryID = CountryID;
    }

    const updateResult = await collection.updateOne({ CityID }, { $set: updateFields });

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No City found to update" });
    }

    // keep denormalised names on users / push tokens in sync
    const syncSet = { RegCityName: EnCityName, RegArCityName: ArCityName };
    if (country) {
      syncSet.RegCountryID = country.CountryID;
      syncSet.RegCountryName = country.EnCountryName;
      syncSet.RegArCountryName = country.ArCountryName;
    }
    await Promise.all([
      db.collection("tblreginfo").updateMany({ RegCityID: CityID }, { $set: syncSet }),
      db.collection("tblpushtoken").updateMany({ RegCityID: CityID }, { $set: syncSet }),
    ]);

    return res.status(200).json({ success: true, message: "City updated successfully" });
  } catch (error) {
    console.error("Update City Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.delCity = async (req, res, next) => {
  const CityID = clean(req.body?.CityID);
  if (!CityID) {
    return sendResponse(res, "CityID is required", { type: "validation_error" }, null, 400);
  }

  try {
    const db = await connectToMongoDB();

    const [orderDetailExists, storeCount, userCount] = await Promise.all([
      db.collection("tblorderdetails").findOne({ CityID }),
      db.collection("tblstoreinfo").countDocuments({ CityID }),
      db.collection("tblreginfo").countDocuments({ RegCityID: CityID }),
    ]);

    if (orderDetailExists) {
      return sendResponse(res, "City cannot be deleted. It exists in order details.", { type: "in_use" }, null, 400);
    }
    if (storeCount > 0) {
      return sendResponse(
        res,
        `City cannot be deleted. ${storeCount} store(s) are linked to it.`,
        { type: "in_use" },
        null,
        400
      );
    }
    if (userCount > 0) {
      return sendResponse(
        res,
        `City cannot be deleted. ${userCount} registered user(s) use it. Set it inactive instead.`,
        { type: "in_use" },
        null,
        400
      );
    }

    await db.collection("tblcity").deleteOne({ CityID });

    return sendResponse(res, "City deleted successfully", null, null, 200);
  } catch (error) {
    console.error("Error in delCityByID:", error);
    return res.status(500).json({ statusCode: 500, message: "Internal Server Error", error: error.message });
  }
};
