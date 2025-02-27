import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import excelToI18n from '../src/index';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    excelToI18n({
      excelPath: path.resolve(__dirname, 'language.xlsx'),
      outputDir: path.resolve(__dirname, 'src/i18n/locales'),
      categoryColumnIndex: 0,
      keyColumnIndex: 1,
      valueStartColumnIndex: 2,
      headerRowIndex: 0,
      dataStartRowIndex: 1,
      useNestedKeys: false
    })
  ]
}); 