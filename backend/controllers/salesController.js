const SoldItem = require('../models/SoldItem');
const Product = require('../models/Product');
const Store = require('../models/Store');

exports.checkout = async (req, res, next) => {
  try {
    const { cartItems, totalAmount, paymentMode, customerName, customerPhone, customerAddress, employeeName, invoiceNo } = req.body;
    const storeId = req.user.storeId;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty." });
    }

    const generatedInvoiceNo = invoiceNo || `BP-${Date.now().toString().slice(-6)}`;
    const storeInfo = await Store.findById(storeId);
    const soldEntries = [];

    const finalCustomerName = customerName && customerName.trim() ? customerName.trim() : 'N/A';
    const finalCustomerPhone = customerPhone && customerPhone.trim() ? customerPhone.trim() : 'N/A';
    const finalCustomerAddress = customerAddress && customerAddress.trim() ? customerAddress.trim() : 'N/A';
    const finalEmployeeName = employeeName && employeeName.trim() ? employeeName.trim() : (req.user.name || 'Employee');
    const finalPaymentMode = paymentMode || 'Cash';

    for (let item of cartItems) {
      const product = await Product.findOne({ _id: item.productId, storeId });
      const requestedQty = Number(item.quantity || 1);

      if (!product || product.stock < requestedQty) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${item.productName}. In Stock: ${product ? product.stock : 0}` 
        });
      }

      const salePrice = Number(item.agreedPrice || item.price || product.price);
      const newStock = product.stock - requestedQty;

      product.stock = newStock;
      product.sold = newStock <= 0;
      product.soldPrice = salePrice;
      product.soldCustomerName = finalCustomerName;
      product.soldCustomerPhone = finalCustomerPhone;
      product.soldCustomerAddress = finalCustomerAddress;
      product.lastInvoiceNo = generatedInvoiceNo;
      product.soldAt = new Date();
      await product.save();

      soldEntries.push({
        storeId,
        productId: product._id,
        productName: product.productName,
        barcode: product.barcode,
        invoiceNo: generatedInvoiceNo,
        quantity: requestedQty,
        returnedQuantity: 0,
        price: salePrice,
        totalAmount: salePrice * requestedQty,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerAddress: finalCustomerAddress,
        soldBy: req.user.id,
        soldByName: finalEmployeeName,
        paymentMode: finalPaymentMode
      });
    }

    await SoldItem.insertMany(soldEntries);

    res.status(201).json({
      success: true,
      message: "Checkout successful, inventory updated.",
      invoiceNo: generatedInvoiceNo,
      storeInfo,
      billDetails: { 
        invoiceNo: generatedInvoiceNo,
        items: cartItems, 
        totalAmount, 
        paymentMode: finalPaymentMode, 
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerAddress: finalCustomerAddress,
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

exports.processReturn = async (req, res, next) => {
  try {
    const { barcode, returnQty, invoiceNo } = req.body;
    const storeId = req.user.storeId;
    const qtyToReturn = Number(returnQty || 1);

    if (qtyToReturn <= 0) {
      return res.status(400).json({ success: false, message: "Return quantity must be at least 1." });
    }

    let filter = { storeId, barcode };
    if (invoiceNo) filter.invoiceNo = invoiceNo;

    const soldRecord = await SoldItem.findOne(filter).sort({ createdAt: -1 });

    if (!soldRecord) {
      return res.status(404).json({ success: false, message: "No sales record found for this product/invoice." });
    }

    const availableToReturn = soldRecord.quantity - soldRecord.returnedQuantity;

    if (qtyToReturn > availableToReturn) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot return ${qtyToReturn} units. Maximum allowed for this sale is ${availableToReturn} unit(s).` 
      });
    }

    soldRecord.returnedQuantity += qtyToReturn;
    await soldRecord.save();

    const product = await Product.findOne({ _id: soldRecord.productId, storeId });
    if (product) {
      product.stock += qtyToReturn;
      product.sold = false;
      await product.save();
    }

    res.json({
      success: true,
      message: `${qtyToReturn} unit(s) returned to stock successfully.`,
      refundAmount: qtyToReturn * soldRecord.price,
      currentStock: product ? product.stock : null
    });
  } catch (error) {
    next(error);
  }
};