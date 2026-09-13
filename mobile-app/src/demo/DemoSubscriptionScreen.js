import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../../context/LanguageContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import BackButton from '../../components/BackButton';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const DEMO_SUBSCRIPTION_LIMIT_KEY = 'billpe_demo_sub_action_count';

export default function DemoSubscriptionScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const [actionsLeft, setActionsLeft] = useState(5);

  useFocusEffect(
    useCallback(() => {
      loadDemoLimit();
    }, [])
  );

  const loadDemoLimit = async () => {
    try {
      const savedCount = await AsyncStorage.getItem(DEMO_SUBSCRIPTION_LIMIT_KEY);
      if (savedCount !== null) {
        const remaining = 5 - parseInt(savedCount, 10);
        setActionsLeft(remaining > 0 ? remaining : 0);
      } else {
        setActionsLeft(5);
      }
    } catch (e) {
      console.log('Error loading limit:', e);
    }
  };

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel')} | {t('actionsLeftLabel')}: {actionsLeft}/5</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>
      
      <View style={styles.storeHeaderBox}>
        <Text style={styles.storeNameText}>{t('demoStoreName')}</Text>
        <Text style={styles.storeSubText}>📞 +91 9876543210 | 📍 {t('demoMarketLocation')}</Text>
      </View>

      <View style={styles.cardBox}>
        <Text style={styles.success}>✨ {t('demoTrialActiveText')}</Text>
        <Text style={styles.dateText}>{t('statusFullyUnlockedText')}</Text>
        <Text style={styles.dateText}>{t('actionsRemainingText')}: {actionsLeft} / 5</Text>
      </View>

      <View style={styles.historyContainer}>
        <Text style={styles.historyHeader}>📜 {t('subscriptionHistoryTitle')}</Text>
        <View style={styles.historyItem}>
          <View>
            <Text style={styles.historyPlan}>{t('demoTrialPlanFree')}</Text>
            <Text style={styles.historyDate}>{t('activatedTodayText')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.historyStatus, { color: '#10b981' }]}>{t('activeStatusText')}</Text>
            <Text style={styles.historyExpiry}>{t('validForActionsText')}</Text>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  storeHeaderBox: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  storeNameText: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  storeSubText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  cardBox: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#10b981' },
  success: { color: '#10b981', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  dateText: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  historyContainer: { marginTop: 10, marginBottom: 30 },
  historyHeader: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  historyItem: { backgroundColor: '#1e293b', padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  historyPlan: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  historyDate: { color: '#94a3b8', fontSize: 12 },
  historyStatus: { fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  historyExpiry: { color: '#94a3b8', fontSize: 11 }
});