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

exports.getStore = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const items = await db.collection('tblStore').find().toArray();
    sendResponse(res, "Data fetched successfully .", null , items);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
exports.OLDgetCityAndStore = async (req, res, next) => {
   
    const db = await connectToMongoDB();
    

 
 
    try {
    ;

        // Get references to the collections
       
        const cityCollection = db.collection("tblcity");
        const storeInfoCollection = db.collection("tblstoreinfo");

        // Aggregation query to get cities and related stores
        const result = await cityCollection.aggregate([
            {
                // Lookup the stores related to each city based on CityID
                $lookup: {
                    from: "tblstoreinfo", // The collection to join with
                    localField: "CityID", // The field from TblCity to match
                    foreignField: "CityID", // The field from TblStoreInfo to match
                    as: "substoreinfos" // The new field to store the matching stores
                }
            },
            {
                // Project the fields we want in the final result
                $project: {
                    CityID: 1, // Include CityID from TblCity
                    EnCityName: 1, // Include English city name
                    ArCityName: 1, // Include Arabic city name
                    substoreinfos: 1 // Include the subarray of stores (substoreinfos)
                }
            }
        ]).toArray();

        sendResponse(res, "Data fetched successfully .", null , result);
        // Output the result
        console.log(result);
    } catch (error) {
      sendResponse(res, "Error", null , null);
    } finally {
        // Close the MongoDB client
      
    }
 

 

};

 
  // // Helper function to calculate the distance using the Haversine formula


exports.WorkinggetCityAndStore = async (req, res, next) => {
  const db = await connectToMongoDB();

  // Get the current location's latitude and longitude from the request
  const { currentLat, currentLon } = req.body;  // Assuming these values are passed in the request body

  try {
      const storeInfoCollection = db.collection("tblstoreinfo");

      // Fetch all cities and related stores (this part is assumed, if needed you can join the data like before)
      const result = await storeInfoCollection.find({}).toArray(); // Adjust this query if you need cities or other filtering

      // Iterate over each store and calculate the distance
      const updatedResult = result.map(store => {
          const { StoreLatitude, StoreLongitude } = store;

          // Ensure StoreLatitude and StoreLongitude exist and are valid numbers
          if (StoreLatitude && StoreLongitude && !isNaN(StoreLatitude) && !isNaN(StoreLongitude)) {
              // Calculate distance between current location and store's location
              const distance = calculateDistance(currentLat, currentLon, StoreLatitude, StoreLongitude);
              const roundedDistance = Math.round(distance); // Round the distance to the nearest integer

              // Add the calculated distance to the store object
              return {
                  ...store,
                  distance: roundedDistance // Store the rounded distance
              };
          } else {
              // If no valid coordinates, set distance to null
              return {
                  ...store,
                  distance: null
              };
          }
      });

      // Now, sort stores by the distance in ascending order
      updatedResult.sort((a, b) => {
          // Ensure that null distances are placed last
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;  // Ascending order by distance
      });

      // Send the response with updated result
      sendResponse(res, "Data fetched successfully.", null, updatedResult);
  } catch (error) {
      sendResponse(res, "Error", null, null);
      console.error(error);
  } finally {
      // Connection cleanup (handled by the DB connection manager)
  }
};
 
 
exports.getCityAndStore = async (req, res, next) => {
  const db = await connectToMongoDB();

  // Get the current location's latitude and longitude from the request
  const { currentLat, currentLon } = req.body;  // Assuming these values are passed in the request body

  try {
      // Get references to the collections
      const cityCollection = db.collection("tblcity");
      const storeInfoCollection = db.collection("tblstoreinfo");

      // Aggregation query to get cities and related stores
      const result = await cityCollection.aggregate([
          {
              // Lookup the stores related to each city based on CityID
              $lookup: {
                  from: "tblstoreinfo", // The collection to join with
                  localField: "CityID", // The field from TblCity to match
                  foreignField: "CityID", // The field from TblStoreInfo to match
                  as: "substoreinfos" // The new field to store the matching stores
              }
          },
          {
              // Project the fields we want in the final result
              $project: {
                  CityID: 1, // Include CityID from TblCity
                  EnCityName: 1, // Include English city name
                  ArCityName: 1, // Include Arabic city name
                  substoreinfos: 1 // Include the subarray of stores (substoreinfos)
              }
          }
      ]).toArray();

      // Iterate over each city and calculate the distance for each store
      const updatedResult = result.map(city => {
          const { substoreinfos } = city;
          // For each store in the city, calculate the distance
          city.substoreinfos = substoreinfos.map(store => {
              const { StoreLatitude, StoreLongitude } = store;

              // Ensure StoreLatitude and StoreLongitude exist and are valid numbers
              if (StoreLatitude && StoreLongitude && !isNaN(StoreLatitude) && !isNaN(StoreLongitude)) {
                  // Calculate distance between current location and store's location
                  const distance = calculateDistance(currentLat, currentLon, StoreLatitude, StoreLongitude);
                  // Convert distance to an integer (you can use Math.round() or Math.floor())
                  return {
                      ...store,
                      distance: Math.round(distance) // Convert distance to an integer
                  };
              } else {
                  // If no valid coordinates, set distance to null or a default value
                  return {
                      ...store,
                      distance: null
                  };
              }
          });

          // Remove stores without a valid distance (distance !== null)
          city.substoreinfos = city.substoreinfos.filter(store => store.distance !== null);
         // console.log("Before Sorting:", city.substoreinfos);
          // Sort the substoreinfos array by distance (ascending order)
          city.substoreinfos.sort((a, b) => a.distance - b.distance);  // Ascending order by distance
        
          
         // console.log("After Sorting:", city.substoreinfos);

          return city;
      });

      // Send the response with updated result
      sendResponse(res, "Data fetched successfully.", null, updatedResult);
     // console.log(updatedResult);
  } catch (error) {
      sendResponse(res, "Error", null, null);
      console.error(error);
  } finally {
      // Close the MongoDB client (or connection will be handled by the DB connection manager)
  }
};

exports.getStoreList = async (req, res, next) => {
  const db = await connectToMongoDB();

  try {
    const storeInfoCollection = db.collection("tblstoreinfo");

    const result = await storeInfoCollection.aggregate([
      {
        $lookup: {
          from: "tblcity",             
          localField: "CityID",        
          foreignField: "CityID",      
          as: "cityDetails"
        }
      },
      {
        $unwind: {
          path: "$cityDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          storeInfo: "$$ROOT",
          EnCityName: "$cityDetails.EnCityName",
          ArCityName: "$cityDetails.ArCityName"
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$storeInfo", { EnCityName: "$EnCityName", ArCityName: "$ArCityName" }]
          }
        }
      },
      {
        $sort: { createdat: -1 }  // 👈 Sort by createdat descending
      }
    ]).toArray();

    sendResponse(res, "Data fetched successfully.", null, result);
  } catch (error) {
    console.error(error);
    sendResponse(res, "Error", error.message, null);
  }
};



exports.getCityAndStoreSorting = async (req, res, next) => {
    const db = await connectToMongoDB();
  
    // Get the current location's latitude, longitude, and sorting preference from the request
    const { currentLat, currentLon, soryby } = req.body;  // Assuming these values are passed in the request body
  
    try {
      const storeInfoCollection = db.collection("tblstoreinfo");
      const cityCollection = db.collection("tblcity");
  
      // Aggregation query to join tblstoreinfo with tblcity based on CityID
      let query = [
        {
          // Lookup to join the tblcity collection to get city names
          $lookup: {
            from: "tblcity", // The collection to join with
            localField: "CityID", // The field from tblstoreinfo to match
            foreignField: "CityID", // The field from tblcity to match
            as: "city_info" // The field to store the matched city info
          }
        },
        {
          // Unwind the city_info array to flatten it
          $unwind: {
            path: "$city_info",
            preserveNullAndEmptyArrays: true // If no city match, keep the store without city info
          }
        },
        {
          // Project the fields you want, including the city info and store details
          $project: {
            StoreID: 1,
            StoreName: 1,
            EnStoreName: 1,
            ArStoreName: 1,
            StoreLatitude: 1,
            StoreLongitude: 1,
            StoreGoogleMapLink: 1,
            StoreAdress: 1,
            CityID: 1,
            // Move EnCityName to the upper root level
            EnCityName: "$city_info.EnCityName", // English city name from tblcity
            ArCityName: "$city_info.ArCityName", // Arabic city name from tblcity
            distance: 1 // Distance will be calculated in the next steps
          }
        }
      ];
  
      // Execute the aggregation query
      const result = await storeInfoCollection.aggregate(query).toArray();
  
      // Iterate over each store and calculate the distance
      const updatedResult = result.map(store => {
        const { StoreLatitude, StoreLongitude } = store;
  
        // Ensure StoreLatitude and StoreLongitude exist and are valid numbers
        if (StoreLatitude && StoreLongitude && !isNaN(StoreLatitude) && !isNaN(StoreLongitude)) {
          // Calculate distance between current location and store's location
          const distance = calculateDistance(currentLat, currentLon, StoreLatitude, StoreLongitude);
          const roundedDistance = Math.round(distance); // Round the distance to the nearest integer
  
          // Add the calculated distance to the store object
          return {
            ...store,
            distance: roundedDistance // Store the rounded distance
          };
        } else {
          // If no valid coordinates, set distance to null
          return {
            ...store,
            distance: null
          };
        }
      });
  
      // Now, sort stores by the distance in ascending or descending order
      updatedResult.sort((a, b) => {
        // Ensure that null distances are placed last
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        if (soryby === 'ASC') return a.distance - b.distance; // Ascending order
        if (soryby === 'DESC') return b.distance - a.distance; // Descending order
        return a.distance - b.distance; // Default: Ascending order by distance
      });
  
      // Send the response with updated result
      sendResponse(res, "Data fetched successfully.", null, updatedResult);
  
    } catch (error) {
      sendResponse(res, "Error", null, null);
      console.error(error);
    } finally {
      // Connection cleanup (handled by the DB connection manager)
    }
};

  
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }


exports.createStore = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const storeitem = req.body;
  const result = await db.collection('tblstoreinfo').insertOne({
      ...storeitem,
      StoreID: generateUniqueId(), // ✅ Add StoreID using UUID
    });
    sendResponse(res, "store inserted successfully.",  null , result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.delStorebyID = async (req, res, next) => {
  try {
    const db = await connectToMongoDB();
    const { StoreID } = req.body;  // Assuming StoreID comes from URL params
console.log('StoreID');
console.log(StoreID);
    if (!StoreID) {
      return sendResponse(res, "StoreID is required", "Missing StoreID", null);
    }

    const result = await db.collection('tblstoreinfo').deleteOne({ StoreID });
console.log('result.deletedCount');
console.log(result.deletedCount);
    if (result.deletedCount === 0) {
      return sendResponse(res, "No store found with the provided StoreID", null, null);
    }

    sendResponse(res, "Store deleted successfully.", null, result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
