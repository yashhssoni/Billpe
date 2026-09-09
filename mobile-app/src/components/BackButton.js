import React, { useContext } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';

export default function BackButton({ onPress }) {
  const { lang } = useContext(LanguageContext);

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={styles.backBtn}
      activeOpacity={0.7}
    >
      <Text style={styles.backText}>
        {lang === 'hi' ? '← पीछे' : '← Back'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 16,
  },
  backText: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: 13,
  },
});