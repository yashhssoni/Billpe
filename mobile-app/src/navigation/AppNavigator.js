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
import DemoAdminDashboard from '../screens/demo/DemoAdminDashboard';
import DemoEmployeeScreen from '../screens/demo/DemoEmployeeScreen';
import DemoAdminScanner from '../screens/demo/DemoAdminScanner';
import DemoAddEmployeeScreen from '../screens/demo/DemoAddEmployeeScreen';
import DemoBarcodeGenerator from '../screens/demo/DemoBarcodeGenerator';
import DemoManageDatabase from '../screens/demo/DemoManageDatabase';
import DemoSoldItemsScreen from '../screens/demo/DemoSoldItemsScreen';
import DemoSubscriptionScreen from '../screens/demo/DemoSubscriptionScreen';
import DemoSettingsHubScreen from '../screens/demo/DemoSettingsHubScreen';
import DemoSupportScreen from '../screens/demo/DemoSupportScreen';
import DemoReviewScreen from '../screens/demo/DemoReviewScreen';
import DemoFaqScreen from '../screens/demo/DemoFaqScreen';
import DemoReturnStockScreen from '../screens/demo/DemoReturnStockScreen';

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