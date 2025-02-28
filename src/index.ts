import { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';
import * as chokidar from 'chokidar';
import {
  initWasm,
  convertExcelToI18nWithWasm,
  isWasmSupported
} from './wasm-utils';

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
  /**
   * WebAssembly 사용 여부
   * 기본값: true - 지원되는 환경에서 자동으로 WebAssembly 사용
   */
  useWasm?: boolean;
  /**
   * WebAssembly 모듈 경로 (직접 지정하지 않으면 기본 경로 사용)
   */
  wasmModulePath?: string;
}

// WebAssembly 모듈이 초기화되었는지 여부
let isWasmInitialized = false;

/**
 * Excel 파일을 i18n JSON 파일로 변환하는 Vite 플러그인
 * @param options 플러그인 옵션
 * @returns Vite 플러그인
 */
export function excelToI18n(options: ExcelToI18nOptions): Plugin {
  const {
    excelPath,
    outputDir,
    categoryColumnIndex = 0,
    keyColumnIndex = 1,
    valueStartColumnIndex = 2,
    sheetName,
    headerRowIndex = 0,
    dataStartRowIndex = 1,
    useNestedKeys = false,
    useWasm = true,
    wasmModulePath = 'excel-to-i18n-wasm-wrapper.mjs'
  } = options;

  let watcher: chokidar.FSWatcher | null = null;
  
  // WebAssembly 초기화
  const initializeWasm = async (): Promise<boolean> => {
    if (isWasmInitialized || !useWasm || !isWasmSupported()) {
      return isWasmInitialized;
    }
    
    try {
      console.log('Initializing WebAssembly module...');
      const initialized = await initWasm(wasmModulePath);
      isWasmInitialized = initialized;
      
      if (initialized) {
        console.log('WebAssembly module initialized successfully');
      } else {
        console.log('Failed to initialize WebAssembly, falling back to JavaScript implementation');
      }
      
      return initialized;
    } catch (error) {
      console.error('Error initializing WebAssembly:', error);
      return false;
    }
  };

  // Excel 파일을 처리하고 i18n 파일을 생성하는 함수
  const processExcelFile = async () => {
    try {
      // 파일이 존재하는지 확인
      if (!fs.existsSync(excelPath)) {
        console.error(`Excel file not found: ${excelPath}`);
        return;
      }

      // WebAssembly 지원 여부 확인 및 초기화
      const useWasmForConversion = useWasm && isWasmSupported() && (isWasmInitialized || await initializeWasm());
      
      let translations: Record<string, Record<string, any>> = {};
      
      if (useWasmForConversion) {
        // WebAssembly 구현 사용
        try {
          console.log('Using WebAssembly for Excel to i18n conversion...');
          const excelData = fs.readFileSync(excelPath);
          const wasmResult = await convertExcelToI18nWithWasm(
            new Uint8Array(excelData),
            {
              categoryColumnIndex,
              keyColumnIndex,
              valueStartColumnIndex,
              sheetName,
              headerRowIndex,
              dataStartRowIndex,
              useNestedKeys
            }
          );
          
          if (wasmResult) {
            translations = wasmResult;
          } else {
            throw new Error('WebAssembly conversion failed, falling back to JavaScript implementation');
          }
        } catch (wasmError) {
          console.warn('WebAssembly conversion error, falling back to JavaScript implementation:', wasmError);
          // 오류 발생 시 JavaScript 구현으로 대체
          translations = processExcelFileJs();
        }
      } else {
        // JavaScript 구현 사용
        translations = processExcelFileJs();
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
  
  // JavaScript로 구현된 Excel 파일 처리 함수
  const processExcelFileJs = (): Record<string, Record<string, any>> => {
    console.log('Using JavaScript for Excel to i18n conversion...');
    
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
    
    return translations;
  };

  return {
    name: 'vite-plugin-excel-to-i18n',
    
    // Vite 플러그인 hook: config
    config(config) {
      // Vite 설정 확장
      return {
        ...config,
        build: {
          ...config.build,
          rollupOptions: {
            ...config.build?.rollupOptions,
            // WebAssembly 파일을 외부 의존성으로 처리하여 번들링 문제 방지
            external: [
              ...(Array.isArray(config.build?.rollupOptions?.external) 
                 ? config.build.rollupOptions.external 
                 : []),
              /excel-to-i18n-wasm.*\.js$/,
              /excel-to-i18n-wasm.*\.mjs$/,
              /excel-to-i18n-wasm.*\.wasm$/
            ]
          }
        },
        optimizeDeps: {
          ...config.optimizeDeps,
          // WebAssembly 모듈 최적화에서 제외
          exclude: [
            ...(config.optimizeDeps?.exclude || []),
            'excel-to-i18n-wasm.js', 
            'excel-to-i18n-wasm-wrapper.mjs',
            'excel-to-i18n-wasm_bg.wasm'
          ]
        }
      };
    },
    
    // 빌드 시작 전 호출
    buildStart: async () => {
      // WebAssembly 초기화
      if (useWasm && isWasmSupported()) {
        await initializeWasm();
      }
      
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

// CLI 도구에서 직접 사용하기 위한 함수 내보내기
export { convertExcelToI18nWithWasm, initWasm, isWasmSupported };

// CommonJS와 ESM 모두 지원하기 위한 내보내기 방식
export default excelToI18n; 