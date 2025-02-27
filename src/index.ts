import { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';
import * as chokidar from 'chokidar';

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
   * 카테고리가 있는 열 인덱스 (0부터 시작)
   * 기본값: 0
   */
  categoryColumnIndex?: number;
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
  /**
   * 중첩된 키를 사용할지 여부 (카테고리/키 형식)
   * 기본값: false
   */
  useNestedKeys?: boolean;
}

export default function excelToI18n(options: ExcelToI18nOptions): Plugin {
  const {
    excelPath,
    outputDir,
    categoryColumnIndex = 0,
    keyColumnIndex = 1,
    valueStartColumnIndex = 2,
    sheetName,
    headerRowIndex = 0,
    dataStartRowIndex = 1,
    useNestedKeys = false
  } = options;

  let watcher: chokidar.FSWatcher | null = null;

  // Excel 파일을 처리하고 i18n 파일을 생성하는 함수
  const processExcelFile = async () => {
    try {
      // 파일이 존재하는지 확인
      if (!fs.existsSync(excelPath)) {
        console.error(`Excel file not found: ${excelPath}`);
        return;
      }

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
      const translations: Record<string, Record<string, any>> = {};
      languages.forEach((lang) => {
        translations[lang] = {};
      });
      
      // 데이터 행 처리
      for (let i = dataStartRowIndex; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;
        
        const category = row[categoryColumnIndex];
        const key = row[keyColumnIndex];
        if (!key) continue;
        
        // 각 언어별 번역 값 추출
        languages.forEach((lang, langIndex) => {
          const value = row[valueStartColumnIndex + langIndex];
          if (value !== undefined && value !== null) {
            if (useNestedKeys && category) {
              // 중첩된 키 사용 (카테고리/키 형식)
              if (!translations[lang][category]) {
                translations[lang][category] = {};
              }
              translations[lang][category][key] = String(value);
            } else {
              // 카테고리와 키를 결합한 형식 (category/key)
              const fullKey = category ? `${category}/${key}` : key;
              translations[lang][fullKey] = String(value);
            }
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
  };

  return {
    name: 'vite-plugin-excel-to-i18n',
    buildStart: async () => {
      // 초기 변환 실행
      await processExcelFile();
      
      // chokidar를 사용하여 Excel 파일 변경 감지
      if (!watcher && fs.existsSync(excelPath)) {
        watcher = chokidar.watch(excelPath, {
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100
          }
        });

        watcher
          .on('change', async (path) => {
            console.log(`Excel file ${path} has changed. Regenerating i18n files...`);
            // 파일 변경 후 약간의 지연을 두어 파일이 완전히 쓰여졌는지 확인
            setTimeout(async () => {
              await processExcelFile();
            }, 100);
          })
          .on('error', (error) => {
            console.error(`Watcher error: ${error}`);
          });

        console.log(`Watching for changes in Excel file: ${excelPath}`);
      }
    },
    configureServer: (server) => {
      // 개발 서버가 종료될 때 watcher 정리
      server.httpServer?.on('close', () => {
        if (watcher) {
          watcher.close();
          watcher = null;
          console.log('File watcher closed');
        }
      });
    },
    closeBundle: () => {
      // 플러그인 종료 시 watcher 정리
      if (watcher) {
        watcher.close();
        watcher = null;
        console.log('File watcher closed');
      }
    }
  };
} 