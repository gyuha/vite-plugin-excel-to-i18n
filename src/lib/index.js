const { process_excel_file } = require('./pkg/excel_to_i18n_wasm');
const path = require('path');
const fs = require('fs');

/**
 * Excel 파일을 i18n JSON 파일로 변환합니다.
 * @param {Object} options - 변환 옵션
 * @param {string} options.excelPath - Excel 파일 경로 (프로젝트 루트 기준)
 * @param {string} options.outputDir - i18n JSON 파일이 저장될 디렉토리 경로 (프로젝트 루트 기준)
 * @param {string[]} options.supportLanguages - 지원 언어 목록
 * @returns {Promise<void>}
 */
function excelToI18nJson(options) {
  try {
    const { excelPath, outputDir, supportLanguages } = options;
    
    // 경로 정규화
    const normalizedExcelPath = path.resolve(process.cwd(), excelPath);
    const normalizedOutputDir = path.resolve(process.cwd(), outputDir);
    
    // Excel 파일 읽기
    const excelData = fs.readFileSync(normalizedExcelPath);
    
    // WebAssembly 함수 호출
    const result = process_excel_file(excelData, supportLanguages);
    
    // 출력 디렉토리가 없으면 생성
    if (!fs.existsSync(normalizedOutputDir)) {
      fs.mkdirSync(normalizedOutputDir, { recursive: true });
    }
    
    // 각 언어별 JSON 파일 생성
    Object.entries(result).forEach(([lang, json]) => {
      const filePath = path.join(normalizedOutputDir, `translation.${lang}.json`);
      fs.writeFileSync(filePath, json);
    });
    
    return Promise.resolve();
  } catch (error) {
    console.error('Excel to i18n 변환 중 오류 발생:', error);
    return Promise.reject(error);
  }
}

module.exports = {
  excelToI18nJson
}; 