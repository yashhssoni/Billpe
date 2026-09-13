import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { LanguageContext } from '../../context/LanguageContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import BackButton from '../../components/BackButton';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function DemoSupportScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const SUPPORT_PHONE = '916263634900'; 
  const SUPPORT_EMAIL = 'billpesupportservice@gmail.com';

  const handleWhatsApp = () => {
    const text = encodeURIComponent('Hello BillPe Support, I am checking the demo mode and need assistance.');
    const url = `whatsapp://send?phone=${SUPPORT_PHONE}&text=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), t('whatsAppNotInstalled'));
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Alert.alert(t('error'), t('Unable to make call.'));
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Demo Support Request - BillPe`).catch(() => {
      Alert.alert(t('error'), t('Unable to open email client.'));
    });
  };

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>{t('🚀 DEMO MODE')}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>

      <Text style={styles.title}>{t('supportTitle')} (Demo)</Text>
      <Text style={styles.subtitle}>{t('supportSubtitle')}</Text>

      <TouchableOpacity style={styles.actionCard} onPress={handleWhatsApp} activeOpacity={0.8}>
        <View style={[styles.iconBox, { backgroundColor: 'rgba(37, 211, 102, 0.15)', borderColor: '#25D366' }]}>
          <Text style={{ fontSize: 24 }}>💬</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.cardTitle}>{t('chatWhatsAppCard')}</Text>
          <Text style={styles.cardDesc}>{t('chatWhatsAppSub')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={handleCall} activeOpacity={0.8}>
        <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6' }]}>
          <Text style={{ fontSize: 24 }}>📞</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.cardTitle}>{t('callSupportCard')}</Text>
          <Text style={styles.cardDesc}>{t('callSupportSub')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={handleEmail} activeOpacity={0.8}>
        <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b' }]}>
          <Text style={{ fontSize: 24 }}>✉️</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.cardTitle}>{t('emailSupportCard')}</Text>
          <Text style={styles.cardDesc}>{SUPPORT_EMAIL}</Text>
        </View>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 16, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20, marginTop: 4, lineHeight: 18 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cardDesc: { color: '#94a3b8', fontSize: 12, marginTop: 2 }
});