import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

export const useSales = () => {
  const [loading, setLoading] = useState(false);

  const processCheckout = async (cartItems, totalAmount, paymentMode, customerName, customerPhone) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/sales/checkout', {
        cartItems,
        totalAmount,
        paymentMode,
        customerName,
        customerPhone
      });
      setLoading(false);
      if (data.success) {
        return { 
          success: true, 
          storeInfo: data.storeInfo, 
          billDetails: data.billDetails 
        };
      }
    } catch (err) {
      setLoading(false);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Checkout failed.' 
      };
    }
  };

  return { loading, processCheckout };
};