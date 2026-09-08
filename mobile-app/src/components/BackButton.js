import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export default function BackButton({ 
  onPress, 
  title, 
  style, 
  textStyle, 
  showIcon = true,
  icon = '←'
}) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.container, style]} 
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.contentRow}>
        {showIcon && <Text style={[styles.icon, textStyle]}>{icon}</Text>}
        {title ? <Text style={[styles.title, textStyle]}>{title}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
    paddingRight: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});