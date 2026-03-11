const { connectToMongoDB } = require("../../../database/mongodb");
const { generateUniqueId } = require("../../../controllers/operation/operation");

// Helper function to send responses
function sendResponse(res, message, error, results, totalCount) {
  res.status(error ? 400 : 200).json({
    statusCode: error ? 400 : 200,
    message,
    data: results,
    error,
    totalCount,
  });
}

exports.getmainmenulist = async (req, res, next) => {
  const ImageVal = process.env.IMAGEURL;  
  try {
    const { page = 1, limit = 5 } = req.body;

    const db = await connectToMongoDB();
    const collection = db.collection("tblmainmenu");

    const skip = (page - 1) * limit;

    const mainmenus = await collection.aggregate([
      {
        $project: {
          MainMenuID: 1,
          mainmenuImage: 1,
          ArMenuName:1,
          EnMenuName:1,
           
        },
      },
      { $sort: { CreatedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]).toArray();

    const totalCount = await collection.countDocuments();

    sendResponse(res, "mainmenus found.", null, mainmenus, totalCount);
  } catch (error) {
    console.error("Error in getmainmenuList:", error);
    next(error);
  }
};


exports.getmainmenu = async (req, res, next) => {
  const ImageVal = process.env.IMAGEURL;  
  try {
    const { MainMenuID } = req.body;

    if (!MainMenuID) {
      return res.status(400).json({ success: false, message: "MainMenuID is required" });
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblmainmenu");

    const mainmenu = await collection.findOne({ MainMenuID });

    if (!mainmenu) {
      return res.status(404).json({ success: false, message: "mainmenu not found" });
    }

    // Add computed image URL
    mainmenu.mainmenuImageUrl = ImageVal + "mainmenu/" + mainmenu.mainmenuImage;

    sendResponse(res, "mainmenu found.", null, mainmenu, 1);
  } catch (error) {
    console.error("Error in getmainmenuByID:", error);
    next(error);
  }
};


exports.createmainmenu = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const mainmenuItem = {
      MainMenuID: generateUniqueId(),
      ArMenuName: req.body.ArMenuName,
      EnMenuName: req.body.EnMenuName,
      CreatedAt: new Date(),
      CreatedDate: new Date(),
      ModifyAt: new Date(),
      ModifyDate: new Date(),
      IsDataStatus:1,
    };

    const result = await db.collection('tblmainmenu').insertOne(mainmenuItem);

    sendResponse(res, "mainmenu inserted successfully.", null, result, null);
  } catch (error) {
    console.error("Error in createmainmenu:", error);
    next(error);
  }
};

 exports.updatemainmenu = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tblmainmenu');

    const { MainMenuID, EnMenuName, ArMenuName } = req.body;

    if (!MainMenuID) {
      return res.status(400).json({ success: false, message: "MainMenuID is required" });
    }

    const updateFields = {
      ModifyAt: new Date(),
      ModifyDate: new Date(),
    };

    // Add fields if they exist
    if (EnMenuName) updateFields.EnMenuName = EnMenuName;
    if (ArMenuName) updateFields.ArMenuName = ArMenuName;

    const updateResult = await collection.updateOne(
      { MainMenuID },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No mainmenu found to update" });
    }

    return res.status(200).json({ success: true, message: "Main menu updated successfully" });
  } catch (error) {
    console.error("Update mainmenu Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

 exports.deletemainmenu = async (req, res, next) => {
  const { MainMenuID } = req.body;

  if (!MainMenuID) {
    return sendResponse(res, "MainMenuID is required", null, null, 400);
  }

  try {
    const db = await connectToMongoDB();

    // Delete related submenu items first
    await db.collection('tblsubmenu').deleteMany({ MainMenuID });

    // Delete main menu item
    await db.collection('tblmainmenu').deleteOne({ MainMenuID });

    return sendResponse(res, "Main menu and related submenus deleted successfully", null, null, 200);
  } catch (error) {
    console.error("Error in deletemainmenu:", error);
    return sendResponse(res, "Internal Server Error", null, error.message, 500);
  }
};

