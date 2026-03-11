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
 exports.getsubmenulist = async (req, res, next) => {
  try {
    const { page = 1, limit = 5 } = req.body;

    const db = await connectToMongoDB();
    const collection = db.collection("tblsubmenu");

    const skip = (page - 1) * limit;

    const submenus = await collection.aggregate([
      // Join with tblmainmenu to get main menu details
      {
        $lookup: {
          from: "tblmainmenu",               // The other collection
          localField: "MainMenuID",          // Field in tblsubmenu
          foreignField: "MainMenuID",        // Matching field in tblmainmenu
          as: "mainMenuInfo"                 // Resulting array field
        }
      },
      {
        $unwind: {
          path: "$mainMenuInfo",
          preserveNullAndEmptyArrays: true   // In case no match found
        }
      },
      {
        $project: {
          SubMenuID: 1,
          MainMenuID: 1,
          ArMenuName: 1,
          EnMenuName: 1,
          MenuLinkFileName: 1,
          PageID: 1, 
          MainMenuName: "$mainMenuInfo.EnMenuName", // Optional: English name too
        }
      },
      { $sort: { CreatedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]).toArray();

    const totalCount = await collection.countDocuments();

    sendResponse(res, "Submenus found.", null, submenus, totalCount);
  } catch (error) {
    console.error("Error in getsubmenulist:", error);
    next(error);
  }
};


exports.getsubmenu = async (req, res, next) => {
  const ImageVal = process.env.IMAGEURL;  
  try {
    const { SubMenuID } = req.body;

    if (!SubMenuID) {
      return res.status(400).json({ success: false, message: "SubMenuID is required" });
    }

    const db = await connectToMongoDB();
    const collection = db.collection("tblsubmenu");

    const submenu = await collection.findOne({ SubMenuID });

    if (!submenu) {
      return res.status(404).json({ success: false, message: "submenu not found" });
    }

    // Add computed image URL
    submenu.submenuImageUrl = ImageVal + "submenu/" + submenu.submenuImage;

    sendResponse(res, "submenu found.", null, submenu, 1);
  } catch (error) {
    console.error("Error in getsubmenuByID:", error);
    next(error);
  }
};


exports.createsubmenu = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();

    const submenuItem = {
      SubMenuID: generateUniqueId(),
      MainMenuID:req.body.MainMenuID,
      ArMenuName: req.body.ArMenuName,
      EnMenuName: req.body.EnMenuName, 
      MenuLinkFileName:req.body.MenuLinkFileName,
      PageID:req.body.PageID,
      CreatedAt: new Date(),
      CreatedDate: new Date(),
      ModifyAt: new Date(),
      ModifyDate: new Date(),
      IsDataStatus:req.body.IsDataStatus,
    };

    const result = await db.collection('tblsubmenu').insertOne(submenuItem);

    sendResponse(res, "submenu inserted successfully.", null, result, null);
  } catch (error) {
    console.error("Error in createsubmenu:", error);
    next(error);
  }
};

 exports.updatesubmenu = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection('tblsubmenu');

    const { SubMenuID, EnMenuName, ArMenuName } = req.body;

    if (!SubMenuID) {
      return res.status(400).json({ success: false, message: "SubMenuID is required" });
    }

    const updateFields = {
      MainMenuID:req.body.MainMenuID,
      ArMenuName: req.body.ArMenuName,
      EnMenuName: req.body.EnMenuName, 
      MenuLinkFileName:req.body.MenuLinkFileName,
      PageID:req.body.PageID,
      ModifyAt: new Date(),
      ModifyDate: new Date(),
    };

    
    const updateResult = await collection.updateOne(
      { SubMenuID },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "No submenu found to update" });
    }

    return res.status(200).json({ success: true, message: "Main menu updated successfully" });
  } catch (error) {
    console.error("Update submenu Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deletesubmenu = async (req, res, next) => {
  const { SubMenuID } = req.body;

  if (!SubMenuID) {
    return sendResponse(res, "SubMenuID is required", null, null, 400);
  }

  try {
    const db = await connectToMongoDB();

    // If you want to add any check to prevent deletion, e.g. check if submenu is referenced in other collections,
    // you can add it here. For now, just delete.

    await db.collection('tblsubmenu').deleteOne({ SubMenuID });

    return sendResponse(res, "submenu deleted successfully", null, null, 200);
  } catch (error) {
    console.error("Error in deletesubmenu:", error);
    return sendResponse(res, "Internal Server Error", null, error.message, 500);
  }
};
