import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function DemoReviewScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [reviews] = useState([
    { _id: '1', storeName: 'Sharma General Store', ownerName: 'Rahul Sharma', rating: 5, comment: 'BillPe app ne meri dukan ki billing ekdam fast kar di hai. Highly recommended!' },
    { _id: '2', storeName: 'Verma Footwear', ownerName: 'Amit Verma', rating: 5, comment: 'Barcode scanning feature is super smooth. Staff handles billing easily now.' },
    { _id: '3', storeName: 'Gupta Kirana', ownerName: 'Suresh Gupta', rating: 4, comment: 'Great app for small business owners. Very easy to use.' }
  ]);

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>{t('🚀 DEMO MODE')}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>

      <Text style={styles.title}>{t('reviewWallTitle')} (Demo)</Text>
      <Text style={styles.subtitle}>{t('reviewWallSubtitle')}</Text>

      {reviews.map((rev) => (
        <View key={rev._id} style={styles.reviewCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.storeName}>{rev.storeName}</Text>
              <Text style={styles.ownerName}>{t('reviewByPrefix')} {rev.ownerName}</Text>
            </View>
            <Text style={styles.starText}>{'★'.repeat(rev.rating)}</Text>
          </View>
          <Text style={styles.commentText}>"{rev.comment}"</Text>
        </View>
      ))}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 16, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20, marginTop: 4 },
  reviewCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  storeName: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  ownerName: { color: '#64748b', fontSize: 11, marginTop: 1 },
  starText: { color: '#fbbf24', fontSize: 14, letterSpacing: 2 },
  commentText: { color: '#cbd5e1', fontSize: 13, fontStyle: 'italic', lineHeight: 19 }
});