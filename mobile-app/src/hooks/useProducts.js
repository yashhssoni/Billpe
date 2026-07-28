import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/products');
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (productData) => {
    try {
      const { data } = await axiosInstance.post('/products', productData);
      if (data.success) {
        fetchProducts(); // Refresh list
        return { success: true, message: data.message, remainingBr: data.remainingBr };
      }
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to add product & generate barcode.' 
      };
    }
  };

  const deleteProduct = async (id) => {
    try {
      const { data } = await axiosInstance.delete(`/products/${id}`);
      if (data.success) {
        setProducts(products.filter(p => p._id !== id));
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to delete product.' };
    }
  };

  return { products, loading, error, fetchProducts, addProduct, deleteProduct };
};