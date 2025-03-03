const path = require('path');
const { excelToI18nJson } = require('./index');

/**
 * Excel 파일을 i18n JSON 파일로 변환하는 Vite 플러그인
 * @param {Object} config - 플러그인 설정
 * @param {string} config.excelPath - Excel 파일 경로 (프로젝트 루트 기준)
 * @param {string} config.outputDir - i18n JSON 파일이 저장될 디렉토리 경로 (프로젝트 루트 기준)
 * @param {string[]} config.supportLanguages - 지원 언어 목록
 * @returns {import('vite').Plugin}
 */
function excelToI18n(config) {
  return {
    name: 'excel-to-i18n-wasm',
    enforce: 'pre',
    configureServer(server) {
      const listener = (file = '') => {
        if (file.includes(path.normalize(config.excelPath))) {
          return excelToI18nJson({
            excelPath: config.excelPath,
            outputDir: config.outputDir,
            supportLanguages: config.supportLanguages
          });
        }
        return null;
      };
      
      server.watcher.on('add', listener);
      server.watcher.on('change', listener);
    },
    buildStart() {
      return excelToI18nJson({
        excelPath: config.excelPath,
        outputDir: config.outputDir,
        supportLanguages: config.supportLanguages
      });
    },
  };
}

module.exports = excelToI18n; 