const Product = require('../models/Product');
const SoldItem = require('../models/SoldItem'); 
const { uploadImageToCloudinary } = require('../utils/imageUploader'); // Aapka cloudinary utility

exports.addProduct = async (req, res, next) => {
  try {
    const { 
      productName, barcode, price, stock, category, 
      lowestRate, highestRate, color, description, 
      weightKg, weightGrams, totalWeightKg 
    } = req.body;
    const storeId = req.user.storeId;

    let imageUrl = req.body.imageUri || '';

    // AGAR FRONTEND SE IMAGE FILE UPLOAD HOKAR AAYI HAI
    if (req.files && req.files.imageFile) {
      const file = req.files.imageFile;
      const uploadDetails = await uploadImageToCloudinary(file, 'billpe_products');
      imageUrl = uploadDetails.secure_url; // Cloudinary secure URL
    }

    const parsedLowestRate = lowestRate !== undefined && lowestRate !== '' ? Number(lowestRate) : (price !== undefined ? Number(price) : 0);
    const parsedHighestRate = highestRate !== undefined && highestRate !== '' ? Number(highestRate) : parsedLowestRate;
    const parsedPrice = price !== undefined && price !== '' ? Number(price) : parsedLowestRate;

    let product = await Product.findOne({ storeId, barcode });

    if (product) {
      product.productName = productName || product.productName;
      product.price = parsedPrice;
      product.lowestRate = parsedLowestRate;
      product.highestRate = parsedHighestRate;
      product.category = category || product.category;
      product.color = color || product.color;
      product.description = description || product.description;
      product.weightKg = weightKg !== undefined ? Number(weightKg) : product.weightKg;
      product.weightGrams = weightGrams !== undefined ? Number(weightGrams) : product.weightGrams;
      product.totalWeightKg = totalWeightKg !== undefined ? Number(totalWeightKg) : product.totalWeightKg;
      
      if (imageUrl) {
        product.imageUri = imageUrl;
      }
      
      // Stock Reset
      product.stock = stock !== undefined ? Number(stock) : 1;
      product.sold = false;
      product.soldPrice = null;
      product.soldCustomerName = '';
      product.soldCustomerPhone = '';
      product.soldAt = null;

      await product.save();
      await SoldItem.findOneAndDelete({ productId: product._id, storeId });

      return res.serverResponse ? null : res.status(200).json({
        success: true,
        message: "Product reactivated and updated in stock.",
        product
      });
    }

    product = await Product.create({
      storeId,
      productName: productName || 'Unnamed Product',
      barcode,
      price: parsedPrice,
      stock: stock !== undefined ? Number(stock) : 1,
      category: category || 'General',
      lowestRate: parsedLowestRate,
      highestRate: parsedHighestRate,
      color: color || '',
      description: description || '',
      weightKg: weightKg !== undefined ? Number(weightKg) : 0,
      weightGrams: weightGrams !== undefined ? Number(weightGrams) : 0,
      totalWeightKg: totalWeightKg !== undefined ? Number(totalWeightKg) : 0,
      imageUri: imageUrl, // Cloudinary URL yahan save hoga
      sold: false
    });

    res.status(201).json({
      success: true,
      message: "Product added successfully.",
      product
    });
  } catch (error) {
    next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { includeSold } = req.query;
    let filter = { storeId: req.user.storeId };
    
    if (includeSold !== 'true') {
      filter.sold = { $ne: true };
      filter.stock = { $gt: 0 };
    }

    const products = await Product.find(filter).sort({ updatedAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const productId = req.params.id;
    const updateData = req.body;

    if (req.files && req.files.imageFile) {
      const uploadDetails = await uploadImageToCloudinary(req.files.imageFile, 'billpe_products');
      updateData.imageUri = uploadDetails.secure_url;
    }

    if (updateData.sold === false || (updateData.stock !== undefined && updateData.stock > 0)) {
      await SoldItem.findOneAndDelete({ productId, storeId });
    }

    const updated = await Product.findOneAndUpdate(
      { _id: productId, storeId },
      updateData,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Product not found." });
    
    res.json({ success: true, message: "Product updated successfully.", updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const deleted = await Product.findOneAndDelete({ _id: req.params.id, storeId: req.user.storeId });
    if (!deleted) return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    next(error);
  }
};