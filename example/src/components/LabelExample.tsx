import { useTranslation } from 'react-i18next';

function LabelExample() {
  const { t } = useTranslation();

  return (
    <div className="label-example">
      <label>{t('message/greeting')}</label>
    </div>
  );
}

export default LabelExample;
