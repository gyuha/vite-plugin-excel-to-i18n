import path from 'path';
import { Plugin } from 'vite';
import excelToI18nJson from './excel-to-i18n-json';
import excelToI18nJsonWasm from './excel-to-i18n-json-wasm';
import { createLogger } from 'vite';

const logger = createLogger('info', { prefix: '[excel-to-i18n]' });

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
   * WASM 사용 여부 (기본값: true)
   */
  useWasm?: boolean;
}

/**
 * Excel 파일을 i18n JSON 파일로 변환하는 함수
 * WASM 사용 실패 시 기본 방식으로 폴백
 */
async function processExcelToI18n(config: ExcelToI18nOptions): Promise<void> {
  const useWasm = config.useWasm !== false; // 기본값은 true
  
  if (useWasm) {
    try {
      // WASM 방식 시도 (내부적으로 실패 시 기본 방식으로 폴백)
      await excelToI18nJsonWasm(config);
      return;
    } catch (error) {
      // 이미 excel-to-i18n-json-wasm.ts 내부에서 폴백 처리를 하므로 여기서는 로그만 출력
      logger.error(`WASM 방식 오류: ${error instanceof Error ? error.message : String(error)}`, { timestamp: true });
    }
  } else {
    // WASM 사용 안함 옵션이 설정된 경우 기본 방식 사용
    logger.info('WASM 사용 안함 옵션이 설정되어 기본 방식을 사용합니다.', { timestamp: true });
    excelToI18nJson(config);
  }
}

export default function excelToI18n(config: ExcelToI18nOptions): Plugin {
  return {
    name: 'excel-to-i18n',
    enforce: 'pre',
    configureServer(server) {
      const listener = async (file = '') => {
        if (file.includes(path.normalize(config.excelPath))) {
          await processExcelToI18n(config);
        }
      };
      server.watcher.on('add', listener);
      server.watcher.on('change', listener);
    },
    async buildStart(): Promise<void> {
      await processExcelToI18n(config);
      return Promise.resolve();
    },
  };
}
