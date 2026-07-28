import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
// Note: In real React Native environment, import RazorpayCheckout from 'react-native-razorpay';

export const useSubscription = () => {
  const [loading, setLoading] = useState(false);

  const renewMonthlySubscription = async (storeId) => {
    setLoading(true);
    try {
      // 1. Create Order on Backend
      const { data } = await axiosInstance.post('/payment/monthly/order');
      if (!data.success) throw new Error("Failed to create Razorpay order.");

      const options = {
        description: "BillPe Monthly Store Subscription (₹500)",
        image: "https://yourdomain.com/logo.png",
        currency: "INR",
        key: "YOUR_RAZORPAY_KEY_ID", // Replace or fetch dynamically
        amount: data.order.amount,
        order_id: data.order.id,
        name: "BillPe POS",
        theme: { color: "#10B981" }
      };

      // 2. Open Razorpay Checkout (Simulated callback structure for React Native)
      // RazorpayCheckout.open(options).then(async (response) => {
      //   Verification on backend...
      // })

      setLoading(false);
      return { success: true, message: "Order initiated successfully." };
    } catch (err) {
      setLoading(false);
      return { success: false, message: err.message || "Payment initiation failed." };
    }
  };

  const buyAddonPack = async (storeId) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/payment/addon/order');
      setLoading(false);
      return { success: true, order: data.order };
    } catch (err) {
      setLoading(false);
      return { success: false, message: err.message || "Add-on order failed." };
    }
  };

  return { loading, renewMonthlySubscription, buyAddonPack };
};