import { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

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
   * 언어 코드가 있는 열 인덱스 (0부터 시작)
   * 기본값: 0
   */
  langColumnIndex?: number;
  /**
   * 키가 있는 열 인덱스 (0부터 시작)
   * 기본값: 1
   */
  keyColumnIndex?: number;
  /**
   * 번역 값이 시작되는 열 인덱스 (0부터 시작)
   * 기본값: 2
   */
  valueStartColumnIndex?: number;
  /**
   * Excel 시트 이름
   * 기본값: 첫 번째 시트
   */
  sheetName?: string;
  /**
   * 헤더 행 인덱스 (0부터 시작)
   * 기본값: 0
   */
  headerRowIndex?: number;
  /**
   * 데이터 시작 행 인덱스 (0부터 시작)
   * 기본값: 1
   */
  dataStartRowIndex?: number;
}

export default function excelToI18n(options: ExcelToI18nOptions): Plugin {
  const {
    excelPath,
    outputDir,
    langColumnIndex = 0,
    keyColumnIndex = 1,
    valueStartColumnIndex = 2,
    sheetName,
    headerRowIndex = 0,
    dataStartRowIndex = 1
  } = options;

  return {
    name: 'vite-plugin-excel-to-i18n',
    buildStart: async () => {
      try {
        // Excel 파일 읽기
        const workbook = XLSX.readFile(excelPath);
        
        // 시트 선택
        const sheetToUse = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
        if (!sheetToUse) {
          throw new Error(`Sheet "${sheetName || workbook.SheetNames[0]}" not found in Excel file`);
        }
        
        // 시트 데이터를 JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(sheetToUse, { header: 1 });
        
        // 헤더 행에서 언어 코드 추출
        const headers = jsonData[headerRowIndex] as string[];
        const languages = headers.slice(valueStartColumnIndex);
        
        // 각 언어별 번역 데이터 객체 초기화
        const translations: Record<string, Record<string, string>> = {};
        languages.forEach((lang, index) => {
          translations[lang] = {};
        });
        
        // 데이터 행 처리
        for (let i = dataStartRowIndex; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const key = row[keyColumnIndex];
          if (!key) continue;
          
          // 각 언어별 번역 값 추출
          languages.forEach((lang, langIndex) => {
            const value = row[valueStartColumnIndex + langIndex];
            if (value !== undefined && value !== null) {
              translations[lang][key] = String(value);
            }
          });
        }
        
        // 출력 디렉토리가 없으면 생성
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 각 언어별 JSON 파일 생성
        for (const lang in translations) {
          const filePath = path.join(outputDir, `${lang}.json`);
          fs.writeFileSync(filePath, JSON.stringify(translations[lang], null, 2));
          console.log(`Generated i18n file: ${filePath}`);
        }
        
        console.log('Excel to i18n conversion completed successfully');
      } catch (error) {
        console.error('Error in vite-plugin-excel-to-i18n:', error);
      }
    }
  };
} 