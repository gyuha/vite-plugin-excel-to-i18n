import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 자동 생성된 언어 파일 가져오기
import ko from './locales/translation.ko.json';
import en from './locales/translation.en.json';
import ja from './locales/translation.ja.json';

const resources = {
  ko: {
    translation: ko
  },
  en: {
    translation: en
  },
  ja: {
    translation: ja
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // 기본 언어
    fallbackLng: 'en', // 번역이 없을 경우 사용할 언어
    interpolation: {
      escapeValue: false // React에서는 이미 XSS 방지를 처리함
    }
  });

export default i18n; 