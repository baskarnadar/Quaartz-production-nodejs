 const express = require("express");
const router = express.Router();

const { uploadFile, getFileStream } = require("./upload");

const multer = require("multer");

const storage = multer.memoryStorage();

const uploads = multer({ storage }).single("image");

router.post("/uploadImage", uploads, async (req, res) => {
    try {
        console.log("foldername:", req.body.foldername);
        console.log("file:", req.file ? req.file.originalname : "No file");

        if (!req.file) {
            return res.status(400).send({
                status: "error",
                message: "No file uploaded. Please send file field name as image.",
            });
        }

        const result = await uploadFile(req.file, req.body.foldername);

        console.log("Upload response", result);

        return res.status(200).send({
            status: "success",
            message: "File uploaded successfully",
            data: result,
        });
    } catch (error) {
        console.log("Upload error:", error);

        return res.status(500).send({
            status: "error",
            message: "File upload failed",
            error: error.message,
        });
    }
});

router.post("/getUploadedImage", (req, res) => {
    try {
        const key = req.body.key;

        if (!key) {
            return res.status(400).send({
                status: "error",
                message: "Image key is required",
            });
        }

        const readStream = getFileStream(key);
        return readStream.pipe(res);
    } catch (error) {
        console.log("Get image error:", error);

        return res.status(500).send({
            status: "error",
            message: "Failed to get image",
            error: error.message,
        });
    }
});

module.exports = router;