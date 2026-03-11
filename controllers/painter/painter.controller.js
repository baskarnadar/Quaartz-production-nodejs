const { connectToMongoDB } = require("../../database/mongodb");
const { generateUniqueId } = require("../../controllers/operation/operation");
const crypto = require('crypto');
// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'data': results,
    'error': error,
  });
} 
 exports.getpainterlist = async (req, res, next) => {
  try {
    const PainterImageVal = process.env.PainterImageUrl ;
    const db = await connectToMongoDB();

    const paintersCollection = db.collection('tblpainterinfo');

    const pipeline = [
      {
        $lookup: {
          from: 'tblprtuser',
          localField: 'PrtUserID',
          foreignField: 'UserID',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          PrtUserID: 1,
          PtrFullName: 1,
          PtrAddress: 1,
          PtrLocation: 1,
          PtrMobileNo: 1,
          PtrIDNumber: 1,
          Photo: 1,
          PtrIDCopy: 1,
          PtrImage :1,
          PtrAgreementFrom: 1,
          PtrAgreementTo: 1,
          PtrTermsAndCondition: 1,
          PtrPaymentMode: 1,
          PtrIBAN: 1,
          createdDateat: 1,
          UserStatus: '$userInfo.UserStatus' // Add UserStatus from tblprtuser
        }
      },
      {
        $sort: { createdDateat: -1 }
      }
    ];

    const result = await paintersCollection.aggregate(pipeline).toArray();

    const updatedResult = result.map(painter => ({
      ...painter,
      PtrImageUrl: painter.PtrImage ? PainterImageVal + painter.PtrImage : null,
       PtrIDCopyUrl: painter.PtrIDCopy ? PainterImageVal + painter.PtrIDCopy : null,
    }));

    sendResponse(res, 'Painter list fetched successfully.', null, updatedResult);
  } catch (err) {
    console.error('Error fetching painter list:', err);
    sendResponse(res, 'Failed to fetch painter list.', err);
  }
};


 exports.getPainterInfo = async (req, res, next) => {
  try {
    const PainterImageVal = process.env.PainterImageUrl ;
    const db = await connectToMongoDB();

    const paintersCollection = db.collection('tblpainterinfo');

    // Get PrtUserID from request body
    const { PrtUserID } = req.body;

    // Aggregation pipeline
    const pipeline = [
      {
        $match: PrtUserID ? { PrtUserID } : {}  // Match by PrtUserID if provided
      },
      {
        $lookup: {
          from: 'tblprtuser',
          localField: 'PrtUserID',
          foreignField: 'UserID',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          PrtUserID: 1,
          PtrFullName: 1,
          PtrAddress: 1,
          PtrLocation: 1,
          PtrMobileNo: 1,
          PtrIDNumber: 1,
          Photo: 1,
          PtrImage:1,
          PtrIDCopy: 1,
          PtrAgreementFrom: 1,
          PtrAgreementTo: 1,
          PtrTermsAndCondition: 1,
          PtrPaymentMode: 1,
          PtrIBAN: 1, 
          createdDateat: 1,
          UserStatus: '$userInfo.UserStatus'  // Include UserStatus from tblprtuser
        }
      },
      {
        $sort: { createdDateat: -1 }
      }
    ];

    const result = await paintersCollection.aggregate(pipeline).toArray();

    // Add full photo path
    const updatedResult = result.map(painter => ({
      ...painter,
      PtrImageUrl: painter.PtrImage ? PainterImageVal + painter.PtrImage : null,
       PtrIDCopyUrl: painter.PtrIDCopy ? PainterImageVal + painter.PtrIDCopy : null,
    }));


    sendResponse(res, 'Painter info fetched successfully.', null, updatedResult);
  } catch (err) {
    console.error('Error fetching painter info:', err);
    sendResponse(res, 'Failed to fetch painter info.', err);
  }
};

 
 exports.createPainter = async (req, res, next) => {
  try {
    const PainterPhotoVal = process.env.IMAGEURL + 'painter/';
    const db = await connectToMongoDB();
    const paintersCollection = db.collection('tblpainterinfo');
    var PrtUserIDVal=generateUniqueId();
    // Destructure data from request body
    const {
       
         PtrFullName,
          PtrAddress,
          PtrLocation,
          PtrMobileNo,
          PtrIDNumber,
          PtrImage,
          PtrIDCopy,
          PtrAgreementFrom,
          PtrAgreementTo,
          PtrTermsAndCondition,
          PtrPaymentMode,
          PtrIBAN,
          
          createdBy,
          updatedBy,
          IsDataStatus,
    } = req.body;

    // Insert into MongoDB
    const insertResult = await paintersCollection.insertOne({
        PrtUserID: PrtUserIDVal,
      PtrFullName,
          PtrAddress,
          PtrLocation,
          PtrMobileNo,
          PtrIDNumber,
          PtrImage: PtrImage || '',   
          PtrIDCopy: PtrIDCopy || '',   
          PtrAgreementFrom,
          PtrAgreementTo,
          PtrTermsAndCondition,
          PtrPaymentMode,
          PtrIBAN,
          
      createdBy: createdBy || 'SYSTEM',
      updatedBy: updatedBy || 'SYSTEM',
      IsDataStatus: IsDataStatus ?? 1,
      createdat: new Date(), 
      modifiedAt: new Date()
    });

    if (!insertResult.acknowledged) {
      return sendResponse(res, 'Failed to insert painter.', 'Insert failed', null);
    }


    // Isert UseriD in the User Table------------------------------- Begin
   
    
        const usernameVal = req.body.PtrMobileNo; 
        const passwordVal=req.body.PtrMobileNo; 
        var pwdkey ="";
       
        var value = usernameVal + passwordVal;
        let md5Key = crypto.createHash('md5').update(value, 'utf-8').digest();
        //md5KeyVal = Buffer.concat([md5Key]);
        console.log(md5Key.length);
        for (let i = 0; i < md5Key.length; i++) {
        pwdkey += md5Key[i];
        }
         
        const Useritem = {
        UserName :usernameVal,
        PassKey :pwdkey,
        UserID :PrtUserIDVal,
        UserStatus: 'ACTIVE',
        UserType:'PAINTER'
    
        };
           
    
      try {
        const db = await connectToMongoDB(); 
        const result = await db.collection('tblprtuser').insertOne(Useritem);
         
      } catch (error) {
        console.log(error);
        next(error);
      }
     
    //useriD in the user Table ---------------------------------------End

    // Return updated list (optional)
    const result = await paintersCollection.find({}).sort({ createdDateat: -1 }).toArray();

    const updatedResult = result.map((painter) => ({
      ...painter,
      Photo: painter.Photo ? PainterPhotoVal + painter.Photo : null,
      IDCopy: painter.IDCopy ? PainterPhotoVal + painter.IDCopy : null,
    }));

    sendResponse(res, 'Painter added successfully.', null, updatedResult);
  } catch (err) {
    console.error('Error creating painter:', err);
    sendResponse(res, 'Failed to create painter.', err);
  }
};


exports.updateAccStatus = async (req, res, next) => {
  try {
    const { UserID, UserStatus } = req.body;

    if (!UserID || !UserStatus) {
      return sendResponse(res, 'UserID and UserStatus are required.', 'ValidationError');
    }

    const db = await connectToMongoDB();
    const userCollection = db.collection('tblprtuser');

    const updateResult = await userCollection.updateOne(
      { UserID },
      { $set: { UserStatus } }
    );

    if (updateResult.matchedCount === 0) {
      return sendResponse(res, 'No user found with the provided UserID.', 'NotFound');
    }

    sendResponse(res, 'Account status updated successfully.', null);
  } catch (err) {
    console.error('Error updating account status:', err);
    sendResponse(res, 'Failed to update account status.', err);
  }
};

 