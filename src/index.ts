import path from 'path';
import { Plugin } from 'vite';
import excelToI18nJson from './excel-to-i18n-json';
import csvToI18nJson from './csv-to-i18n-json';
import { createLogger } from 'vite';

const logger = createLogger('info', { prefix: '[excel-to-i18n]' });

export interface ExcelToI18nOptions {
  /**
   * Excel 또는 CSV 파일 경로 (프로젝트 루트 기준)
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
}

/**
 * 파일 확장자에 따라 적절한 처리 함수를 선택하여 실행
 */
function processFile(config: ExcelToI18nOptions) {
  const ext = path.extname(config.excelPath).toLowerCase();
  
  switch (ext) {
    case '.xlsx':
    case '.xls':
      logger.info(`Excel 파일 처리 중: ${config.excelPath}`, { timestamp: true });
      return excelToI18nJson(config);
    case '.csv':
      logger.info(`CSV 파일 처리 중: ${config.excelPath}`, { timestamp: true });
      return csvToI18nJson(config);
    default:
      logger.error(`지원하지 않는 파일 형식입니다: ${ext}. .xlsx, .xls, .csv 파일만 지원합니다.`, { timestamp: true });
      return;
  }
}

export default function excelToI18n(config: ExcelToI18nOptions): Plugin {
  return {
    name: 'excel-to-i18n',
    enforce: 'pre',
    configureServer(server) {
      const listener = (file = '') => {
        if (file.includes(path.normalize(config.excelPath))) {
          processFile(config);
        }
      };
      server.watcher.on('add', listener);
      server.watcher.on('change', listener);
    },
    buildStart(): Promise<void> {
      processFile(config);
      return Promise.resolve();
    },
  };
}
