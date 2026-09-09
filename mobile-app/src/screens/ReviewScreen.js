import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';

export default function ReviewScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/settings/reviews');
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.log(t('Error loading community reviews:'), err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollable={true}>
      <BackButton onPress={() => navigation.goBack()} />

      <Text style={styles.title}>{t('reviewWallTitle')}</Text>
      <Text style={styles.subtitle}>{t('reviewWallSubtitle')}</Text>

      {loading ? (
        <ActivityIndicator color="#10b981" style={{ marginTop: 30 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 32 }}>⭐</Text>
          <Text style={styles.emptyText}>{t('noReviewsYet')}</Text>
        </View>
      ) : (
        reviews.map((rev) => (
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
        ))
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20, marginTop: 4 },
  reviewCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  storeName: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  ownerName: { color: '#64748b', fontSize: 11, marginTop: 1 },
  starText: { color: '#fbbf24', fontSize: 14, letterSpacing: 2 },
  commentText: { color: '#cbd5e1', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 10, fontSize: 13 }
});