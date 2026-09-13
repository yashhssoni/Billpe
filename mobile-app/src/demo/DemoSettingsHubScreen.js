import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import BackButton from '../components/BackButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function DemoSettingsHubScreen({ navigation }) {
  const { t } = useContext(LanguageContext);

  const handleLogout = () => {
    navigation.replace('Register');
  };

  const menuItems = [
    { title: t('storeProfileCard'), subtitle: t('storeProfileSub'), screen: 'DemoReviewScreen', icon: '🏪' },
    { title: t('helpSupportCard'), subtitle: t('helpSupportSub'), screen: 'DemoFaqScreen', icon: '💬' },
    { title: t('communityWallCard'), subtitle: t('communityWallSub'), screen: 'DemoReviewScreen', icon: '⭐' },
    { title: t('faqCard'), subtitle: t('faqSub'), screen: 'DemoFaqScreen', icon: '❓' },
  ];

  return (
    <ScreenWrapper scrollable={true}>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>{t('🚀 DEMO MODE')}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <LanguageSwitcher />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{t('settingsHubTitle')} (Demo)</Text>
        <Text style={styles.subtitle}>{t('demoStoreName')}</Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>{t('exitDemo')} / {t('registerNow')}</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  demoBanner: { backgroundColor: '#f59e0b', padding: 8, borderRadius: 10, marginBottom: 16, alignItems: 'center' },
  demoBannerText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  menuContainer: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  icon: { fontSize: 24, marginRight: 16 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 3 },
  cardSubtitle: { fontSize: 12, color: '#94a3b8' },
  arrow: { fontSize: 22, color: '#64748b', fontWeight: 'bold' },
  logoutBtn: { marginTop: 30, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444450', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 }
});