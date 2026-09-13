import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';

export default function ScreenWrapper({ 
  children, 
  scrollable = false, 
  contentContainerStyle, 
  style 
}) {
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

  return (
    <KeyboardAvoidingView 
      style={[styles.root, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={true} />
      
      {scrollable ? (
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingTop: statusBarHeight + 12 }, 
            contentContainerStyle
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} 
        >
          <View style={{ flex: 1, width: '100%' }}>
            {children}
          </View>
        </ScrollView>
      ) : (
        <View style={[styles.staticContent, { paddingTop: statusBarHeight + 12 }]}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
    overflow: 'hidden', 
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
    backgroundColor: '#0f172a', 
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#0f172a',
  }
});