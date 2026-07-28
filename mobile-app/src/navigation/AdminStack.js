import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboard from '../screens/AdminDashboard';
import BarcodeGenerator from '../screens/BarcodeGenerator';
import AdminScanner from '../screens/AdminScanner';
import ManageDatabase from '../screens/ManageDatabase';
import AddEmployeeScreen from '../screens/AddEmployeeScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import SoldItemsScreen from '../screens/SoldItemsScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="BarcodeGenerator" component={BarcodeGenerator} />
      <Stack.Screen name="AdminScanner" component={AdminScanner} />
      <Stack.Screen name="ManageDatabase" component={ManageDatabase} />
      <Stack.Screen name="SoldItemsScreen" component={SoldItemsScreen} />
      <Stack.Screen name="AddEmployeeScreen" component={AddEmployeeScreen} />
      <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
}