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
exports.saveToken = async (req, res, next) => {
  console.log("📩 Incoming Token Save Body:", req.body);

  const TokenID = req.body?.TokenID || req.body?.token;
  const TokenOwnerID = req.body?.TokenOwnerID;
  const OwnerType = req.body?.OwnerType; // ✅ ADDED
  const CreatedBy = req.body?.CreatedBy || TokenOwnerID || "SYSTEM";

  // --------------------------------------
  // 🛑 Validation
  // --------------------------------------
  if (!TokenID || !TokenOwnerID || !OwnerType) {
    return sendResponse(
      res,
      "TokenID, TokenOwnerID and OwnerType are required.",
      {
        type: "validation_error",
        receivedBody: req.body,
      },
      null
    );
  }

  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblpushtoken");

    const now = new Date();

    // --------------------------------------
    // 🔍 Check if TokenOwnerID already exists
    // --------------------------------------
    const existing = await collection.findOne({ TokenOwnerID });

    if (existing) {
      // --------------------------------------
      // 🔁 UPDATE existing token
      // --------------------------------------
      const updateResult = await collection.updateOne(
        { TokenOwnerID },
        {
          $set: {
            TokenID,
            OwnerType,          // ✅ ADDED
            ModifyBy: CreatedBy,
            ModifyDate: now,
            IsActive: "YES",
          },
        }
      );

      console.log("🔁 Token updated for owner:", TokenOwnerID);

      return sendResponse(
        res,
        "Token updated successfully.",
        null,
        {
          mode: "update",
          TokenOwnerID,
          TokenID,
          OwnerType, // ✅ return
          mongoResult: updateResult,
        }
      );
    } else {
      // --------------------------------------
      // 🆕 INSERT new token
      // --------------------------------------
      const doc = {
        TID: uuidv4(),
        TokenID,
        TokenOwnerID,
        OwnerType,          // ✅ ADDED
        CreatedBy,
        CreatedDate: now,
        ModifyBy: null,
        ModifyDate: null,
        IsActive: "YES",
      };

      const insertResult = await collection.insertOne(doc);

      console.log("🆕 Token inserted for owner:", TokenOwnerID);

      return sendResponse(
        res,
        "Token inserted successfully.",
        null,
        {
          mode: "insert",
          TokenOwnerID,
          TokenID,
          OwnerType, // ✅ return
          mongoResult: insertResult,
        }
      );
    }
  } catch (error) {
    console.error("❌ Error saving token:", error);

    return sendResponse(
      res,
      error.message || "Error saving token",
      {
        type: "db_error",
        info: error,
      },
      null
    );
  }
};
// controllers/pushtoken.controller.js

 exports.list = async (req, res, next) => {
  console.log("📩 Incoming Token List Query:", req.query);

  try {
    const db = await connectToMongoDB();
    const collection = db.collection("tblpushtoken");

    const page = parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1;
    const pageSize = parseInt(req.query.pageSize, 10) > 0 ? parseInt(req.query.pageSize, 10) : 10;
    const skip = (page - 1) * pageSize;

    const pipeline = [
      {
        $sort: {
          ModifyDate: -1,
          CreatedDate: -1,
        },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: pageSize },

            // Check vendor by TokenOwnerID == VendorID
            {
              $lookup: {
                from: "tblvendorinfo",
                localField: "TokenOwnerID",
                foreignField: "VendorID",
                as: "vendor",
              },
            },

            // Check parent by TokenOwnerID == prtuserid
            {
              $lookup: {
                from: "tblMemRegInfo",
                localField: "TokenOwnerID",
                foreignField: "prtuserid",
                as: "parent",
              },
            },

            // Count matched records
            {
              $addFields: {
                vendorCount: { $size: "$vendor" },
                parentCount: { $size: "$parent" },
              },
            },

            // If vendor matched, use vendor.
            // If no vendor matched and parent matched, use parent.
            {
              $addFields: {
                UserFullName: {
                  $cond: [
                    { $gt: ["$vendorCount", 0] },
                    { $arrayElemAt: ["$vendor.vdrName", 0] },
                    {
                      $cond: [
                        { $gt: ["$parentCount", 0] },
                        { $arrayElemAt: ["$parent.RegUserFullName", 0] },
                        null,
                      ],
                    },
                  ],
                },
                UserType: {
                  $cond: [
                    { $gt: ["$vendorCount", 0] },
                    "VENDOR",
                    {
                      $cond: [
                        { $gt: ["$parentCount", 0] },
                        "PARENT",
                        null,
                      ],
                    },
                  ],
                },
              },
            },

            {
              $project: {
                _id: 0,
                TID: 1,
                TokenID: 1,
                TokenOwnerID: 1,
                OwnerType: 1,
                CreatedBy: 1,
                CreatedDate: 1,
                ModifyBy: 1,
                ModifyDate: 1,
                IsActive: 1,

                UserFullName: 1,
                UserType: 1,

                // temporary debug - remove later if you want
                vendorCount: 1,
                parentCount: 1,
              },
            },
          ],

          total: [{ $count: "count" }],
        },
      },
    ];

    const aggResult = await collection.aggregate(pipeline).toArray();
    const first = aggResult[0] || {};
    const rows = first.data || [];
    const totalCount = first.total && first.total[0] ? first.total[0].count : 0;
    const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1;

    return sendResponse(res, "Token list fetched successfully.", null, {
      page,
      pageSize,
      totalCount,
      totalPages,
      rows,
    });
  } catch (error) {
    console.error("❌ Error listing tokens:", error);

    return sendResponse(
      res,
      error.message || "Error listing tokens",
      {
        type: "db_error",
        info: error,
      },
      null
    );
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
