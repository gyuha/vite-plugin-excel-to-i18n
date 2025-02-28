// wasm-utils.ts
// WebAssembly 모듈 인터페이스
import type { ExcelToI18nOptions } from './index';

// WASM 모듈이 로드되면 할당될 인스턴스
let wasmInstance: any = null;
let isWasmLoaded = false;
let loadPromise: Promise<boolean> | null = null;

// 가상 모듈 ID (Vite 플러그인 내부에서 사용)
const VIRTUAL_WASM_MODULE_ID = 'virtual:excel-to-i18n-wasm';

// 옵션 변환 - TypeScript 옵션을 WASM 옵션으로 변환
interface WasmExcelToI18nOptions {
  excel_data: Uint8Array;
  category_column_index?: number;
  key_column_index?: number;
  value_start_column_index?: number;
  sheet_name?: string;
  header_row_index?: number;
  data_start_row_index?: number;
  use_nested_keys?: boolean;
}

// 환경 감지 헬퍼 함수
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && 
                typeof process.versions !== 'undefined' && 
                typeof process.versions.node !== 'undefined';
// ESM 감지 - import.meta 대신 다른 방법 사용
const isESM = typeof process !== 'undefined' && 
              typeof process.versions !== 'undefined' && 
              typeof process.versions.module !== 'undefined';

// 동적 불러오기 도우미 함수 (비동기)
async function dynamicImport(path: string): Promise<any> {
  try {
    // 브라우저나 ESM 환경에서는 dynamic import 사용
    if (isBrowser || isESM) {
      try {
        // @ts-ignore - Vite/Rollup 플러그인 시스템과의 호환성을 위한 주석
        return await import(/* @vite-ignore */ path);
      } catch (esmError) {
        console.error(`ESM dynamic import 실패 (${path}):`, esmError);
        throw esmError;
      }
    } 
    // Node.js CommonJS 환경에서는 require 사용
    else if (isNode && typeof require !== 'undefined') {
      try {
        // @ts-ignore
        return require(path);
      } catch (cjsError) {
        console.error(`CommonJS require 실패 (${path}):`, cjsError);
        throw cjsError;
      }
    }
    
    throw new Error(`지원되지 않는 환경에서 모듈 로드 시도: ${path}`);
  } catch (error) {
    console.error(`동적 import 실패 (${path}):`, error);
    throw error;
  }
}

// 이진 데이터로부터 WASM 모듈 직접 초기화 (바이너리 데이터 직접 사용)
async function initWasmFromBinary(wasmBinary: ArrayBuffer | Uint8Array): Promise<boolean> {
  try {
    // WebAssembly 모듈 직접 인스턴스화
    const { instance } = await WebAssembly.instantiate(wasmBinary);
    
    // 인스턴스 메모리에 바인딩 함수가 없으면 실패
    if (!instance || !instance.exports) {
      console.error('유효하지 않은 WebAssembly 인스턴스');
      return false;
    }
    
    // 수동으로 WebAssembly 인스턴스 생성 및 초기화
    wasmInstance = instance.exports;
    
    // 필요한 함수 존재 여부 확인
    if (typeof wasmInstance.convert_excel_to_i18n !== 'function' && 
        typeof wasmInstance.process_excel !== 'function') {
      console.error('WebAssembly 모듈에 필요한 함수가 없습니다');
      return false;
    }
    
    console.log('WebAssembly 바이너리에서 직접 초기화 성공');
    return true; // 성공적으로 초기화되었으므로 true 반환
  } catch (error) {
    console.error('WebAssembly 바이너리 초기화 오류:', error);
    return false;
  }
}

// 이진 데이터로부터 WASM 모듈 초기화
export async function initWasm(wasmModulePath: string): Promise<boolean> {
  if (isWasmLoaded) {
    return true;
  }
  
  if (loadPromise) {
    return loadPromise;
  }
  
  loadPromise = new Promise<boolean>(async (resolve) => {
    try {
      console.log(`Environment: ${isBrowser ? 'Browser' : isNode ? 'Node.js' : 'Unknown'}`);
      
      // 환경별 로드 전략 사용
      if (isBrowser) {
        try {
          // 브라우저 환경에서 WebAssembly 로드 시도
          // import.meta.url 대신 상대 경로 사용
          const wasmUrl = './dist/wasm/excel_to_i18n_bg.wasm';
          const response = await fetch(wasmUrl);
          const wasmBinary = await response.arrayBuffer();
          
          // 바이너리 데이터로 직접 초기화 시도
          const success = await initWasmFromBinary(wasmBinary);
          if (success) {
            isWasmLoaded = true;
            resolve(true);
            return;
          }
        } catch (browserError) {
          console.warn('브라우저에서 WebAssembly 로드 실패:', browserError);
        }
      } else if (isNode) {
        // Node.js 환경에서 다양한 방법으로 시도
        
        // 1. 먼저 파일 시스템에서 직접 .wasm 파일 로드 시도
        try {
          // ESM 또는 CommonJS에 따라 다른 방식 사용
          if (isESM) {
            // ESM 환경
            try {
              const fs = await import('fs/promises');
              const path = await import('path');
              
              // 다양한 경로에서 .wasm 파일 찾기
              const possiblePaths = [
                // import.meta.url 대신 __dirname 사용 (ESM에서는 사용 불가능하지만 CommonJS 빌드를 위해 수정)
                path.resolve(__dirname, '../dist/wasm/excel_to_i18n_bg.wasm'),
                path.resolve(process.cwd(), './dist/wasm/excel_to_i18n_bg.wasm'),
                path.resolve(process.cwd(), './node_modules/vite-plugin-excel-to-i18n/dist/wasm/excel_to_i18n_bg.wasm')
              ];
              
              let wasmBinary = null;
              
              // 가능한 모든 경로 시도
              for (const wasmPath of possiblePaths) {
                try {
                  console.log(`WebAssembly 파일 로드 시도: ${wasmPath}`);
                  wasmBinary = await fs.readFile(wasmPath);
                  console.log(`WebAssembly 파일 로드 성공: ${wasmPath}`);
                  break;
                } catch (e) {
                  // 실패하면 다음 경로 시도
                }
              }
              
              if (wasmBinary) {
                // 바이너리 데이터로 직접 초기화 시도
                const success = await initWasmFromBinary(wasmBinary);
                if (success) {
                  isWasmLoaded = true;
                  resolve(true);
                  return;
                }
              }
            } catch (esmError) {
              console.warn('ESM 환경에서 WebAssembly 파일 로드 실패:', esmError);
            }
          } else {
            // CommonJS 환경
            try {
              const fs = require('fs');
              const path = require('path');
              
              // 다양한 경로에서 .wasm 파일 찾기
              const possiblePaths = [
                path.resolve(__dirname, '../dist/wasm/excel_to_i18n_bg.wasm'),
                path.resolve(process.cwd(), './dist/wasm/excel_to_i18n_bg.wasm'),
                path.resolve(process.cwd(), './node_modules/vite-plugin-excel-to-i18n/dist/wasm/excel_to_i18n_bg.wasm')
              ];
              
              let wasmBinary = null;
              
              // 가능한 모든 경로 시도
              for (const wasmPath of possiblePaths) {
                try {
                  console.log(`WebAssembly 파일 로드 시도: ${wasmPath}`);
                  if (fs.existsSync(wasmPath)) {
                    wasmBinary = fs.readFileSync(wasmPath);
                    console.log(`WebAssembly 파일 로드 성공: ${wasmPath}`);
                    break;
                  }
                } catch (e) {
                  // 실패하면 다음 경로 시도
                }
              }
              
              if (wasmBinary) {
                // 바이너리 데이터로 직접 초기화 시도
                const success = await initWasmFromBinary(wasmBinary);
                if (success) {
                  isWasmLoaded = true;
                  resolve(true);
                  return;
                }
              }
            } catch (cjsError) {
              console.warn('CommonJS 환경에서 WebAssembly 파일 로드 실패:', cjsError);
            }
          }
        } catch (nodeError) {
          console.warn('Node.js에서 WebAssembly 파일 로드 실패:', nodeError);
        }
      }
      
      // 모든 로드 시도 실패
      console.warn('모든 WebAssembly 래퍼 로드 시도 실패, JavaScript 구현으로 폴백');
      resolve(false);
    } catch (error) {
      console.error('WebAssembly 초기화 중 예상치 못한 오류:', error);
      resolve(false);
    }
  });
  
  return loadPromise;
}

// Wasm 인스턴스 제공 함수
export function getWasmInstance(): any {
  return wasmInstance;
}

// Excel 파일을 i18n JSON으로 변환 (WebAssembly 사용)
export async function convertExcelToI18nWithWasm(
  excelData: Uint8Array,
  options: Omit<ExcelToI18nOptions, 'excelPath' | 'outputDir'> & { sheetName?: string }
): Promise<Record<string, Record<string, string>> | null> {
  if (!isWasmLoaded || !wasmInstance) {
    console.warn('WebAssembly 모듈이 로드되지 않았습니다');
    return null;
  }

  try {
    const wasmOptions: WasmExcelToI18nOptions = {
      excel_data: excelData,
      category_column_index: options.categoryColumnIndex,
      key_column_index: options.keyColumnIndex,
      value_start_column_index: options.valueStartColumnIndex,
      sheet_name: options.sheetName,
      header_row_index: options.headerRowIndex,
      data_start_row_index: options.dataStartRowIndex,
      use_nested_keys: options.useNestedKeys
    };

    // WebAssembly 함수 호출
    if (wasmInstance.process_excel) {
      const result = wasmInstance.process_excel(excelData, wasmOptions);
      return result as Record<string, Record<string, string>>;
    } else {
      console.warn('WebAssembly 모듈에 process_excel 함수가 없습니다');
      return null;
    }
  } catch (error) {
    console.error('WebAssembly로 Excel 변환 중 오류:', error);
    return null;
  }
}

// WebAssembly 지원 여부 확인
export function isWasmSupported(): boolean {
  return (
    typeof WebAssembly === 'object' &&
    typeof WebAssembly.instantiate === 'function' &&
    typeof WebAssembly.compile === 'function'
  );
} 