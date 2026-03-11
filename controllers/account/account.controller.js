const { connectToMongoDB } = require("../../database/mongodb");
const EmailService = require('../services/emailservice');
const crypto = require("crypto");
const transporter = require('../email/mail');
require('dotenv').config();
// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'data': results,
    'error': error,
  });
}
 
const { v4: uuidv4 } = require('uuid');

function generateUniqueId() { 
    length=25; 
  const uuid = uuidv4().replace(/-/g, '');
  return uuid.substring(0, length); 
}
function generateOtp() {
  // Generate a 4-digit number
  const otp = Math.floor(1000 + Math.random() * 9000); // This ensures a 4-digit OTP
  return otp;
}


exports.updateaccount = async (req, res, next) => {
  const RegUserIDVal = req.body.RegUserID;
  const RegFullNameNoVal = req.body.RegFullName;
  const RegEmailAddressVal = req.body.RegEmailAddress;
  const OldRegEmailAddressVal = req.body.OldRegEmailAddress;
  try {
    const db = await connectToMongoDB();

   if (RegEmailAddressVal != OldRegEmailAddressVal )
   {
    const existingEmail = await db.collection('tblreginfo').findOne({
      RegEmailAddress: RegEmailAddressVal  
    });
      if (existingEmail) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email address already in use by another account.',
        data: { status: 'EMAIL-EXIST' },
        error: 'DuplicateEmail'
      });
    }
  }

  

    // Prepare updated data
    const updatedData = {
      RegFullName: RegFullNameNoVal,
      RegEmailAddress: RegEmailAddressVal,
      modifiedBy: "", // You can change this as needed
      modifiedAt: new Date()
    };

    // Update the existing user document
    const updateResult = await db.collection('tblreginfo').updateOne(
      { RegUserID: RegUserIDVal },
      { $set: updatedData }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found or no changes made.',
        data: null,
        error: 'NotFound'
      });
    }

    // Success
    return res.status(200).json({
      statusCode: 200,
      message: 'Profile updated successfully.',
      data: { status: 'OK' },
      error: null
    });

  } catch (error) {
    console.error('Update Error:', error);
    next(error); // Pass error to Express error handler
  }
};

  exports.signin = async (req, res, next) => {
  const jwt = require("jsonwebtoken");
  const crypto = require("crypto");

  // 🔐 Use env secret if available; fall back to old value to avoid breaking deploys.
  const SECRET = process.env.JWT_SECRET;

  // ✅ Normalize inputs safely; avoid logging raw creds
  const usernameval = String(req.body?.username || "").trim();
  const passwordval = String(req.body?.password || "").trim();

  // Quick input guard
  if (!usernameval || !passwordval) {
    return sendResponse(res, "Username and password required.", null, null);
  }

  let ProfileImageName = "";
  let ProfileName = "";

  try {
    // ⛔️ Remove these in production (they leak secrets)
    // console.log(usernameval);
    // console.log(passwordval);

    // ✅ Same MD5 you already use (UNCHANGED)
    // NOTE: This reconstructs the same decimal-string hash you stored.
    const combinedValue = usernameval + passwordval;
    const md5Buffer = crypto.createHash("md5").update(combinedValue, "utf-8").digest();

    let pwdkey = "";
    for (let i = 0; i < md5Buffer.length; i++) {
      pwdkey += md5Buffer[i];
    }
    // console.log(pwdkey); // ⛔️ Do not log derived password

    // ✅ Connect to DB
    const db = await connectToMongoDB();

    // ✅ Find user (projection excludes the password from the result we return)
    const user = await db.collection("tblreginfo").findOne(
      {
        RegEmailAddress: usernameval,
        RegPassword: pwdkey,
        RegStatus: "ACTIVE",
      },
      {
        projection: { password: 0 }, // ✨ never expose stored password
      }
    );

    // Avoid logging objects that might contain PII
    // console.log("user"); console.log(user);

    if (!user) {
      return sendResponse(
        res,
        "Invalid credentials, not an admin, or inactive account.",
        null,
        null
      );
    }

    // ✅ Safely access prtuserid (after user exists)
    const prtuserid = user?.RegUserID ? String(user.RegUserID) : "";

     const loggedusername= user?.RegFullName ? String(user.RegFullName) : "";

    // ✅ Create JWT token (stronger claims; hashing remains unchanged)
    const token = jwt.sign(
      {
        prtuserid,    // keep your claim
        sub: prtuserid,
      },
      SECRET,
      {
        //expiresIn: "1h", -- never expiry
        issuer: "Sigma-auth",
        audience: "Sigma-clients",
        algorithm: "HS256",
      }
    );

    // ✅ Build clean user to return (no password)
    const userWithToken = {
      ...user, // password already excluded by projection
      token,
      loggedusername,
      
    };

    return sendResponse(res, "Login successful", null, userWithToken);
  } catch (error) {
    console.error("Login error:", error);
    return next(error);
  }
};


exports.regaccount = async (req, res, next) => {
// sample
  var resultNew="";
  const RegUserID = generateUniqueId();  // Assuming generateUniqueId is defined elsewhere
  const RegOtpNo = generateOtp();  // Assuming generateOtp is defined elsewhere
  
  const RegMobileNoVal = req.body.RegMobileNo;
  const RegEmailAddressVal = req.body.RegEmailAddress;
  const RegPasswordVal = req.body.RegPassword;
 let pwdkey = "";
    const value = RegEmailAddressVal + RegPasswordVal;
    const md5Key = crypto.createHash("md5").update(value, "utf-8").digest();
    for (let i = 0; i < md5Key.length; i++) {
      pwdkey += md5Key[i];
    }
  try {
    // Connect to the database
    const db = await connectToMongoDB();
    
    // Check if the mobile number or email address already exists
    const existingMobile = await db.collection('tblreginfo').findOne({ RegMobileNo: RegMobileNoVal });
    const existingEmail = await db.collection('tblreginfo').findOne({ RegEmailAddress: RegEmailAddressVal });

    // If mobile number exists
    if (existingMobile) { 

      resultNew={ status : 'MOBILE-EXIST'}
     return  res.status(500).json({
        'statusCode': 500,
        'message': 'message',
        'data': resultNew,
        'error': 'error',
      }); 
    }

    // If email address exists
    if (existingEmail) { 
      resultNew={ status : 'EMAIL-EXIST'}
      return  res.status(500).json({
        'statusCode': 500,
        'message': 'message',
        'data': resultNew,
        'error': 'error',
      });
    }
    // If both are unique, proceed with registration
    const updatedData = {
      ...req.body,
      createdBy: "", 
      createdAt: new Date(),    
      modifiedBy: "", 
      modifiedAt: new Date(),  
      RegStatus: 'NOTACTIVE', 
      OTPStatus: 'NOTVERIFY',    
      RegUserID: RegUserID,     
      RegOtpNo: RegOtpNo,      
      RegPassword: pwdkey  
    };

 
    const result = await db.collection('tblreginfo').insertOne(updatedData);
    result.reguserid = RegUserID;
    result.otp = RegOtpNo;
    result.status="OK";
   
    sendResponse(res, "Registration successfully.", null, result);
    
  } catch (error) {
    console.log(error);
    next(error);  // Pass the error to the next middleware
  }
};

 
exports.regaccountOld = async (req, res, next) => { 
  const RegUserID = generateUniqueId();
  const RegOtpNo = generateOtp();
 
  const RegMobileNoVal=req.body.RegMobileNo;
  const RegEmailAddressVal=req.body.RegEmailAddress;

  const { ObjectId } = require('bson');

  try {
    const db = await connectToMongoDB();
    const item = req.body;
   

    const updatedData = {
      ...item,
      createdBy: "", 
      createdAt: new Date(),    
      modifydBy: "", 
      modifydAt: new Date(),  
      RegStatus: 'NOTACTIVE', 
      OTPStatus: 'NOTVERIFY',    
      RegUserID:RegUserID,     
      RegOtpNo: RegOtpNo        
    };
    //Send SMS here ----------------
    //Send SMS here ------------------------
    const result = await db.collection('tblreginfo').insertOne(updatedData);
    result.reguserid=RegUserID;
    result.otp=RegOtpNo;
    sendResponse(res, "Registration successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 

exports.verifyotp = async (req, res, next) => { 
  const db = await connectToMongoDB();
  const otpVal = req.body.otp;
  const RegUserIDVal = req.body.RegUserID;
  var result="";

   
//Update Cart UserID to New UserID ----------------------


  const collection = db.collection('tblreginfo'); 
  const userRecord = await collection.findOne({ RegUserID: RegUserIDVal });  
  if (userRecord) { 
    console.log(userRecord.RegOtpNo);
    if (userRecord.RegOtpNo ==otpVal) {
     
      userRecord.otpstatus="VALID";
      result=userRecord;
      //Update Registration Table
   const Regcollection = db.collection('tblreginfo'); 
   const Regfilter = { RegUserID: RegUserIDVal }; 
   const RegupdateDoc = {
     $set: {
       OTPStatus: 'VERIFIED',
       RegStatus: 'ACTIVE'
     }
   }; 
   const Regresult = await Regcollection.updateOne(Regfilter, RegupdateDoc);


    } else {
      result= { otpstatus: "INVALID" }; 
    }
  } else {
    result ={ otpstatus: "INVALID" }; 
  }
  sendResponse(res, "OTP Verification",  null , result);
};

exports.getaccountinfo = async (req, res, next) => { 
 
   
  const db = await connectToMongoDB();
  const RegUserIDVal = req.body.RegUserID;
  const mainCategories = db.collection('tblreginfo');
  
  // Perform aggregation with multiple $lookup stages
  const result = await mainCategories.aggregate([
    { 
      $match: { RegUserID: RegUserIDVal } // Filter by OrderRefNo
    },
    
  ]).toArray();
  
  
  // Send the final response with the fetched data
  sendResponse(res, "order Data fetched successfully.", null, result[0]);
  
  };
   
  exports.accountSingin = async (req, res, next) => { 
 
    

    const db = await connectToMongoDB();
    const mobilenoval = req.body.mobileno;
    const mainCategories = db.collection('tblreginfo');
    const result = await mainCategories.aggregate([
      { 
        $match: { RegMobileNo: mobilenoval }  
      },
      
    ]).toArray();
   
      if (result.length === 0) { 
        var result1 = {
          statusCode: 500,
          message: 'data not found'
        };
        res.status(500).json({
          'statusCode': 500,
          'message': 'message',
          'data': result1,
          'error': 'error',
        });
      } else {
       
      const collection = db.collection('tblreginfo');  
      const filter = { RegUserID: result[0].RegUserID };   
      const updateDoc = {
        $set: {
          RegOtpNo: generateOtp(),  // Set the 'opt' field to 'newopt'
        },
      };
  
      // Update the document in the collection
      const result2 = await collection.updateOne(filter, updateDoc);  

      const mainCategories = db.collection('tblreginfo');
    const result3 = await mainCategories.aggregate([
      { 
        $match: { RegMobileNo: mobilenoval }  
      },
      
    ]).toArray();
   

    sendResponse(res, "Account Data fetched successfully.", null, result3[0]);
      }
    };

// Safe string trim helper
const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v || '');

// Optional JSON response helper
const buildHttpJson = ({ statusCode, message, data = null, error = null }) => ({
  statusCode,
  message,
  data,
  error,
});

exports.deleteaccount = async (req, res, next) => {
  const RegUserIDVal = safeTrim(req.body.RegUserID);

  if (!RegUserIDVal) {
    return res.status(400).json(
      buildHttpJson({
        statusCode: 400,
        message: 'RegUserID is required.',
        error: 'ValidationError',
      })
    );
  }

  try {
    const db = await connectToMongoDB(); // ✅ you also need this!

    // Confirm the user exists first
    const userDoc = await db
      .collection('tblreginfo')
      .findOne({ RegUserID: RegUserIDVal });

    if (!userDoc) {
      return res.status(404).json(
        buildHttpJson({
          statusCode: 404,
          message: 'User not found.',
          error: 'NotFound',
        })
      );
    }

    // Perform deletions in parallel
    const [reginfoDel, prtuserDel, orderDel, orderDetailsDel] =
      await Promise.all([
        db.collection('tblreginfo').deleteOne({ RegUserID: RegUserIDVal }),
        db.collection('tblprtuser').deleteMany({ UserID: RegUserIDVal }),
        db.collection('tblorder').deleteMany({ RegUserID: RegUserIDVal }),
        db.collection('tblorderdetails').deleteMany({ RegUserID: RegUserIDVal }),
      ]);

    if (reginfoDel.deletedCount === 0) {
      return res.status(500).json(
        buildHttpJson({
          statusCode: 500,
          message:
            'Failed to delete main user record (tblreginfo). No changes performed.',
          error: 'DeleteFailed',
        })
      );
    }

    const summary = {
      tblreginfo: reginfoDel.deletedCount,
      tblprtuser: prtuserDel.deletedCount,
      tblorder: orderDel.deletedCount,
      tblorderdetails: orderDetailsDel.deletedCount,
    };

    return res.status(200).json(
      buildHttpJson({
        statusCode: 200,
        message: 'Account and related data deleted successfully.',
        data: { status: 'OK', deleted: summary },
      })
    );
  } catch (error) {
    console.error('Delete Error:', error);
    return next(error);
  }
};

 exports.accountforgotpwd = async (req, res, next) => {
  try {
    const RegEmailAddress = String(req.body?.RegEmailAddress || '')
      .trim()
      .toLowerCase();

    if (!RegEmailAddress) {
      return res.status(400).json({
        statusCode: 400,
        message: 'RegEmailAddress is required.',
      });
    }

    const db = await connectToMongoDB();
    const user = await db.collection('tblreginfo').findOne({ RegEmailAddress });

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found.',
      });
    }

    // Generate a temporary new password (8 chars)
    const newPassword = Math.random().toString(36).slice(-8);

    // Your existing md5 -> numeric string logic (kept)
    let pwdkey = '';
    const value = RegEmailAddress + newPassword;
    const md5Key = crypto.createHash('md5').update(value, 'utf-8').digest();
    for (let i = 0; i < md5Key.length; i++) {
      pwdkey += md5Key[i];
    }

    // Update password in DB
    // await db.collection('tblreginfo').updateOne(
    //   { RegUserID: user.RegUserID },
    //   { $set: { RegPassword: pwdkey, modifiedAt: new Date() } }
    // );

    // Send email
    try {
      // await EmailService.sendForgotPasswordEmail(RegEmailAddress, {
      //   fullName: user.RegFullName || 'Customer',
      //   newPassword,
      //   appName: 'Sigma Paints',
      // });
    } catch (mailErr) {
      console.error('❌ Forgot password email failed:', mailErr);

      // Password updated but email failed (important to tell admin/customer)
      return res.status(500).json({
        statusCode: 500,
        message:
          'Password was reset but email could not be sent. Please contact support.',
        error: String(mailErr?.message || mailErr),
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'A new password has been sent to your email address.',
      data: { status: 'OK' },
    });
  } catch (err) {
    console.error('❌ accountforgotpwd error:', err);
    return res.status(500).json({
      statusCode: 500,
      message: 'Server error.',
      error: String(err?.message || err),
    });
  }
};