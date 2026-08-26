// hooks/useSales.js
import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

export const useSales = () => {
  const [loading, setLoading] = useState(false);

  const processCheckout = async (cartItems, totalAmount, paymentMode, customerName, customerPhone, employeeName) => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.post('/sales/checkout', {
        cartItems,
        totalAmount,
        paymentMode,
        customerName,
        customerPhone,
        employeeName
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

  return { loading, processCheckout };
};