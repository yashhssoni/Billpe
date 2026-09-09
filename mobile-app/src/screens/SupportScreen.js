import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';

export default function SupportScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const SUPPORT_PHONE = '916263634900'; 
  const SUPPORT_EMAIL = 'billpesupportservice@gmail.com';

  const handleWhatsApp = () => {
    const text = encodeURIComponent('Hello BillPe Support, I need assistance regarding my Store details & account.');
    const url = `whatsapp://send?phone=${SUPPORT_PHONE}&text=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), t('whatsAppNotInstalled'));
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Alert.alert(t('error'), 'Unable to make call.');
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Support Request - BillPe Store`).catch(() => {
      Alert.alert(t('error'), 'Unable to open email client.');
    });
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('back')}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t('supportTitle')}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 40 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20, marginTop: 4, lineHeight: 18 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cardDesc: { color: '#94a3b8', fontSize: 12, marginTop: 2 }
});