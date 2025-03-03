import { useTranslation } from 'react-i18next';
import './ButtonExample.css';

function ButtonExample() {
  const { t } = useTranslation();

  return (
    <div className="button-example">
      <div className="button-row">
        <button className="btn reset">{t('common.button.reset')}</button>
        <button className="btn next">{t('common.button.next')}</button>
        <button className="btn prev">{t('common.button.pre')}</button>
      </div>
    </div>
  );
}

export default ButtonExample; 