// controllers/pushmsg/pushmsg.controller.js
const { connectToMongoDB } = require("../../database/mongodb");
const crypto = require("crypto");

// ✅ Use centralized initialized Firebase instance
const firebase = require("../../config/firebase");

const { v4: uuidv4 } = require("uuid");

function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message: message,
    data: results,
    error: error,
  });
}

// --------------------------------------
// 📌 Controller Function (exported as sendmsg to match route)
// --------------------------------------
 exports.sendmsg = async (req, res, next) => {
  console.log("📩 Incoming Request Body:", req.body);

  let tokens = req.body?.token;
  const title = req.body?.title;
  const body = req.body?.body;
  const data = req.body?.data || {};

  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    if (!tokens) {
      return sendResponse(
        res,
        "token is required.",
        {
          type: "validation_error",
          receivedBody: req.body,
        },
        null
      );
    }

    if (!title || !body) {
      return sendResponse(
        res,
        "title and body are required.",
        {
          type: "validation_error",
          receivedBody: req.body,
        },
        null
      );
    }

    // =====================================================
    // CONVERT SINGLE TOKEN TO ARRAY
    // =====================================================
    if (!Array.isArray(tokens)) {
      tokens = [tokens];
    }

    // Remove empty tokens
    tokens = tokens
      .map((token) => String(token || "").trim())
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      return sendResponse(
        res,
        "No valid FCM tokens found.",
        {
          type: "validation_error",
        },
        null
      );
    }

    // =====================================================
    // CONVERT DATA VALUES TO STRING
    // Firebase requires string values
    // =====================================================
    const firebaseData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        String(key),
        String(value),
      ])
    );

    // =====================================================
    // SEND PUSH NOTIFICATION
    // =====================================================
    const sendPromises = tokens.map(async (tokenVal) => {
      const message = {
        token: tokenVal,

        notification: {
          title: String(title),
          body: String(body),
        },

        data: firebaseData,

        // =================================================
        // ANDROID
        // =================================================
        android: {
          priority: "high",

          notification: {
            sound: "default",
            channelId: "high_importance_channel",
          },
        },

        // =================================================
        // IOS
        // =================================================
        apns: {
          headers: {
            "apns-priority": "10",
          },

          payload: {
            aps: {
              sound: "default",
              contentAvailable: true,
            },
          },
        },
      };

      console.log(
        "🚀 Sending FCM message:",
        JSON.stringify(message, null, 2)
      );

      try {
        // =================================================
        // IMPORTANT FIX
        // firebase.messaging is already getMessaging()
        // =================================================
        const response = await firebase.messaging.send(message);

        console.log(
          "✅ FCM message sent successfully:",
          response
        );

        return {
          token: tokenVal,
          success: true,
          response: response,
        };
      } catch (err) {
        console.error(
          "❌ FCM send failed:",
          err
        );

        return {
          token: tokenVal,
          success: false,

          error: {
            code: err.code || null,
            message: err.message || String(err),
          },
        };
      }
    });

    // =====================================================
    // WAIT FOR ALL NOTIFICATIONS
    // =====================================================
    const results = await Promise.all(sendPromises);

    const successCount = results.filter(
      (r) => r.success
    ).length;

    const failureCount =
      results.length - successCount;

    console.log(
      "✅ Notification send results:",
      JSON.stringify(
        {
          successCount,
          failureCount,
          results,
        },
        null,
        2
      )
    );

    // =====================================================
    // RESPONSE
    // =====================================================
    return sendResponse(
      res,
      "Notification(s) processed.",
      null,
      {
        successCount,
        failureCount,
        results,
      }
    );

  } catch (error) {
    console.error(
      "❌ Firebase Error FULL:",
      error
    );

    return sendResponse(
      res,
      error.message || "Firebase send error",
      {
        code: error.code || null,
        info: error,
      },
      null
    );
  }
};

// =====================================================================
// PUSH TOKEN OWNERSHIP
// ---------------------------------------------------------------------
// tblpushtoken keeps ONE row per device token (TokenID).
//   IsRegistered  "YES"  -> the device belongs to a registered user
//                 "NO"   -> anonymous install (user never registered / logged in)
//   OwnerType     "Registered" | "Anonymous"
//   RegUserID, RegFullName, RegEmailAddress, RegMobileNo,
//   RegCountryID, RegCountryName, RegArCountryName,
//   RegCityID, RegCityName, RegArCityName, RegisteredAt, LinkedAt
//   TokenOwnerID / DeviceIP  -> public IP the app reported (kept for history)
// =====================================================================

const REG_FIELDS = [
  "RegUserID",
  "RegFullName",
  "RegEmailAddress",
  "RegMobileNo",
  "RegCountryID",
  "RegCountryName",
  "RegArCountryName",
  "RegCityID",
  "RegCityName",
  "RegArCityName",
  "RegisteredAt",
  "LinkedAt",
];

const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// FCM error codes that mean "this token is dead, stop sending to it"
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

function registeredFieldsFromUser(user) {
  return {
    RegUserID: clean(user.RegUserID),
    RegFullName: clean(user.RegFullName),
    RegEmailAddress: clean(user.RegEmailAddress),
    RegMobileNo: clean(user.RegMobileNo),
    RegCountryID: clean(user.RegCountryID),
    RegCountryName: clean(user.RegCountryName),
    RegArCountryName: clean(user.RegArCountryName),
    RegCityID: clean(user.RegCityID),
    RegCityName: clean(user.RegCityName),
    RegArCityName: clean(user.RegArCityName),
    RegisteredAt: user.createdAt || null,
  };
}

// --------------------------------------------------------------------
// POST /api/pushmsg/saveToken      (public - called by the app on start)
// body: { TokenID | token, TokenOwnerID (public IP), OwnerType, CreatedBy,
//         OldTokenID?, DevicePlatform? }
// Saves / refreshes the device token. It NEVER removes the registered-user
// link of an existing token, so a registered device stays registered.
// If OldTokenID is sent (Firebase rotated the token) the owner details of the
// old token are moved to the new one and the old token is set inactive.
// --------------------------------------------------------------------
exports.saveToken = async (req, res, next) => {
  console.log("📩 Incoming Token Save Body:", req.body);

  const TokenID = clean(req.body?.TokenID || req.body?.token);
  const TokenOwnerID = clean(req.body?.TokenOwnerID);
  const OldTokenID = clean(req.body?.OldTokenID);
  const DevicePlatform = clean(req.body?.DevicePlatform);
  const CreatedBy = clean(req.body?.CreatedBy) || TokenOwnerID || "SYSTEM";

  if (!TokenID) {
    return sendResponse(
      res,
      "TokenID is required.",
      { type: "validation_error", receivedBody: req.body },
      null
    );
  }

  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblpushtoken");
    const now = new Date();

    const existing = await collection.findOne({ TokenID });

    // ---- carry the owner over from a rotated token -------------------
    let carried = null;
    if (OldTokenID && OldTokenID !== TokenID) {
      const oldDoc = await collection.findOne({ TokenID: OldTokenID });
      if (oldDoc && oldDoc.IsRegistered === "YES" && oldDoc.RegUserID) {
        carried = {};
        REG_FIELDS.forEach((k) => {
          if (oldDoc[k] !== undefined) carried[k] = oldDoc[k];
        });
      }
      if (oldDoc) {
        await collection.updateOne(
          { TokenID: OldTokenID },
          { $set: { IsActive: "NO", ReplacedByTokenID: TokenID, ModifyDate: now } }
        );
      }
    }

    const $set = {
      TokenID,
      ModifyBy: CreatedBy,
      ModifyDate: now,
      IsActive: "YES",
    };
    if (TokenOwnerID) {
      $set.TokenOwnerID = TokenOwnerID;
      $set.DeviceIP = TokenOwnerID;
    }
    if (DevicePlatform) $set.DevicePlatform = DevicePlatform;

    const $setOnInsert = {
      TID: uuidv4(),
      CreatedBy,
      CreatedDate: now,
    };

    if (carried && !(existing && existing.IsRegistered === "YES")) {
      Object.assign($set, carried, { IsRegistered: "YES", OwnerType: "Registered" });
    } else if (!existing) {
      $setOnInsert.IsRegistered = "NO";
      $setOnInsert.OwnerType = clean(req.body?.OwnerType) || "Anonymous";
    } else if (!existing.IsRegistered) {
      // legacy row saved before this change
      $set.IsRegistered = existing.RegUserID ? "YES" : "NO";
      $set.OwnerType = existing.RegUserID ? "Registered" : "Anonymous";
    }

    const result = await collection.updateOne(
      { TokenID },
      { $set, $setOnInsert },
      { upsert: true }
    );

    const saved = await collection.findOne({ TokenID }, { projection: { _id: 0 } });

    return sendResponse(
      res,
      existing ? "Token updated successfully." : "Token inserted successfully.",
      null,
      {
        mode: existing ? "update" : "insert",
        TokenID,
        TokenOwnerID: saved?.TokenOwnerID || TokenOwnerID,
        OwnerType: saved?.OwnerType,
        IsRegistered: saved?.IsRegistered,
        RegUserID: saved?.RegUserID || null,
        mongoResult: result,
      }
    );
  } catch (error) {
    console.error("❌ Error saving token:", error);
    return sendResponse(
      res,
      error.message || "Error saving token",
      { type: "db_error", info: error },
      null
    );
  }
};

// --------------------------------------------------------------------
// POST /api/pushmsg/linkTokenToUser   (protected - app sends its login JWT)
// body: { TokenID, TokenOwnerID?, DevicePlatform? }
// Called right after a successful registration OTP / login.
// The user is taken from the JWT (prtuserid), so a device can only be linked
// to the account that is actually logged in.
// --------------------------------------------------------------------
exports.linkTokenToUser = async (req, res, next) => {
  console.log("🔗 Incoming Token Link Body:", req.body);

  const TokenID = clean(req.body?.TokenID || req.body?.token);
  const TokenOwnerID = clean(req.body?.TokenOwnerID);
  const DevicePlatform = clean(req.body?.DevicePlatform);
  const jwtUserID = clean(req.user?.prtuserid || req.user?.sub);
  const bodyUserID = clean(req.body?.RegUserID);

  if (!TokenID) {
    return sendResponse(res, "TokenID is required.", { type: "validation_error" }, null);
  }
  if (!jwtUserID) {
    return sendResponse(res, "Login token has no user.", { type: "auth_error" }, null);
  }
  if (bodyUserID && bodyUserID !== jwtUserID) {
    return res.status(403).json({
      statusCode: 403,
      message: "RegUserID does not match the logged-in user.",
      data: null,
      error: { type: "forbidden" },
    });
  }

  try {
    const db = await connectToMongoDB();
    const user = await db.collection("tblreginfo").findOne({ RegUserID: jwtUserID });

    if (!user) {
      return sendResponse(res, "Registered user not found.", { type: "not_found" }, null);
    }
    if (clean(user.RegStatus).toUpperCase() !== "ACTIVE") {
      return sendResponse(res, "User has not completed registration.", { type: "not_active" }, null);
    }

    const collection = db.collection("tblpushtoken");
    const now = new Date();

    const $set = {
      TokenID,
      ...registeredFieldsFromUser(user),
      IsRegistered: "YES",
      OwnerType: "Registered",
      LinkedAt: now,
      IsActive: "YES",
      ModifyBy: jwtUserID,
      ModifyDate: now,
    };
    if (TokenOwnerID) {
      $set.TokenOwnerID = TokenOwnerID;
      $set.DeviceIP = TokenOwnerID;
    }
    if (DevicePlatform) $set.DevicePlatform = DevicePlatform;

    const result = await collection.updateOne(
      { TokenID },
      { $set, $setOnInsert: { TID: uuidv4(), CreatedBy: jwtUserID, CreatedDate: now } },
      { upsert: true }
    );

    return sendResponse(res, "Token linked to registered user.", null, {
      TokenID,
      RegUserID: jwtUserID,
      RegFullName: $set.RegFullName,
      RegCountryName: $set.RegCountryName,
      RegCityName: $set.RegCityName,
      IsRegistered: "YES",
      mongoResult: result,
    });
  } catch (error) {
    console.error("❌ Error linking token:", error);
    return sendResponse(res, error.message || "Error linking token", { type: "db_error" }, null);
  }
};

// --------------------------------------------------------------------
// Filter builder shared by list / summary / sendToGroup
// TargetGroup: "ALL" | "REGISTERED" | "NONREGISTERED"
// CountryID / CityID only apply to registered users (anonymous devices
// have no country or city).
// --------------------------------------------------------------------
function buildTokenFilter(src = {}) {
  const and = [];

  const status = clean(src.Status).toUpperCase(); // ACTIVE (default) | INACTIVE | ALL
  if (status === "INACTIVE") and.push({ IsActive: "NO" });
  else if (status !== "ALL") and.push({ IsActive: { $ne: "NO" } });

  const group = clean(src.TargetGroup || src.UserGroup).toUpperCase().replace(/[\s_-]/g, "");
  if (group === "REGISTERED") {
    and.push({ IsRegistered: "YES" });
  } else if (group === "NONREGISTERED" || group === "ANONYMOUS") {
    and.push({ IsRegistered: { $ne: "YES" } });
  }

  const CountryID = clean(src.CountryID);
  const CityID = clean(src.CityID);
  if (group !== "NONREGISTERED" && group !== "ANONYMOUS") {
    if (CountryID) and.push({ RegCountryID: CountryID });
    if (CityID) and.push({ RegCityID: CityID });
  }

  const search = clean(src.searchTerm || src.search);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    and.push({
      $or: [
        { RegFullName: rx },
        { RegEmailAddress: rx },
        { RegMobileNo: rx },
        { RegCountryName: rx },
        { RegCityName: rx },
        { TokenID: rx },
        { TokenOwnerID: rx },
        { OwnerType: rx },
      ],
    });
  }

  return and.length ? { $and: and } : {};
}

function toListRow(r) {
  const registered = r.IsRegistered === "YES";
  return {
    TID: r.TID,
    TokenID: r.TokenID,
    TokenOwnerID: r.TokenOwnerID,
    DeviceIP: r.DeviceIP || r.TokenOwnerID || "",
    DevicePlatform: r.DevicePlatform || "",
    OwnerType: r.OwnerType,
    IsRegistered: registered ? "YES" : "NO",
    RegUserID: r.RegUserID || "",
    RegFullName: r.RegFullName || "",
    RegEmailAddress: r.RegEmailAddress || "",
    RegMobileNo: r.RegMobileNo || "",
    RegCountryID: r.RegCountryID || "",
    RegCountryName: r.RegCountryName || "",
    RegArCountryName: r.RegArCountryName || "",
    RegCityID: r.RegCityID || "",
    RegCityName: r.RegCityName || "",
    RegArCityName: r.RegArCityName || "",
    RegisteredAt: r.RegisteredAt || null,
    LinkedAt: r.LinkedAt || null,
    CreatedBy: r.CreatedBy,
    CreatedDate: r.CreatedDate,
    ModifyBy: r.ModifyBy,
    ModifyDate: r.ModifyDate,
    IsActive: r.IsActive,
    // kept for the existing CMS grid columns
    UserFullName: registered ? r.RegFullName || "(no name)" : "Guest (not registered)",
    UserType: registered ? "REGISTERED" : "NON-REGISTERED",
  };
}

async function groupCounts(collection, baseSrc) {
  const common = { ...baseSrc, TargetGroup: "ALL" };
  const [all, registered, nonRegistered] = await Promise.all([
    collection.countDocuments(buildTokenFilter(common)),
    collection.countDocuments(buildTokenFilter({ ...common, TargetGroup: "REGISTERED" })),
    collection.countDocuments(buildTokenFilter({ ...common, TargetGroup: "NONREGISTERED", CountryID: "", CityID: "" })),
  ]);
  return { all, registered, nonRegistered };
}

// --------------------------------------------------------------------
// POST /api/pushmsg/list   (CMS)
// body (or query): { page, pageSize, searchTerm, TargetGroup, CountryID, CityID, Status }
// --------------------------------------------------------------------
exports.list = async (req, res, next) => {
  const src = { ...(req.query || {}), ...(req.body || {}) };
  console.log("📩 Incoming Token List:", src);

  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblpushtoken");

    const page = parseInt(src.page, 10) > 0 ? parseInt(src.page, 10) : 1;
    const pageSize = parseInt(src.pageSize, 10) > 0 ? Math.min(parseInt(src.pageSize, 10), 500) : 10;
    const skip = (page - 1) * pageSize;

    const filter = buildTokenFilter(src);

    const [docs, totalCount, counts] = await Promise.all([
      collection
        .find(filter, { projection: { _id: 0 } })
        .sort({ ModifyDate: -1, CreatedDate: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      collection.countDocuments(filter),
      groupCounts(collection, { searchTerm: src.searchTerm, Status: src.Status, CountryID: src.CountryID, CityID: src.CityID }),
    ]);

    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

    return sendResponse(res, "Token list fetched successfully.", null, {
      page,
      pageSize,
      totalCount,
      totalPages,
      counts,
      rows: docs.map(toListRow),
    });
  } catch (error) {
    console.error("❌ Error listing tokens:", error);
    return sendResponse(res, error.message || "Error listing tokens", { type: "db_error", info: error }, null);
  }
};

// --------------------------------------------------------------------
// POST /api/pushmsg/summary   (CMS)
// -> { counts:{all,registered,nonRegistered}, byCountry:[...], byCity:[...] }
// --------------------------------------------------------------------
exports.summary = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblpushtoken");

    const active = { IsActive: { $ne: "NO" } };
    const counts = await groupCounts(collection, {});

    const [byCountry, byCity] = await Promise.all([
      collection
        .aggregate([
          { $match: { ...active, IsRegistered: "YES" } },
          {
            $group: {
              _id: { $ifNull: ["$RegCountryID", ""] },
              CountryName: { $first: "$RegCountryName" },
              ArCountryName: { $first: "$RegArCountryName" },
              devices: { $sum: 1 },
              users: { $addToSet: "$RegUserID" },
            },
          },
          { $project: { _id: 0, CountryID: "$_id", CountryName: 1, ArCountryName: 1, devices: 1, users: { $size: "$users" } } },
          { $sort: { devices: -1 } },
        ])
        .toArray(),
      collection
        .aggregate([
          { $match: { ...active, IsRegistered: "YES" } },
          {
            $group: {
              _id: { $ifNull: ["$RegCityID", ""] },
              CityName: { $first: "$RegCityName" },
              CountryID: { $first: "$RegCountryID" },
              CountryName: { $first: "$RegCountryName" },
              devices: { $sum: 1 },
              users: { $addToSet: "$RegUserID" },
            },
          },
          { $project: { _id: 0, CityID: "$_id", CityName: 1, CountryID: 1, CountryName: 1, devices: 1, users: { $size: "$users" } } },
          { $sort: { devices: -1 } },
        ])
        .toArray(),
    ]);

    return sendResponse(res, "Token summary fetched successfully.", null, { counts, byCountry, byCity });
  } catch (error) {
    console.error("❌ Error token summary:", error);
    return sendResponse(res, error.message || "Error token summary", { type: "db_error" }, null);
  }
};

// --------------------------------------------------------------------
// Firebase helper: send one notification to many tokens (500 per call)
// --------------------------------------------------------------------
async function sendToTokens(tokens, title, body, data = {}) {
  const firebaseData = Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [String(k), String(v)])
  );

  const results = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const message = {
      tokens: chunk,
      notification: { title: String(title), body: String(body) },
      data: firebaseData,
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "high_importance_channel" },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "default", contentAvailable: true } },
      },
    };

    try {
      const batch = await firebase.messaging.sendEachForMulticast(message);
      batch.responses.forEach((r, idx) => {
        results.push({
          token: chunk[idx],
          success: r.success,
          response: r.messageId || null,
          error: r.success ? null : { code: r.error?.code || null, message: r.error?.message || "" },
        });
      });
    } catch (err) {
      // whole batch failed (e.g. credentials) -> mark every token in it as failed
      chunk.forEach((t) =>
        results.push({ token: t, success: false, error: { code: err.code || null, message: err.message || String(err) } })
      );
    }
  }
  return results;
}

async function deactivateDeadTokens(db, results) {
  const dead = results
    .filter((r) => !r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code))
    .map((r) => r.token);
  if (dead.length) {
    await db
      .collection("tblpushtoken")
      .updateMany({ TokenID: { $in: dead } }, { $set: { IsActive: "NO", DeactivatedReason: "FCM_NOT_REGISTERED", ModifyDate: new Date() } });
  }
  return dead.length;
}

// --------------------------------------------------------------------
// POST /api/pushmsg/sendToGroup   (CMS, protected)
// body: { TargetGroup: "ALL"|"REGISTERED"|"NONREGISTERED",
//         CountryID?, CityID?, title, body, data? , DryRun? }
// DryRun=true only returns how many devices would receive it.
// --------------------------------------------------------------------
exports.sendToGroup = async (req, res, next) => {
  const TargetGroup = clean(req.body?.TargetGroup).toUpperCase() || "ALL";
  const title = clean(req.body?.title);
  const body = clean(req.body?.body);
  const data = req.body?.data || {};
  const dryRun = req.body?.DryRun === true || String(req.body?.DryRun).toLowerCase() === "true";

  if (!["ALL", "REGISTERED", "NONREGISTERED"].includes(TargetGroup)) {
    return sendResponse(res, "TargetGroup must be ALL, REGISTERED or NONREGISTERED.", { type: "validation_error" }, null);
  }
  if (!dryRun && (!title || !body)) {
    return sendResponse(res, "title and body are required.", { type: "validation_error" }, null);
  }

  try {
    const db = await connectToMongoDB();
    const filter = buildTokenFilter({
      TargetGroup,
      CountryID: req.body?.CountryID,
      CityID: req.body?.CityID,
    });

    const tokens = (await db.collection("tblpushtoken").distinct("TokenID", filter))
      .map((t) => clean(t))
      .filter(Boolean);

    if (dryRun) {
      return sendResponse(res, "Recipient count.", null, { TargetGroup, recipientCount: tokens.length });
    }
    if (tokens.length === 0) {
      return sendResponse(res, "No devices found for the selected group.", { type: "no_recipients" }, { recipientCount: 0 });
    }

    const results = await sendToTokens(tokens, title, body, data);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    const deactivated = await deactivateDeadTokens(db, results);

    await db.collection("tblpushmsglog").insertOne({
      MsgID: uuidv4(),
      TargetGroup,
      CountryID: clean(req.body?.CountryID),
      CityID: clean(req.body?.CityID),
      Title: title,
      Body: body,
      RecipientCount: tokens.length,
      SuccessCount: successCount,
      FailureCount: failureCount,
      DeactivatedCount: deactivated,
      SentBy: clean(req.user?.prtuserid || req.user?.sub) || "ADMIN",
      SentAt: new Date(),
    });

    return sendResponse(res, "Notification(s) processed.", null, {
      TargetGroup,
      recipientCount: tokens.length,
      successCount,
      failureCount,
      deactivatedTokens: deactivated,
      // send back only the failures to keep the response small
      failures: results.filter((r) => !r.success).slice(0, 200),
    });
  } catch (error) {
    console.error("❌ sendToGroup error:", error);
    return sendResponse(res, error.message || "Firebase send error", { code: error.code || null }, null);
  }
};

 exports.deleteToken = async (req, res, next) => {
  console.log("🗑️ Incoming Token Delete Body:", req.body);

  try {
    let TID = req.body?.TID;

    // -----------------------------
    // 🔎 Basic validation
    // -----------------------------
    if (!TID) {
      return sendResponse(
        res,
        "TID is required.",
        {
          type: "validation_error",
          receivedBody: req.body,
        },
        null
      );
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblpushtoken");

    // -----------------------------------
    // 🧠 Normalize: if single → make array
    // -----------------------------------
    if (!Array.isArray(TID)) {
      TID = [TID];
    }

    // -----------------------------------
    // ❗ Build delete filter
    // -----------------------------------
    const filter = { TID: { $in: TID } };

    // -----------------------------------
    // 🔥 Delete matching records
    // -----------------------------------
    const result = await collection.deleteMany(filter);

    // -----------------------------------
    // 🧾 Response summary
    // -----------------------------------
    return sendResponse(
      res,
      "Delete operation completed.",
      null,
      {
        requestedTIDs: TID,
        deletedCount: result.deletedCount,
        notFound: TID.length - result.deletedCount,
      }
    );

  } catch (error) {
    console.error("❌ Error deleting token:", error);

    return sendResponse(
      res,
      error.message || "Error deleting token",
      {
        type: "db_error",
        info: error,
      },
      null
    );
  }
};
