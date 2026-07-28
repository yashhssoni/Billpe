import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuthData();
  }, []);

  const loadStoredAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('billpe_token');
      const storedUser = await AsyncStorage.getItem('billpe_user');
      const storedStore = await AsyncStorage.getItem('billpe_store');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setStoreInfo(JSON.parse(storedStore));
      }
    } catch (error) {
      console.log('Failed to load auth state', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await axiosInstance.post('/auth/login', { email, password });
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        setStoreInfo(data.storeInfo);

        await AsyncStorage.setItem('billpe_token', data.token);
        await AsyncStorage.setItem('billpe_user', JSON.stringify(data.user));
        await AsyncStorage.setItem('billpe_store', JSON.stringify(data.storeInfo));
        return { success: true };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please check credentials.' 
      };
    }
  };

  const logout = async () => {
    try {
      setToken(null);
      setUser(null);
      setStoreInfo(null);
      await AsyncStorage.multiRemove(['billpe_token', 'billpe_user', 'billpe_store']);
    } catch (error) {
      console.log('Logout error', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, storeInfo, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};