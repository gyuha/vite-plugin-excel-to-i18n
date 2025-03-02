import path from 'path';
import { Plugin } from 'vite';
import excelToI18nJson from './excel-to-i18n-json';
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
}


export default function excelToI18n(config: ExcelToI18nOptions): Plugin {
  return {
    name: 'excel-to-i18n',
    enforce: 'pre',
    configureServer(server) {
      const listener = (file = '') =>
        file.includes(path.normalize(config.excelPath)) ? excelToI18nJson(config) : null;
      server.watcher.on('add', listener);
      server.watcher.on('change', listener);
    },
    buildStart(): Promise<void> {
      excelToI18nJson(config);
      return Promise.resolve();
    },
  };
}
