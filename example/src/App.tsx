import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ButtonExample from './components/ButtonExample';
import './App.css';
import LabelExample from './components/LabelExample';

function App() {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('title')}</h1>
        <div className="language-selector">
          <button 
            className={currentLang === 'ko' ? 'active' : ''} 
            onClick={() => changeLanguage('ko')}
          >
            한국어
          </button>
          <button 
            className={currentLang === 'en' ? 'active' : ''} 
            onClick={() => changeLanguage('en')}
          >
            English
          </button>
          <button 
            className={currentLang === 'ja' ? 'active' : ''} 
            onClick={() => changeLanguage('ja')}
          >
            日本語
          </button>
        </div>
      </header>
      <main>
        <LabelExample />
        <ButtonExample />
      </main>
    </div>
  );
}

export default App; 