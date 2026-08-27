import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/translations';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en'); 

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('billpe_app_language');
      if (savedLang) {
        setLang(savedLang);
      }
    } catch (e) {
      console.log('Error loading saved language:', e);
    }
  };

  const toggleLanguage = async () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    try {
      await AsyncStorage.setItem('billpe_app_language', nextLang);
    } catch (e) {
      console.log('Error saving language:', e);
    }
  };
  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};