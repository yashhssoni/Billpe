import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import AdminStack from './AdminStack';
import EmployeeStack from './EmployeeStack';

// --- Demo Mode Screens Import ---
import DemoAdminDashboard from '../demo/DemoAdminDashboard';
import DemoEmployeeScreen from '../demo/DemoEmployeeScreen';
import DemoAdminScanner from '../demo/DemoAdminScanner';
import DemoAddEmployeeScreen from '../demo/DemoAddEmployeeScreen';
import DemoBarcodeGenerator from '../demo/DemoBarcodeGenerator';
import DemoManageDatabase from '../demo/DemoManageDatabase';
import DemoSoldItemsScreen from '../demo/DemoSoldItemsScreen';
import DemoSubscriptionScreen from '../demo/DemoSubscriptionScreen';
import DemoSettingsHubScreen from '../demo/DemoSettingsHubScreen';
import DemoSupportScreen from '../demo/DemoSupportScreen';
import DemoReviewScreen from '../demo/DemoReviewScreen';
import DemoFaqScreen from '../demo/DemoFaqScreen';
import DemoReturnStockScreen from '../demo/DemoReturnStockScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyOtpScreen" component={VerifyOtpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </Stack.Group>
        ) : user.role === 'admin' ? (
          <Stack.Screen name="AdminRoot" component={AdminStack} />
        ) : (
          <Stack.Screen name="EmployeeRoot" component={EmployeeStack} />
        )}

       
        <Stack.Screen name="DemoAdminDashboard" component={DemoAdminDashboard} />
        <Stack.Screen name="DemoEmployeeScreen" component={DemoEmployeeScreen} />
        <Stack.Screen name="DemoAdminScanner" component={DemoAdminScanner} />
        <Stack.Screen name="DemoAddEmployeeScreen" component={DemoAddEmployeeScreen} />
        <Stack.Screen name="DemoBarcodeGenerator" component={DemoBarcodeGenerator} />
        <Stack.Screen name="DemoManageDatabase" component={DemoManageDatabase} />
        <Stack.Screen name="DemoSoldItemsScreen" component={DemoSoldItemsScreen} />
        <Stack.Screen name="DemoSubscriptionScreen" component={DemoSubscriptionScreen} />
        <Stack.Screen name="DemoSettingsHubScreen" component={DemoSettingsHubScreen} />
        <Stack.Screen name="DemoSupportScreen" component={DemoSupportScreen} />
        <Stack.Screen name="DemoReviewScreen" component={DemoReviewScreen} />
        <Stack.Screen name="DemoFaqScreen" component={DemoFaqScreen} />
        <Stack.Screen name="DemoReturnStockScreen" component={DemoReturnStockScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}