import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Platform } from 'react-native';

export default function ScreenWrapper({ 
  children, 
  scrollable = false, 
  contentContainerStyle, 
  style 
}) {
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

  if (scrollable) {
    return (
      <View style={[styles.root, { paddingTop: statusBarHeight + 12 }, style]}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent />
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: statusBarHeight + 12 }, style]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent />
      <View style={styles.staticContent}>
        {children}
      </View>
    </View>
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