// controllers/reguser/reguser.controller.js
// CMS > Registered Customers : everyone who registered in the mobile app (tblreginfo).
// Never returns password / OTP fields.

const { connectToMongoDB } = require("../../database/mongodb");

function sendResponse(res, message, error, results, totalCount) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message,
    data: results,
    error,
    totalCount,
  });
}

const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// only safe fields
const USER_PROJECTION = {
  _id: 0,
  RegUserID: 1,
  RegFullName: 1,
  RegEmailAddress: 1,
  RegMobileNo: 1,
  RegStatus: 1,
  OTPStatus: 1,
  RegCountryID: 1,
  RegCountryName: 1,
  RegArCountryName: 1,
  RegCityID: 1,
  RegCityName: 1,
  RegArCityName: 1,
  createdAt: 1,
  modifiedAt: 1,
};

function buildFilter(src = {}) {
  const and = [];

  const status = clean(src.Status).toUpperCase(); // ALL | ACTIVE | NOTACTIVE
  if (status === "ACTIVE") and.push({ RegStatus: "ACTIVE" });
  else if (status === "NOTACTIVE") and.push({ RegStatus: { $ne: "ACTIVE" } });

  const CountryID = clean(src.CountryID);
  if (CountryID === "NONE") {
    and.push({ $or: [{ RegCountryID: { $exists: false } }, { RegCountryID: "" }, { RegCountryID: null }] });
  } else if (CountryID) {
    and.push({ RegCountryID: CountryID });
  }

  const CityID = clean(src.CityID);
  if (CityID) and.push({ RegCityID: CityID });

  const search = clean(src.search || src.searchTerm);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    and.push({
      $or: [
        { RegFullName: rx },
        { RegEmailAddress: rx },
        { RegMobileNo: rx },
        { RegCountryName: rx },
        { RegCityName: rx },
      ],
    });
  }

  const from = src.DateFrom ? new Date(src.DateFrom) : null;
  const to = src.DateTo ? new Date(src.DateTo) : null;
  if (from && !isNaN(from)) and.push({ createdAt: { $gte: from } });
  if (to && !isNaN(to)) {
    to.setHours(23, 59, 59, 999);
    and.push({ createdAt: { $lte: to } });
  }

  return and.length ? { $and: and } : {};
}

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { RegFullName: 1 },
};

// --------------------------------------------------------------------
// POST /api/reguser/list
// body: { page, limit, search, CountryID, CityID, Status, DateFrom, DateTo, Sort }
// limit up to 5000 (used by CSV export)
// --------------------------------------------------------------------
exports.list = async (req, res, next) => {
  try {
    const src = req.body || {};
    const page = Math.max(1, parseInt(src.page, 10) || 1);
    const limit = Math.min(5000, Math.max(1, parseInt(src.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const sort = SORTS[clean(src.Sort).toLowerCase()] || SORTS.newest;

    const db = await connectToMongoDB();
    const collection = db.collection("tblreginfo");
    const filter = buildFilter(src);

    const rows = await collection
      .aggregate([
        { $match: filter },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        { $project: USER_PROJECTION },
        {
          $lookup: {
            from: "tblpushtoken",
            localField: "RegUserID",
            foreignField: "RegUserID",
            as: "devices",
          },
        },
        {
          $lookup: {
            from: "tblorder",
            localField: "RegUserID",
            foreignField: "RegUserID",
            as: "orders",
          },
        },
        {
          $addFields: {
            DeviceCount: {
              $size: {
                $filter: { input: "$devices", as: "d", cond: { $ne: ["$$d.IsActive", "NO"] } },
              },
            },
            OrderCount: { $size: "$orders" },
          },
        },
        { $project: { devices: 0, orders: 0 } },
      ])
      .toArray();

    const [totalCount, all, active, withCountry, withDevice] = await Promise.all([
      collection.countDocuments(filter),
      collection.countDocuments({}),
      collection.countDocuments({ RegStatus: "ACTIVE" }),
      collection.countDocuments({ RegCountryID: { $nin: [null, ""], $exists: true } }),
      db.collection("tblpushtoken").distinct("RegUserID", { IsRegistered: "YES", IsActive: { $ne: "NO" } }),
    ]);

    return sendResponse(
      res,
      "Registered users found.",
      null,
      {
        rows,
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        counts: {
          all,
          active,
          notActive: all - active,
          withCountry,
          withDevice: withDevice.filter(Boolean).length,
        },
      },
      totalCount
    );
  } catch (error) {
    console.error("Error in reguser list:", error);
    next(error);
  }
};

// --------------------------------------------------------------------
// POST /api/reguser/detail   body: { RegUserID }
// user + devices + last orders
// --------------------------------------------------------------------
exports.detail = async (req, res, next) => {
  try {
    const RegUserID = clean(req.body?.RegUserID);
    if (!RegUserID) {
      return sendResponse(res, "RegUserID is required.", { type: "validation_error" }, null, 0);
    }

    const db = await connectToMongoDB();
    const user = await db.collection("tblreginfo").findOne({ RegUserID }, { projection: USER_PROJECTION });
    if (!user) {
      return res.status(404).json({ statusCode: 404, message: "User not found", data: null });
    }

    const [devices, orders, orderCount] = await Promise.all([
      db
        .collection("tblpushtoken")
        .find(
          { RegUserID },
          {
            projection: {
              _id: 0,
              TID: 1,
              TokenID: 1,
              DevicePlatform: 1,
              DeviceIP: 1,
              TokenOwnerID: 1,
              IsActive: 1,
              LinkedAt: 1,
              ModifyDate: 1,
            },
          }
        )
        .sort({ ModifyDate: -1 })
        .toArray(),
      db
        .collection("tblorder")
        .find({ RegUserID }, { projection: { _id: 0, UserOrderNo: 1, OrderRefNo: 1, orderstatus: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
      db.collection("tblorder").countDocuments({ RegUserID }),
    ]);

    return sendResponse(res, "User found.", null, { user, devices, orders, orderCount }, 1);
  } catch (error) {
    console.error("Error in reguser detail:", error);
    next(error);
  }
};
