
//setting.control.js
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


exports.modifyAppHomeIconStatus = async (req, res, next) => {
  try {
    const { LPID, IsDataStatus } = req.body || {}

    // -------------------- Validation --------------------
    if (!LPID) {
      return sendResponse(
        res,
        'LPID is required.',
        {
          type: 'validation_error',
          field: 'LPID',
          receivedBody: req.body,
        },
        null,
      )
    }

    if (IsDataStatus === undefined || IsDataStatus === null) {
      return sendResponse(
        res,
        'IsDataStatus is required.',
        {
          type: 'validation_error',
          field: 'IsDataStatus',
          receivedBody: req.body,
        },
        null,
      )
    }

    // ✅ FORCE STRING "0" or "1"
    const statusVal = String(IsDataStatus) === '1' ? '1' : '0'

    // -------------------- DB --------------------
    const db = await connectToMongoDB()
    const collection = db.collection('tbllangpack')

    // -------------------- Update --------------------
    const result = await collection.updateOne(
      { LPID: Number(LPID) }, // LPID stored as Number
      { $set: { IsDataStatus: statusVal } },
    )

    if (!result || result.matchedCount === 0) {
      return sendResponse(
        res,
        'No record found for this LPID.',
        {
          type: 'not_found',
          field: 'LPID',
          value: LPID,
        },
        null,
      )
    }

    // -------------------- Fetch Updated Doc --------------------
    const updatedDoc = await collection.findOne({ LPID: Number(LPID) })

    // -------------------- Response --------------------
    return sendResponse(res, 'Status updated successfully.', null, {
      LPID: LPID,
      IsDataStatus: statusVal,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      updated: updatedDoc,
    })
  } catch (error) {
    console.error(error)
    next(error)
  }
}


 // controllers/commonController.js
// ✅ Get all records from tbllangpack

exports.getAllHomeIcon = async (req, res, next) => {
  try {
    const db = await connectToMongoDB()
    const collection = db.collection('tbllangpack')

    // -------------------- Fetch All Records --------------------
    const records = await collection.find({}).toArray()

    // -------------------- Response --------------------
    return sendResponse(
      res,
      'Language pack list fetched successfully.',
      null,
      records,
    )
  } catch (error) {
    console.error(error)
    next(error)
  }
}


// =====================================================================
// APP DISPLAY SETTINGS  (collection: tblappsetting, one document)
// Controls what the mobile app shows. Managed from CMS > Settings >
// App Display Settings.
//   ShowPrdDesc          "YES" | "NO"  - Product Description row on product page
//   ShowPrdSpec          "YES" | "NO"  - Product Specification row on product page
//   ShowRegCountryCity   "YES" | "NO"  - Country + City dropdowns on registration form
//   RegCountryCityRequired "YES" | "NO" - Country + City must be selected to register
// =====================================================================
const APP_SETTING_ID = 'APP_DISPLAY'

const APP_SETTING_DEFAULTS = {
  ShowPrdDesc: 'YES',
  ShowPrdSpec: 'YES',
  ShowRegCountryCity: 'YES',
  RegCountryCityRequired: 'YES',
}

const yesNo = (v, fallback) => {
  if (v === undefined || v === null || v === '') return fallback
  const s = String(v).trim().toUpperCase()
  return s === 'YES' || s === '1' || s === 'TRUE' ? 'YES' : 'NO'
}

async function readAppDisplaySetting(db) {
  const doc = await db.collection('tblappsetting').findOne({ SettingID: APP_SETTING_ID })
  const out = { ...APP_SETTING_DEFAULTS }
  if (doc) {
    Object.keys(APP_SETTING_DEFAULTS).forEach((k) => {
      out[k] = yesNo(doc[k], APP_SETTING_DEFAULTS[k])
    })
    out.ModifyAt = doc.ModifyAt || null
    out.ModifyBy = doc.ModifyBy || null
  }
  return out
}
exports.readAppDisplaySetting = readAppDisplaySetting

// POST /api/setting/getAppDisplaySetting   (public - used by the app and CMS)
exports.getAppDisplaySetting = async (req, res, next) => {
  try {
    const db = await connectToMongoDB()
    const data = await readAppDisplaySetting(db)
    return sendResponse(res, 'App display setting fetched successfully.', null, data)
  } catch (error) {
    console.error(error)
    next(error)
  }
}

// POST /api/setting/saveAppDisplaySetting  (CMS, protected)
// body: any of ShowPrdDesc, ShowPrdSpec, ShowRegCountryCity, RegCountryCityRequired, ModifyBy
exports.saveAppDisplaySetting = async (req, res, next) => {
  try {
    const db = await connectToMongoDB()
    const current = await readAppDisplaySetting(db)

    const $set = { SettingID: APP_SETTING_ID, ModifyAt: new Date(), ModifyBy: req.body?.ModifyBy || 'ADMIN' }
    Object.keys(APP_SETTING_DEFAULTS).forEach((k) => {
      $set[k] = yesNo(req.body?.[k], current[k])
    })

    await db
      .collection('tblappsetting')
      .updateOne({ SettingID: APP_SETTING_ID }, { $set }, { upsert: true })

    const data = await readAppDisplaySetting(db)
    return sendResponse(res, 'App display setting saved successfully.', null, data)
  } catch (error) {
    console.error(error)
    next(error)
  }
}
