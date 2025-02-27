import { defineConfig } from 'vite';
import excelToI18n from '../src/index';
import path from 'path';

export default defineConfig({
  plugins: [
    excelToI18n({
      excelPath: path.resolve(__dirname, 'translations.xlsx'),
      outputDir: path.resolve(__dirname, 'locales'),
      sheetName: 'Translations'
    })
  ]
}); 