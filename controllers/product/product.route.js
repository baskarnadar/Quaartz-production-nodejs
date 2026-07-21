const product = require("./product.controller");
const productcategory = require("./product.category.controller");
const express = require("express");
const router = express.Router();
const { protectAPI } = require("../middleware/auth");

// ✅ Product Category
router.post("/createProductCategory", protectAPI, productcategory.createProductCategory);
router.post("/updateProductCategory", protectAPI, productcategory.updateProductCategory);
router.post("/getProductCategory", protectAPI, productcategory.getProductCategory);

// ✅ Sub Category
router.post("/createProductSubCategory", protectAPI, productcategory.createProductSubCategory);
router.post("/getProductSubCategory", protectAPI, productcategory.getProductSubCategory);

// ✅ Product
router.post("/createProduct", protectAPI, product.createProduct);
router.post("/getProduct", protectAPI, product.getProduct);
router.post("/getAllProductsList", protectAPI, product.getAllProductsList);
router.post("/getProductByColor", protectAPI, product.getProductByColor);
router.post("/getProductByProductID",  product.getProductByProductID);

// ✅ Other
router.post("/getcategoryproductlist", product.getcategoryproductlist);
router.post("/createProductSpec", protectAPI, product.createProductSpec);
router.post("/getProductSpec",  product.getProductSpec);
router.post("/createProductColor", protectAPI, product.createProductColor);
router.get("/getProductColor", protectAPI, product.getProductColor);
router.post("/getProductSizeAll", protectAPI, product.getProductSizeAll);
router.post("/getProductSize", protectAPI, product.getProductSize);
router.post("/createProductSize", protectAPI, product.createProductSize);
router.post("/updateProductID", protectAPI, product.updateProductID);
router.post("/delproductByID", protectAPI, product.delproductByID);

router.post("/addproductimage", protectAPI, product.addproductimage);
router.post("/delproductimage", protectAPI, product.delproductimage);
router.post("/getproductimage", protectAPI, product.getproductimage);
module.exports = router;