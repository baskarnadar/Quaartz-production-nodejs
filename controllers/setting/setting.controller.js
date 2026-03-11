
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
