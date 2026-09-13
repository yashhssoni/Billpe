import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function DemoSubscriptionScreen({ navigation }) {
  const { t } = useContext(LanguageContext);

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>🚀 {t('demoModeLabel') || 'DEMO MODE'} | {t('trialStoreTitle') || 'Store Preview'}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>
      
      <View style={styles.storeHeaderBox}>
        <Text style={styles.storeNameText}>BillPe Demo Store</Text>
        <Text style={styles.storeSubText}>📞 +91 9876543210 | 📍 Sarafa Market, Bhopal</Text>
      </View>

      <View style={styles.cardBox}>
        <Text style={styles.success}>✨ DEMO TRIAL ACTIVE</Text>
        <Text style={styles.dateText}>Status: Fully Unlocked for Store Testing</Text>
        <Text style={styles.planPrice}>Monthly Plan: ₹600 / month</Text>
      </View>

      <TouchableOpacity 
        style={styles.registerBtn} 
        onPress={() => navigation.replace('Register')}
        activeOpacity={0.8}
      >
        <Text style={styles.registerBtnText}>🚀 Register Your Store Now (₹600/mo)</Text>
      </TouchableOpacity>

      <View style={styles.historyContainer}>
        <Text style={styles.historyHeader}>📜 Subscription Features</Text>
        <View style={styles.historyItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyPlan}>Unlimited Billing & Thermal Printing</Text>
            <Text style={styles.historyDate}>Multi-device staff sync included</Text>
          </View>
        </View>
        <View style={styles.historyItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyPlan}>Advanced Barcode & Stock Management</Text>
            <Text style={styles.historyDate}>Low stock alerts & automated reports</Text>
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
  cardBox: { backgroundColor: '#1e293b', padding: 18, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#10b981', alignItems: 'center' },
  success: { color: '#10b981', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  dateText: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginBottom: 6 },
  planPrice: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  registerBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 20, elevation: 4 },
  registerBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  historyContainer: { marginTop: 10, marginBottom: 30 },
  historyHeader: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  historyItem: { backgroundColor: '#1e293b', padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  historyPlan: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  historyDate: { color: '#94a3b8', fontSize: 12 }
});