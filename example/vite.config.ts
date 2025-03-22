import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import excelToI18n, { ExcelToI18nOptions } from 'vite-plugin-excel-to-i18n';

const excelToJsonOptions: ExcelToI18nOptions = {
  // excelPath: 'language.xlsx',
  excelPath: 'language.csv',
  outputDir: 'src/i18n/locales',
  supportLanguages: ['ko', 'en', 'ja'],
};

export default defineConfig({
  plugins: [
    react(),
    excelToI18n(excelToJsonOptions) as any
  ]
}); 