import path from 'path';
import { Plugin } from 'vite';
import excelToI18nJson from './excel-to-i18n-json';
import excelToI18nJsonWasm from './excel-to-i18n-json-wasm';

export interface ExcelToI18nOptions {
  /**
   * Excel 파일 경로 (프로젝트 루트 기준)
   */
  excelPath: string;
  /**
   * i18n JSON 파일이 저장될 디렉토리 경로 (프로젝트 루트 기준)
   */
  outputDir: string;
  /**
   * 지원 언어
   */
  supportLanguages: string[];
  /**
   * WebAssembly 사용 여부 (기본값: false)
   */
  useWasm?: boolean;
}

export default function excelToI18n(config: ExcelToI18nOptions): Plugin {
  // WebAssembly 사용 여부 확인
  let useWasm = config.useWasm === true;
  
  // 실제 변환 함수 선택 (WebAssembly 또는 JavaScript)
  const processExcel = async () => {
    if (useWasm) {
      // WebAssembly 처리 시도
      const success = await excelToI18nJsonWasm(config);
      // WebAssembly 실패 시 JavaScript로 폴백
      if (!success) {
        useWasm = false;
        console.warn('WebAssembly processing failed, falling back to JavaScript implementation');
        excelToI18nJson(config);
      }
    } else {
      // JavaScript 구현 사용
      excelToI18nJson(config);
    }
  };
  
  return {
    name: 'excel-to-i18n',
    enforce: 'pre',
    configureServer(server) {
      const listener = (file = '') =>
        file.includes(path.normalize(config.excelPath)) ? processExcel() : null;
      server.watcher.on('add', listener);
      server.watcher.on('change', listener);
    },
    buildStart(): Promise<void> {
      return processExcel().then(() => {
        // 완료 후 Promise 해결
        return Promise.resolve();
      });
    },
  };
}
