import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import axiosInstance from '../api/axiosInstance';

export default function UpdateAlert() {
  const [updateNeeded, setUpdateNeeded] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      // Safe guard: Expo Go ya development environment mein crash na ho
      const currentVersion = Application?.nativeApplicationVersion;
      if (!currentVersion) return; 

      const { data } = await axiosInstance.get('/app-version'); 

      if (data?.latestVersion && data.latestVersion !== currentVersion) {
        setUpdateNeeded(true);
        setIsMandatory(data.isMandatory);
      }
    } catch (error) {
      // Ignore background check failure silently so it doesn't crash the UI
    }
  };

  const handleUpdatePress = () => {
    const storeUrl = Platform.OS === 'android' 
      ? 'https://play.google.com/store/apps/details?id=com.billpe.pos' 
      : 'https://apps.apple.com/app/idYOUR_APPLE_ID';
    
    Linking.openURL(storeUrl);
  };

  if (!updateNeeded) return null;

  return (
    <Modal transparent={true} animationType="fade" visible={updateNeeded}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: '#0f172a', width: '100%', maxWidth: 350, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <Text style={{ fontSize: 24 }}>🚀</Text>
          </View>

          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 8 }}>
            New Update Available!
          </Text>
          
          <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            BillPe ka ek naya version available hai. Naye features aur security updates ke liye app ko update karein.
          </Text>

          <View style={{ width: '100%' }}>
            <TouchableOpacity 
              onPress={handleUpdatePress}
              style={{ backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: '#030712', fontWeight: 'bold', fontSize: 16 }}>Update Now</Text>
            </TouchableOpacity>

            {!isMandatory && (
              <TouchableOpacity 
                onPress={() => setUpdateNeeded(false)}
                style={{ paddingVertical: 8, alignItems: 'center' }}
              >
                <Text style={{ color: '#94a3b8', fontWeight: '600', fontSize: 14 }}>Later / Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}