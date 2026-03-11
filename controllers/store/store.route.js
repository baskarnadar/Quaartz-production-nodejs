const store = require("./store.controller");
const express = require("express");
const router = express.Router();

const { protectAPI } = require("../middleware/auth");
router.post("/getStore",protectAPI, store.getStore);
router.post("/createStore", protectAPI,store.createStore);
router.post("/getCityAndStore", protectAPI,store.getCityAndStore);
router.post("/getCityAndStoreSorting", protectAPI,store.getCityAndStoreSorting);
router.post("/getStoreList", protectAPI,store.getStoreList);
router.post("/delStorebyID", protectAPI,store.delStorebyID);
module.exports = router;

