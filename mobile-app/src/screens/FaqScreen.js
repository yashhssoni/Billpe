import React, { useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LanguageContext } from '../context/LanguageContext';
import BackButton from '../components/BackButton';
import ScreenWrapper from '../components/ScreenWrapper';

export default function FaqScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [activeIdx, setActiveIdx] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [navigation])
  );

  const FAQ_ITEMS = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') }
  ];

  return (
    <ScreenWrapper scrollable={true}>
      <BackButton onPress={() => navigation.goBack()} title={t('back')} />

      <Text style={styles.title}>{t('faqTitle')}</Text>
      <Text style={styles.subtitle}>{t('faqSubtitle')}</Text>

      {FAQ_ITEMS.map((item, index) => {
        const isOpen = activeIdx === index;
        return (
          <TouchableOpacity 
            key={index} 
            style={styles.card} 
            onPress={() => setActiveIdx(isOpen ? null : index)}
            activeOpacity={0.8}
          >
            <View style={styles.qRow}>
              <Text style={styles.qText}>{item.q}</Text>
              <Text style={styles.icon}>{isOpen ? '−' : '+'}</Text>
            </View>
            {isOpen && <Text style={styles.aText}>{item.a}</Text>}
          </TouchableOpacity>
        );
      })}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20, marginTop: 4 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  qRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qText: { color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1, paddingRight: 8 },
  icon: { color: '#10b981', fontSize: 22, fontWeight: 'bold' },
  aText: { color: '#cbd5e1', fontSize: 13, marginTop: 10, lineHeight: 20, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 }
});