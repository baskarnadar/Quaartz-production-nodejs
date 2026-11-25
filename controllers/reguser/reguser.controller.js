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
  RegPlatform: 1,
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

  // ANDROID | IOS | WEB | NONE (old users, platform unknown)
  const Platform = clean(src.Platform).toUpperCase();
  if (Platform === "NONE") {
    and.push({ $or: [{ RegPlatform: { $exists: false } }, { RegPlatform: "" }, { RegPlatform: null }] });
  } else if (Platform) {
    and.push({ RegPlatform: Platform });
  }

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
        {
          // platforms of the user's app devices (ANDROID / IOS / WEB)
          $addFields: {
            DevicePlatforms: {
              $setDifference: [
                {
                  $map: {
                    input: "$devices",
                    as: "d",
                    in: { $toUpper: { $ifNull: ["$$d.DevicePlatform", ""] } },
                  },
                },
                [""],
              ],
            },
          },
        },
        { $project: { devices: 0, orders: 0 } },
      ])
      .toArray();

    const [totalCount, all, active, withCountry, withDevice, byPlatformRaw] = await Promise.all([
      collection.countDocuments(filter),
      collection.countDocuments({}),
      collection.countDocuments({ RegStatus: "ACTIVE" }),
      collection.countDocuments({ RegCountryID: { $nin: [null, ""], $exists: true } }),
      db.collection("tblpushtoken").distinct("RegUserID", { IsRegistered: "YES", IsActive: { $ne: "NO" } }),
      collection
        .aggregate([{ $group: { _id: { $ifNull: ["$RegPlatform", ""] }, n: { $sum: 1 } } }])
        .toArray(),
    ]);

    const byPlatform = { ANDROID: 0, IOS: 0, WEB: 0, OTHER: 0, UNKNOWN: 0 };
    byPlatformRaw.forEach((r) => {
      const k = r._id || "UNKNOWN";
      byPlatform[k in byPlatform ? k : "OTHER"] += r.n;
    });

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
          byPlatform,
          deleted: await db.collection("_delete_tblreginfo").countDocuments({}),
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


// =====================================================================
// DELETE / RESTORE  (soft delete into _delete_tblreginfo)
// =====================================================================
const DELETED = "_delete_tblreginfo";

// push-token fields that link a device to a registered user
const TOKEN_LINK_FIELDS = [
  "RegUserID", "RegFullName", "RegEmailAddress", "RegMobileNo",
  "RegCountryID", "RegCountryName", "RegArCountryName",
  "RegCityID", "RegCityName", "RegArCityName", "RegisteredAt", "LinkedAt",
];

// --------------------------------------------------------------------
// POST /api/reguser/delete   body: { RegUserID }
// Blocked when the user has orders. The full tblreginfo document (plus the
// user's tblprtuser rows and linked push tokens) is moved to _delete_tblreginfo.
// --------------------------------------------------------------------
exports.remove = async (req, res, next) => {
  try {
    const RegUserID = clean(req.body?.RegUserID);
    if (!RegUserID) {
      return sendResponse(res, "RegUserID is required.", { type: "validation_error" }, null, 0);
    }

    const db = await connectToMongoDB();
    const user = await db.collection("tblreginfo").findOne({ RegUserID });
    if (!user) {
      return res.status(404).json({ statusCode: 404, message: "User not found", data: null });
    }

    const orderCount = await db.collection("tblorder").countDocuments({ RegUserID });
    if (orderCount > 0) {
      return sendResponse(
        res,
        `This customer has ${orderCount} order(s) and cannot be deleted.`,
        { type: "has_orders", orderCount },
        { orderCount },
        0
      );
    }

    const [prtUsers, tokens] = await Promise.all([
      db.collection("tblprtuser").find({ UserID: RegUserID }).toArray(),
      db.collection("tblpushtoken").find({ RegUserID }, { projection: { TokenID: 1 } }).toArray(),
    ]);

    const deletedBy = clean(req.user?.prtuserid || req.user?.sub) || "ADMIN";

    // 1. copy everything to the deleted collection (same _id, all fields)
    await db.collection(DELETED).insertOne({
      ...user,
      _DeletedAt: new Date(),
      _DeletedBy: deletedBy,
      _tblprtuser: prtUsers,
      _LinkedTokenIDs: tokens.map((t) => t.TokenID).filter(Boolean),
    });

    // 2. remove from the live collections
    await Promise.all([
      db.collection("tblreginfo").deleteOne({ RegUserID }),
      db.collection("tblprtuser").deleteMany({ UserID: RegUserID }),
      // device stays, but becomes non-registered
      db.collection("tblpushtoken").updateMany(
        { RegUserID },
        {
          $set: { IsRegistered: "NO", OwnerType: "Anonymous", ModifyDate: new Date() },
          $unset: Object.fromEntries(TOKEN_LINK_FIELDS.map((k) => [k, ""])),
        }
      ),
    ]);

    return sendResponse(res, "Customer deleted. You can restore it from Deleted Users.", null, { RegUserID }, 1);
  } catch (error) {
    console.error("Error in reguser delete:", error);
    next(error);
  }
};

// --------------------------------------------------------------------
// POST /api/reguser/deletedList   body: { search? }
// --------------------------------------------------------------------
exports.deletedList = async (req, res, next) => {
  try {
    const search = clean(req.body?.search);
    const filter = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ RegFullName: rx }, { RegEmailAddress: rx }, { RegMobileNo: rx }, { RegCityName: rx }];
    }

    const db = await connectToMongoDB();
    const rows = await db
      .collection(DELETED)
      .find(filter, {
        projection: {
          _id: 0,
          RegUserID: 1,
          RegFullName: 1,
          RegEmailAddress: 1,
          RegMobileNo: 1,
          RegCountryName: 1,
          RegCityName: 1,
          RegPlatform: 1,
          RegStatus: 1,
          createdAt: 1,
          _DeletedAt: 1,
          _DeletedBy: 1,
        },
      })
      .sort({ _DeletedAt: -1 })
      .limit(1000)
      .toArray();

    const total = await db.collection(DELETED).countDocuments({});
    return sendResponse(res, "Deleted users found.", null, { rows, total }, rows.length);
  } catch (error) {
    console.error("Error in reguser deletedList:", error);
    next(error);
  }
};

// --------------------------------------------------------------------
// POST /api/reguser/restore   body: { RegUserID }
// Puts the user back exactly as it was. Blocked if the email or mobile
// number has been used by another account in the meantime.
// --------------------------------------------------------------------
exports.restore = async (req, res, next) => {
  try {
    const RegUserID = clean(req.body?.RegUserID);
    if (!RegUserID) {
      return sendResponse(res, "RegUserID is required.", { type: "validation_error" }, null, 0);
    }

    const db = await connectToMongoDB();
    const doc = await db.collection(DELETED).findOne({ RegUserID });
    if (!doc) {
      return res.status(404).json({ statusCode: 404, message: "Deleted user not found", data: null });
    }

    const live = db.collection("tblreginfo");
    if (await live.findOne({ RegUserID })) {
      return sendResponse(res, "This customer already exists.", { type: "exists" }, null, 0);
    }
    const or = [];
    if (doc.RegEmailAddress) or.push({ RegEmailAddress: doc.RegEmailAddress });
    if (doc.RegMobileNo) or.push({ RegMobileNo: doc.RegMobileNo });
    const clash = or.length ? await live.findOne({ $or: or }) : null;
    if (clash) {
      const what = clash.RegEmailAddress === doc.RegEmailAddress ? "email address" : "mobile number";
      return sendResponse(
        res,
        `Cannot restore: the ${what} is now used by another customer (${clash.RegFullName || clash.RegUserID}).`,
        { type: "conflict" },
        null,
        0
      );
    }

    const { _DeletedAt, _DeletedBy, _tblprtuser, _LinkedTokenIDs, ...original } = doc;

    // 1. back into the live collections
    await live.insertOne(original);
    if (Array.isArray(_tblprtuser) && _tblprtuser.length) {
      for (const p of _tblprtuser) {
        await db.collection("tblprtuser").updateOne({ _id: p._id }, { $setOnInsert: p }, { upsert: true });
      }
    }

    // 2. re-link devices that were not taken by another user meanwhile
    if (Array.isArray(_LinkedTokenIDs) && _LinkedTokenIDs.length) {
      await db.collection("tblpushtoken").updateMany(
        { TokenID: { $in: _LinkedTokenIDs }, IsRegistered: { $ne: "YES" } },
        {
          $set: {
            IsRegistered: "YES",
            OwnerType: "Registered",
            RegUserID: original.RegUserID,
            RegFullName: original.RegFullName || "",
            RegEmailAddress: original.RegEmailAddress || "",
            RegMobileNo: original.RegMobileNo || "",
            RegCountryID: original.RegCountryID || "",
            RegCountryName: original.RegCountryName || "",
            RegArCountryName: original.RegArCountryName || "",
            RegCityID: original.RegCityID || "",
            RegCityName: original.RegCityName || "",
            RegArCityName: original.RegArCityName || "",
            RegisteredAt: original.createdAt || null,
            ModifyDate: new Date(),
          },
        }
      );
    }

    // 3. remove from the deleted collection
    await db.collection(DELETED).deleteOne({ RegUserID });

    return sendResponse(res, "Customer restored.", null, { RegUserID }, 1);
  } catch (error) {
    console.error("Error in reguser restore:", error);
    next(error);
  }
};
