const { connectToMongoDB } = require("../../database/mongodb");
const crypto = require('crypto');
 
 
 
const { v4: uuidv4 } = require('uuid');
// Helper function to send responses
function sendResponse(res, message, error, results) {
  res.status(error ? 400 : 200).json({
    'statusCode': error ? 400 : 200,
    'message': message,
    'data': results,
    'error': error,
  });
}

exports.getuserall = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const items = await db.collection('tblprtuser').find().toArray();
    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
 

 exports.getUser = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const { UserID } = req.body;

    if (!UserID) {
      return sendResponse(res, "UserID is required.", true);
    }

    const user = await db.collection('tblprtuser').findOne({ UserID });

    if (!user) {
      return sendResponse(res, "User not found.", true);
    }

    sendResponse(res, "User fetched successfully.", null, user);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
exports.deleteUser = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const { UserID } = req.body;

    if (!UserID) {
      return sendResponse(res, "UserID is required.", true);
    }

    const result = await db.collection('tblprtuser').deleteOne({ UserID });

    if (result.deletedCount === 0) {
      return sendResponse(res, "User not found or already deleted.", true);
    }

    sendResponse(res, "User deleted successfully.", null, result);
  } catch (error) {
    console.error(error);
    next(error);
  }
};


 function generateUniqueId() { 
    length=25; 
  const uuid = uuidv4().replace(/-/g, '');
  return uuid.substring(0, length); 
}

exports.createUser = async (req, res, next) => {
    const UserFullNameVal = req.body.UserFullName; 
    const usernameVal = req.body.username; 
    const passwordVal=req.body.password; 
    const UserTypeVal = req.body.UserType; 
    var pwdkey ="";
   
    var value = usernameVal + passwordVal;
    let md5Key = crypto.createHash('md5').update(value, 'utf-8').digest();
    //md5KeyVal = Buffer.concat([md5Key]);
    console.log(md5Key.length);
    for (let i = 0; i < md5Key.length; i++) {
    pwdkey += md5Key[i];
    }
     
    const Useritem = {
      UserFullName :UserFullNameVal,
      UserName :usernameVal,
      PassKey :pwdkey,
      UserID :generateUniqueId(),
      UserStatus: 'ACTIVE',
      UserType:UserTypeVal,
      CreatedAt: new Date(),
      ModifiedAt: new Date()
    };
       

  try {
    const db = await connectToMongoDB(); 
    const result = await db.collection('tblprtuser').insertOne(Useritem);
    sendResponse(res, "User inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
// adjust path as needed

exports.isUserValid = async (req, res, next) => {
 
 const jwt = require('jsonwebtoken');
const SECRET =process.env.JWT_SECRET;
 const usernameVal = req.body.username;
  const passwordVal = req.body.password;

  try {
    // ✅ Generate MD5 hash (same as your logic)
    const combinedValue = usernameVal + passwordVal;
    const md5Buffer = crypto.createHash('md5').update(combinedValue, 'utf-8').digest();

    let pwdkey = '';
    for (let i = 0; i < md5Buffer.length; i++) {
      pwdkey += md5Buffer[i];
    }

     

    // ✅ Connect to DB
    const db = await connectToMongoDB();

    // ✅ Query user by username, pwdkey, and active status
    const user = await db.collection('tblprtuser').findOne({
      UserName: usernameVal,
      PassKey: pwdkey,
      UserStatus: 'ACTIVE',
    });
const token = jwt.sign({ userId: user.UserID }, SECRET, { expiresIn: '1d' });

 const userWithToken = {
        ...user,
        token,
      };

    // ✅ If user found
    if (user) {
      sendResponse(res, 'Login successful',  null,userWithToken);
    } else {
      sendResponse(res, 'Invalid credentials or inactive account.', null, null);
    }
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};
