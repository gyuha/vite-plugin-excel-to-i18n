import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import excelToI18n, { ExcelToI18nOptions } from '../src/index';

const excelToJsonOptions: ExcelToI18nOptions = {
  excelPath: 'language.xlsx',
  outputDir: 'src/i18n/locales',
  supportLanguages: ['ko', 'en', 'jp'],
};

export default defineConfig({
  plugins: [
    react(),
    excelToI18n(excelToJsonOptions) as any
  ]
}); 