import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

export const useSales = () => {
  const [loading, setLoading] = useState(false);

  const processCheckout = async (cartItems, totalAmount, paymentMode, customerName, customerPhone, employeeName, customerAddress, invoiceNo) => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.post('/sales/checkout', {
        cartItems,
        totalAmount,
        paymentMode,
        customerName,
        customerPhone,
        customerAddress,
        employeeName,
        invoiceNo
      });
      return { success: true, ...data };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Checkout failed.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const processReturn = async (barcode, returnQty, invoiceNo) => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.post('/sales/return', {
        barcode,
        returnQty,
        invoiceNo
      });
      return { success: true, ...data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Return processing failed.'
      };
    } finally {
      setLoading(false);
    }
  };

  return { loading, processCheckout, processReturn };
};