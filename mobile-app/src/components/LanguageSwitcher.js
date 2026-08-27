import React, { useContext } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';

export default function LanguageSwitcher({ style }) {
  const { toggleLanguage, t } = useContext(LanguageContext);

  return (
    <TouchableOpacity 
      style={[styles.btn, style]} 
      onPress={toggleLanguage}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>🌐</Text>
      <Text style={styles.text}>{t('switchLangText')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12
  },
  icon: { fontSize: 13, marginRight: 4 },
  text: { color: '#38bdf8', fontWeight: 'bold', fontSize: 11 }
});