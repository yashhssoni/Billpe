import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Platform } from 'react-native';

export default function ScreenWrapper({ 
  children, 
  scrollable = false, 
  contentContainerStyle, 
  style 
}) {
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

  return (
    <View style={[styles.root, style]}>
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
    </View>
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