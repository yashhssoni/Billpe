import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Existing Screens
import AdminDashboard from '../screens/AdminDashboard';
import BarcodeGenerator from '../screens/BarcodeGenerator';
import AdminScanner from '../screens/AdminScanner';
import ManageDatabase from '../screens/ManageDatabase';
import AddEmployeeScreen from '../screens/AddEmployeeScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import SoldItemsScreen from '../screens/SoldItemsScreen';

// New Settings & Support Subsystem Screens
import SettingsHubScreen from '../screens/SettingsHubScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SupportScreen from '../screens/SupportScreen';
import ReviewScreen from '../screens/ReviewScreen';
import FaqScreen from '../screens/FaqScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Existing Routes */}
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="BarcodeGenerator" component={BarcodeGenerator} />
      <Stack.Screen name="AdminScanner" component={AdminScanner} />
      <Stack.Screen name="ManageDatabase" component={ManageDatabase} />
      <Stack.Screen name="SoldItemsScreen" component={SoldItemsScreen} />
      <Stack.Screen name="AddEmployeeScreen" component={AddEmployeeScreen} />
      <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />

      {/* Settings & Support Flow */}
      <Stack.Screen name="SettingsHubScreen" component={SettingsHubScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="SupportScreen" component={SupportScreen} />
      <Stack.Screen name="ReviewScreen" component={ReviewScreen} />
      <Stack.Screen name="FaqScreen" component={FaqScreen} />
    </Stack.Navigator>
  );
}