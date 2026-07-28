import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAPTOP_IP = '192.168.98.142';
const PORT = '5000';
const API_BASE_URL = `http://${LAPTOP_IP}:${PORT}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('billpe_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error fetching token from storage', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;