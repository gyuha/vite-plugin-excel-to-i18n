import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// CommonJS로 직접 불러오는 대신 필요한 함수 직접 구현
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// ESM 환경에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Excel 데이터를 직접 처리하는 간단한 플러그인
function simpleExcelPlugin() {
  // 이미 생성된 파일이 있으므로 추가 처리 필요 없음
  return {
    name: 'simple-excel-plugin',
    configureServer(server) {
      console.log('간단한 엑셀 플러그인이 로드되었습니다.');
      // 파일 변경 감지시 처리는 생략
    }
  };
}

// 플러그인 활성화 및 단순 구성
export default defineConfig({
  plugins: [
    react(),
    simpleExcelPlugin()
  ]
}); 