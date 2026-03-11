const mongoose = require('mongoose');

// Define the schema
const productColorSchema = new mongoose.Schema({
  PrdColorCodeID: { type: String, required: true },    // Color Code ID
  ProductID: { type: String, required: true },         // Product ID
  EnPrdColorName: { type: String, required: true },    // English color name
  ArPrdColorName: { type: String, required: true },    // Arabic color name
  PrdColorType: { type: String, required: true },      // Color type (e.g., primary, secondary)
  createdBy: { type: String, required: true },         // Created by user ID
  updatedBy: { type: String, required: true },         // Updated by user ID
  IsDataStatus: { type: Boolean, default: true },      // Data status (active/inactive)
  PrdColorCode: { type: String, required: true },      // Color code (hex, rgb, etc.)
}, { timestamps: true });

// Create the model
const ProductColor = mongoose.model('ProductColor', productColorSchema);

module.exports = ProductColor;
