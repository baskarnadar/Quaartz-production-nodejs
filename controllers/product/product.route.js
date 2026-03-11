const product = require("./product.controller");
const productcategory = require("./product.category.controller");
const express = require("express");
const router = express.Router();
 const { protectAPI } = require("../middleware/auth");

router.post("/getMainandSubCategories", protectAPI,productcategory.getMainandSubCategories);
 

//Product Category -- route
router.post("/createProductCategory", protectAPI,productcategory.createProductCategory);
router.post("/getProductCategory",protectAPI, productcategory.getProductCategory);

router.post("/createProductSubCategory",protectAPI, productcategory.createProductSubCategory);
router.post("/getProductSubCategory",protectAPI, productcategory.getProductSubCategory);



//Product  -- route 
router.post("/createProduct", protectAPI,product.createProduct);
router.post("/getProduct",protectAPI, product.getProduct);
//router.post("/getProductByProductID", product.getProductByProductID);
router.post("/getAllProductsList",protectAPI, product.getAllProductsList);
router.post("/getProductByColor", protectAPI,product.getProductByColor);

//Product  -- route 
router.post("/createProduct",protectAPI, product.createProduct);
router.get("/getProduct", protectAPI,product.getProduct);
router.post("/getProductByProductID",protectAPI, product.getProductByProductID);
router.post("/getcategoryproductlist",protectAPI, product.getcategoryproductlist);

//Spec  -- route 
router.post("/createProductSpec", protectAPI,product.createProductSpec);
router.post("/getProductSpec", protectAPI,product.getProductSpec);


//Color Product
router.post("/createProductColor", protectAPI,product.createProductColor);
router.get("/getProductColor", protectAPI,product.getProductColor);


//  Product Size
router.post("/getProductSizeAll",protectAPI, product.getProductSizeAll);
router.post("/getProductSize", protectAPI,product.getProductSize);
router.post("/createProductSize",protectAPI, product.createProductSize);

router.post("/updateProductID", protectAPI,product.updateProductID);
router.post("/delproductByID", protectAPI,product.delproductByID);

module.exports = router;

