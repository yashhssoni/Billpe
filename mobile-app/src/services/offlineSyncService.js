import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../api/axiosInstance';

const OFFLINE_QUEUE_KEY = 'offline_sales_queue';

export const isConnectedToInternet = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable !== false;
};

export const saveBillOffline = async (billData) => {
  try {
    const existing = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    
    queue.push({
      ...billData,
      localId: Date.now().toString(),
      createdAt: new Date().toISOString()
    });

    await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (err) {
    console.log('Failed to save offline bill:', err);
    return false;
  }
};

export const getPendingOfflineCount = async () => {
  try {
    const existing = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    return queue.length;
  } catch (err) {
    return 0;
  }
};

export const syncOfflineBillsToServer = async () => {
  const online = await isConnectedToInternet();
  if (!online) return;

  try {
    const existing = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
    if (!existing) return;

    const queue = JSON.parse(existing);
    if (queue.length === 0) return;

    const { data } = await axiosInstance.post('/sales/sync-offline', { sales: queue });
    if (data.success) {
      await SecureStore.deleteItemAsync(OFFLINE_QUEUE_KEY);
      console.log('All offline bills synced successfully!');
    }
  } catch (err) {
    console.log('Auto-sync failed:', err);
  }
};