import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationRU from './locales/ru/translation.json';
import translationTJ from './locales/tj/translation.json';
import translationFA from './locales/fa/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  ru: {
    translation: translationRU
  },
  tj: {
    translation: translationTJ
  },
  fa: {
    translation: translationFA
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,

    // Агар ҳеҷ чиз ёфт нашавад
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false
    },

    detection: {
      // Аввал cookie/localStorage, баъд navigator
      order: [
        'localStorage',
        'cookie',
        'navigator',
        'htmlTag',
        'path',
        'subdomain'
      ],

      // Номи key барои нигоҳдорӣ
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18next',

      // Дар куҷо нигоҳ дорад
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;