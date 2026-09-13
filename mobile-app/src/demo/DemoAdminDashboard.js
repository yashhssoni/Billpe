import React, { useState, useRef, useContext } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, 
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function DemoAdminDashboard({ navigation }) {
  const { logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);

  const [hasReviewed, setHasReviewed] = useState(false); 
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const scrollViewRef = useRef(null);

  const menuItems = [
    { title: t('scanAddStockCard'), icon: '📷', screen: 'DemoAdminScanner' },
    { title: t('barcodeGenCard'), icon: '🏷️', screen: 'DemoBarcodeGenerator' },
    { title: t('manageDbCard'), icon: '📊', screen: 'DemoManageDatabase' },
    { title: t('soldHistoryCard'), icon: '💰', screen: 'DemoSoldItemsScreen' },
    { title: t('addEmployeeCard'), icon: '👥', screen: 'DemoAddEmployeeScreen' },
    { title: t('subscriptionCard'), icon: '💳', screen: 'DemoSubscriptionScreen' },
  ];

  const handleMenuPress = (screenName) => {
    navigation.navigate(screenName);
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      Alert.alert(t('error'), t('feedbackEmptyError'));
      return;
    }

    setSubmittingReview(true);
    setTimeout(() => {
      setSubmittingReview(false);
      Alert.alert('🎉 ' + t('success'), t('feedbackSubmittedSuccess'));
      setHasReviewed(true);
    }, 500);
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
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel') || 'DEMO MODE'} | {t('exploreAllFeaturesText') || 'Explore all features freely'}</Text>
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.eyebrow}>{t('adminDashboardTitle')} (Demo)</Text>
            <Text style={styles.storeName} numberOfLines={1} ellipsizeMode="tail">
              {t('demoStoreName')}
            </Text>
            <Text style={styles.storeId}>{t('storeIdPrefix')} DEMO_STORE_99</Text>
          </View>

          <View style={styles.headerRightCol}>
            <View style={styles.headerActions}>
              <LanguageSwitcher />
              <TouchableOpacity onPress={() => navigation.replace('Register')} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>{t('exitDemo') || 'Exit Demo'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => navigation.navigate('DemoEmployeeScreen', { isAdminSwitch: true })}
              style={styles.topBillingBtn}
              activeOpacity={0.8}
            >
              <View style={styles.topBillingIconBox}>
                <Text style={{ fontSize: 16 }}>🛒</Text>
              </View>
              <Text style={styles.topBillingText} numberOfLines={1}>{t('switchToBilling')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleMenuPress(item.screen)}
              style={styles.card}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              </View>
              <View>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('DemoSettingsHubScreen')}
          style={styles.fullWidthCard}
          activeOpacity={0.7}
        >
          <View style={styles.fullWidthIconBox}>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t('settingsSupportCard')}</Text>
            <Text style={styles.fullWidthSubText}>{t('settingsSubText')}</Text>
          </View>
        </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 20, paddingTop: 36 },
  scrollContent: { paddingBottom: 80 },
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 16, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10, marginBottom: 20 },
  headerRightCol: { width: '48%', alignItems: 'flex-end', gap: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBillingBtn: {
    width: '100%',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBillingIconBox: { width: 26, height: 26, borderRadius: 6, backgroundColor: 'rgba(56, 189, 248, 0.2)', justifyContent: 'center', alignItems: 'center' },
  topBillingText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 11, flex: 1 },
  eyebrow: { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  storeName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 2, flexShrink: 1 },
  storeId: { fontSize: 11, color: '#10b981', marginTop: 2, fontWeight: '500' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginTop: 8 },
  fullWidthCard: { width: '100%', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 16 },
  fullWidthIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center' },
  fullWidthSubText: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  reviewSection: { backgroundColor: '#1e293b', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: 'rgba(245, 158, 11, 0.4)', marginTop: 8, marginBottom: 20 },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reviewBadge: { color: '#f59e0b', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewSubtitle: { color: '#64748b', fontSize: 11 },
  reviewHeading: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginVertical: 4 },
  starRow: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 8 },
  starIcon: { fontSize: 32, marginRight: 6 },
  starFilled: { color: '#fbbf24' },
  starEmpty: { color: '#475569' },
  reviewInput: { backgroundColor: '#0f172a', color: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginVertical: 8 },
  submitReviewBtn: { backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  submitReviewBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }
});