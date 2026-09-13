import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';

export default function FaqScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [activeIdx, setActiveIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const FAQ_ITEMS = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
    { q: t('faqQ7'), a: t('faqA7') },
    { q: t('faqQ8'), a: t('faqA8') },
    { q: t('faqQ9'), a: t('faqA9') },
    { q: t('faqQ10'), a: t('faqA10') },
    { q: t('faqQ11'), a: t('faqA11') },
    { q: t('faqQ12'), a: t('faqA12') },
    { q: t('faqQ13'), a: t('faqA13') },
    { q: t('faqQ14'), a: t('faqA14') },
    { q: t('faqQ15'), a: t('faqA15') },
    { q: t('faqQ16'), a: t('faqA16') },
    { q: t('faqQ17'), a: t('faqA17') },
    { q: t('faqQ18'), a: t('faqA18') },
    { q: t('faqQ19'), a: t('faqA19') },
    { q: t('faqQ20'), a: t('faqA20') }
  ];

  const filteredFaqs = FAQ_ITEMS.filter(item => {
    const query = searchQuery.toLowerCase();
    const questionText = (item.q || '').toLowerCase();
    const answerText = (item.a || '').toLowerCase();
    return questionText.includes(query) || answerText.includes(query);
  });

  return (
    <ScreenWrapper scrollable={true}>
      <BackButton onPress={() => navigation.goBack()} />

      <Text style={styles.title}>{t('faqTitle')}</Text>
      <Text style={styles.subtitle}>{t('faqSubtitle')}</Text>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('Search FAQs (e.g., return, stock, delete)...')}
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setActiveIdx(null);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {filteredFaqs.length === 0 ? (
        <Text style={styles.noResultText}>{t('No matching questions found.')}</Text>
      ) : (
        filteredFaqs.map((item, index) => {
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
        })
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 16, marginTop: 4 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 4 },
  clearSearchText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold', paddingHorizontal: 4 },

  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  qRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qText: { color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1, paddingRight: 8 },
  icon: { color: '#10b981', fontSize: 22, fontWeight: 'bold' },
  aText: { color: '#cbd5e1', fontSize: 13, marginTop: 10, lineHeight: 20, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 },
  
  noResultText: { color: '#64748b', textAlign: 'center', marginTop: 30, fontSize: 13 }
});