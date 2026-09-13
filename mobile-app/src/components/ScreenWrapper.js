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
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={true} />
      
      {scrollable ? (
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: statusBarHeight + 12 }, contentContainerStyle]}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]} // Wait, let's keep paddingTop clean inside root or scrollContent
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={{ paddingTop: statusBarHeight + 12, flex: 1, width: '100%' }}>
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  }
});