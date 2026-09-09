import React, { useContext, useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, 
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import axiosInstance from '../api/axiosInstance';

export default function AdminDashboard({ navigation }) {
  const { storeInfo, logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);

  const [hasReviewed, setHasReviewed] = useState(true); 
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const scrollViewRef = useRef(null);

  const menuItems = [
    { title: t('scanAddStockCard'), icon: '📷', screen: 'AdminScanner' },
    { title: t('barcodeGenCard'), icon: '🏷️', screen: 'BarcodeGenerator' },
    { title: t('manageDbCard'), icon: '📊', screen: 'ManageDatabase' },
    { title: t('soldHistoryCard'), icon: '💰', screen: 'SoldItemsScreen' },
    { title: t('addEmployeeCard'), icon: '👥', screen: 'AddEmployeeScreen' },
    { title: t('subscriptionCard'), icon: '💳', screen: 'SubscriptionScreen' },
    { title: t('settingsSupportCard'), icon: '⚙️', screen: 'SettingsHubScreen', isFullWidth: true },
  ];

  useEffect(() => {
    checkReviewStatus();
  }, []);

  const checkReviewStatus = async () => {
    try {
      const { data } = await axiosInstance.get('/settings/profile');
      if (data.success && data.data) {
        setHasReviewed(data.data.hasReviewed);
      }
    } catch (err) {
      console.log('Error checking review status:', err);
    }
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      Alert.alert(t('error'), t('feedbackEmptyError'));
      return;
    }

    try {
      setSubmittingReview(true);
      const { data } = await axiosInstance.post('/settings/reviews', {
        rating,
        comment: comment.trim()
      });

      setSubmittingReview(false);
      if (data.success) {
        Alert.alert('🎉 ' + t('success'), t('feedbackSubmittedSuccess'));
        setHasReviewed(true);
      }
    } catch (err) {
      setSubmittingReview(false);
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to submit review.');
    }
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Switcher + Logout */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.eyebrow}>{t('adminDashboardTitle')}</Text>
            <Text style={styles.storeName} numberOfLines={1} ellipsizeMode="tail">
              {storeInfo?.storeName || 'My Store'}
            </Text>
            {storeInfo?._id && <Text style={styles.storeId}>{t('storeIdPrefix')} {storeInfo._id}</Text>}
          </View>

          <View style={styles.headerActions}>
            <LanguageSwitcher />
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>{t('logoutBtn')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Grid */}
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => navigation.navigate(item.screen)}
              style={[styles.card, item.isFullWidth && styles.fullWidthCard]}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              </View>
              <View style={item.isFullWidth ? { marginLeft: 14, flex: 1 } : null}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.isFullWidth && (
                  <Text style={styles.cardSubtitle}>{t('settingsSubText')}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inline Feedback Section */}
        {!hasReviewed && (
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeaderRow}>
              <Text style={styles.reviewBadge}>{t('feedbackBadge')}</Text>
              <Text style={styles.reviewSubtitle}>{t('feedbackSub')}</Text>
            </View>
            
            <Text style={styles.reviewHeading}>{t('feedbackHeading')}</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                  key={star} 
                  onPress={() => setRating(star)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.starIcon, star <= rating ? styles.starFilled : styles.starEmpty]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder={t('feedbackPlaceholder')}
              placeholderTextColor="#64748b"
              value={comment}
              onChangeText={setComment}
              maxLength={200}
              onFocus={handleInputFocus}
              returnKeyType="done"
            />

            <TouchableOpacity 
              style={styles.submitReviewBtn} 
              onPress={handleSubmitReview}
              disabled={submittingReview}
              activeOpacity={0.8}
            >
              {submittingReview ? (
                <ActivityIndicator color="#0f172a" size="small" />
              ) : (
                <Text style={styles.submitReviewBtnText}>{t('submitFeedbackBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 24 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  storeName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 2, flexShrink: 1 },
  storeId: { fontSize: 11, color: '#10b981', marginTop: 2, fontWeight: '500' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
  fullWidthCard: { width: '100%', flexDirection: 'row', alignItems: 'center', borderColor: '#38bdf8', backgroundColor: '#1e293b' },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginTop: 8 },
  cardSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  reviewSection: { 
    backgroundColor: '#1e293b', 
    borderRadius: 20, 
    padding: 18, 
    borderWidth: 1.5, 
    borderColor: 'rgba(245, 158, 11, 0.4)', 
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reviewBadge: { color: '#f59e0b', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewSubtitle: { color: '#64748b', fontSize: 11 },
  reviewHeading: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginVertical: 4 },
  starRow: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 8 },
  starIcon: { fontSize: 32, marginRight: 6 },
  starFilled: { color: '#fbbf24' },
  starEmpty: { color: '#475569' },
  reviewInput: { 
    backgroundColor: '#0f172a', 
    color: '#fff', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#334155', 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    fontSize: 14, 
    marginVertical: 8 
  },
  submitReviewBtn: { 
    backgroundColor: '#f59e0b', 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 4 
  },
  submitReviewBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }
});