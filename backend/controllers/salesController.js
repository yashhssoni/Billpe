const SoldItem = require('../models/SoldItem');
const Product = require('../models/Product');
const Store = require('../models/Store');

exports.checkout = async (req, res, next) => {
  try {
    const { cartItems, totalAmount, paymentMode, customerName, customerPhone, employeeName } = req.body;
    const storeId = req.user.storeId;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty." });
    }

    const storeInfo = await Store.findById(storeId);
    const soldEntries = [];

    const finalCustomerName = customerName && customerName.trim() ? customerName.trim() : 'N/A';
    const finalCustomerPhone = customerPhone && customerPhone.trim() ? customerPhone.trim() : 'N/A';
    const finalEmployeeName = employeeName && employeeName.trim() ? employeeName.trim() : (req.user.name || 'Employee');
    const finalPaymentMode = paymentMode || 'Cash';

    for (let item of cartItems) {
      const product = await Product.findOne({ _id: item.productId, storeId });
      
      if (!product || product.sold === true) {
        return res.status(400).json({ 
          success: false, 
          message: `Product already sold: ${item.productName}` 
        });
      }

      const salePrice = Number(item.agreedPrice || item.price || product.price);

      product.sold = true;
      product.soldPrice = salePrice;
      product.soldCustomerName = finalCustomerName;
      product.soldCustomerPhone = finalCustomerPhone;
      product.soldAt = new Date();
      await product.save();

      soldEntries.push({
        storeId,
        productId: product._id,
        productName: product.productName,
        price: salePrice,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        soldBy: req.user.id,
        soldByName: finalEmployeeName,
        paymentMode: finalPaymentMode
      });
    }

    await SoldItem.insertMany(soldEntries);

    res.status(201).json({
      success: true,
      message: "Checkout successful, bill generated.",
      storeInfo,
      billDetails: { 
        items: cartItems, 
        totalAmount, 
        paymentMode: finalPaymentMode, 
        employeeName: finalEmployeeName, 
        date: new Date() 
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSalesHistory = async (req, res, next) => {
  try {
    const sales = await SoldItem.find({ storeId: req.user.storeId })
      .populate('soldBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, sales });
  } catch (error) {
    next(error);
  }
};