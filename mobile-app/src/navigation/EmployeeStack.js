import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EmployeeScreen from '../screens/EmployeeScreen';

const Stack = createNativeStackNavigator();

export default function EmployeeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeePOS" component={EmployeeScreen} />
    </Stack.Navigator>
  );
}