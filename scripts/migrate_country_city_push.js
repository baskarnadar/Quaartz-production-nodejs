// scripts/migrate_country_city_push.js
// -----------------------------------------------------------------------------
// One-time migration for:
//   1. Country lookup  (new collection tblcountry, seeded with Saudi Arabia)
//   2. City -> Country link (tblcity.CountryID)
//   3. Push tokens: one row per device token + registered / non-registered flag
//   4. App display settings (tblappsetting)
//   5. Indexes
//
// Safe to run more than once.
//
// Run from the API folder (uses MONGODB_URI and DATABASE from .env):
//     node scripts/migrate_country_city_push.js
// Dry run (prints what would change, writes nothing):
//     node scripts/migrate_country_city_push.js --dry-run
// -----------------------------------------------------------------------------
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

const newId = () => uuidv4().replace(/-/g, "").substring(0, 25);

const SAUDI = {
  EnCountryName: "Saudi Arabia",
  ArCountryName: "المملكة العربية السعودية",
  CountryCode: "SA",
  PhoneCode: "966",
  SortOrder: 1,
};

async function migrate(db, { dryRun = false, log = console.log } = {}) {
  const summary = {};

  // ---------------------------------------------------------------- 1. country
  const countries = db.collection("tblcountry");
  let saudi = await countries.findOne({ CountryCode: SAUDI.CountryCode });
  if (!saudi) {
    saudi = {
      CountryID: newId(),
      ...SAUDI,
      IsDataStatus: "1",
      CreatedAt: new Date(),
      CreatedBy: "MIGRATION",
      ModifyAt: new Date(),
      ModifyBy: "MIGRATION",
    };
    if (!dryRun) await countries.insertOne(saudi);
    summary.countryInserted = SAUDI.EnCountryName;
  } else {
    summary.countryInserted = "already exists";
  }
  log(`[country] Saudi Arabia CountryID = ${saudi.CountryID}`);

  // ------------------------------------------------------------- 2. city link
  const cityFilter = {
    $or: [{ CountryID: { $exists: false } }, { CountryID: "" }, { CountryID: null }],
  };
  const unlinkedCities = await db.collection("tblcity").countDocuments(cityFilter);
  if (!dryRun && unlinkedCities > 0) {
    await db
      .collection("tblcity")
      .updateMany(cityFilter, { $set: { CountryID: saudi.CountryID, ModifyAt: new Date(), ModifyBy: "MIGRATION" } });
  }
  summary.citiesLinkedToSaudi = unlinkedCities;
  log(`[city] ${unlinkedCities} city record(s) linked to Saudi Arabia`);

  // ---------------------------------------------------------- 3. push tokens
  const tokens = db.collection("tblpushtoken");
  const all = await tokens.find({}).toArray();

  // a) remove duplicate rows of the same device token (keep the newest)
  const byToken = new Map();
  for (const t of all) {
    const key = String(t.TokenID || "").trim();
    if (!key) continue;
    if (!byToken.has(key)) byToken.set(key, []);
    byToken.get(key).push(t);
  }
  const stamp = (t) => new Date(t.ModifyDate || t.CreatedDate || 0).getTime();
  const duplicateIds = [];
  for (const rows of byToken.values()) {
    if (rows.length < 2) continue;
    rows.sort((a, b) => stamp(b) - stamp(a));
    // prefer keeping a registered row if there is one
    const keep = rows.find((r) => r.IsRegistered === "YES" || r.RegUserID) || rows[0];
    rows.filter((r) => r !== keep).forEach((r) => duplicateIds.push(r._id));
  }
  const emptyTokenIds = all.filter((t) => !String(t.TokenID || "").trim()).map((t) => t._id);
  if (!dryRun && duplicateIds.length) await tokens.deleteMany({ _id: { $in: duplicateIds } });
  if (!dryRun && emptyTokenIds.length) await tokens.deleteMany({ _id: { $in: emptyTokenIds } });
  summary.duplicateTokenRowsRemoved = duplicateIds.length;
  summary.emptyTokenRowsRemoved = emptyTokenIds.length;
  log(`[pushtoken] removed ${duplicateIds.length} duplicate row(s), ${emptyTokenIds.length} empty row(s)`);

  // b) registered flag + device IP for rows saved before this change
  const legacy = await tokens.countDocuments({ IsRegistered: { $exists: false } });
  if (!dryRun && legacy > 0) {
    const rows = await tokens.find({ IsRegistered: { $exists: false } }).toArray();
    for (const r of rows) {
      const registered = !!r.RegUserID;
      await tokens.updateOne(
        { _id: r._id },
        {
          $set: {
            IsRegistered: registered ? "YES" : "NO",
            OwnerType: registered ? "Registered" : r.OwnerType || "Anonymous",
            DeviceIP: r.DeviceIP || r.TokenOwnerID || "",
            IsActive: r.IsActive || "YES",
          },
        }
      );
    }
  }
  summary.tokenRowsFlagged = legacy;
  log(`[pushtoken] ${legacy} row(s) given IsRegistered / DeviceIP`);

  // ------------------------------------------------------ 4. display settings
  const setting = await db.collection("tblappsetting").findOne({ SettingID: "APP_DISPLAY" });
  if (!setting && !dryRun) {
    await db.collection("tblappsetting").insertOne({
      SettingID: "APP_DISPLAY",
      ShowPrdDesc: "YES",
      ShowPrdSpec: "YES",
      ShowRegCountryCity: "YES",
      RegCountryCityRequired: "YES",
      ModifyAt: new Date(),
      ModifyBy: "MIGRATION",
    });
  }
  summary.appSetting = setting ? "already exists" : "created";

  // --------------------------------------------------------------- 5. indexes
  if (!dryRun) {
    await tokens.createIndex({ TokenID: 1 }, { unique: true, name: "ux_TokenID" });
    await tokens.createIndex({ IsRegistered: 1, IsActive: 1 }, { name: "ix_group" });
    await tokens.createIndex({ RegUserID: 1 }, { name: "ix_RegUserID" });
    await tokens.createIndex({ RegCountryID: 1, RegCityID: 1 }, { name: "ix_country_city" });
    await countries.createIndex({ CountryID: 1 }, { unique: true, name: "ux_CountryID" });
    await db.collection("tblcity").createIndex({ CountryID: 1 }, { name: "ix_CountryID" });
    await db.collection("tblreginfo").createIndex({ RegCountryID: 1, RegCityID: 1 }, { name: "ix_country_city" });
  }
  summary.indexes = dryRun ? "skipped (dry run)" : "created";

  log("\nSummary:", JSON.stringify(summary, null, 2));
  return summary;
}

module.exports = { migrate };

if (require.main === module) {
  const { MongoClient } = require("mongodb");
  const dryRun = process.argv.includes("--dry-run");
  (async () => {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    try {
      const db = client.db(process.env.DATABASE);
      console.log(`Database: ${process.env.DATABASE}${dryRun ? "  (DRY RUN)" : ""}\n`);
      await migrate(db, { dryRun });
    } finally {
      await client.close();
    }
  })().catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  });
}
