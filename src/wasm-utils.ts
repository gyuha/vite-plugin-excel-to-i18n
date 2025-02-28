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

// 동적 불러오기 도우미 함수 (비동기)
async function dynamicImport(path: string): Promise<any> {
  try {
    // ESM 파일 확장자로 변경 (Node.js와 브라우저 환경 모두 지원)
    // .js -> .mjs로 확장자 변경 (명시적인 ESM 지원)
    if (path.endsWith('.js') && !path.endsWith('-cjs.js') && !path.endsWith('.mjs')) {
      const mjsPath = path.replace('.js', '.mjs');
      console.log(`Converting import path to use .mjs extension: ${mjsPath}`);
      path = mjsPath;
    }
    
    // @ts-ignore - Vite/Rollup 플러그인 시스템과의 호환성을 위한 주석
    return await import(/* @vite-ignore */ path);
  } catch (error) {
    console.error(`동적 import 실패 (${path}):`, error);
    throw error;
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
      // 브라우저 환경 감지
      const isBrowser = typeof window !== 'undefined';
      // Node.js 환경 감지
      const isNode = typeof process !== 'undefined' && 
                      typeof process.versions !== 'undefined' && 
                      typeof process.versions.node !== 'undefined';
      
      console.log(`Environment: ${isBrowser ? 'Browser' : isNode ? 'Node.js' : 'Unknown'}`);
      
      // 환경별 WebAssembly 래퍼 경로
      let wrapperPath = '';
      
      if (isBrowser) {
        // 브라우저에서는 ESM 래퍼 사용
        wrapperPath = wasmModulePath.replace('.js', '-wrapper.mjs');
      } else if (isNode) {
        try {
          // Node.js ESM 환경에서는 ESM 래퍼 사용
          wrapperPath = wasmModulePath.replace('.js', '-wrapper.mjs');
          
          // 로컬 개발 환경에서의 경로
          const fs = await import('fs');
          const path = await import('path');
          
          // dist 디렉토리에서 ESM 래퍼 찾기
          const pkgPath = new URL('../', import.meta.url).pathname;
          const esmWrapperPath = path.join(pkgPath, 'dist', wrapperPath);
          
          if (fs.existsSync(esmWrapperPath)) {
            wrapperPath = esmWrapperPath;
            console.log('로컬 ESM 래퍼 경로 사용:', wrapperPath);
          } else {
            // 패키지 설치 환경에서 래퍼 찾기
            const nodeModulesEsmPath = path.join(process.cwd(), 'node_modules', 'vite-plugin-excel-to-i18n', 'dist', wrapperPath);
            if (fs.existsSync(nodeModulesEsmPath)) {
              wrapperPath = nodeModulesEsmPath;
              console.log('node_modules ESM 래퍼 경로 사용:', wrapperPath);
            } else {
              // ESM 래퍼를 찾을 수 없는 경우 CJS 래퍼 시도
              const cjsWrapperName = wasmModulePath.replace('.js', '-cjs.js');
              const cjsWrapperPath = path.join(pkgPath, 'dist', cjsWrapperName);
              
              if (fs.existsSync(cjsWrapperPath)) {
                wrapperPath = cjsWrapperPath;
                console.log('로컬 CJS 래퍼 경로 사용:', wrapperPath);
              } else {
                const nodeModulesCjsPath = path.join(process.cwd(), 'node_modules', 'vite-plugin-excel-to-i18n', 'dist', cjsWrapperName);
                if (fs.existsSync(nodeModulesCjsPath)) {
                  wrapperPath = nodeModulesCjsPath;
                  console.log('node_modules CJS 래퍼 경로 사용:', wrapperPath);
                } else {
                  throw new Error('WebAssembly 래퍼 모듈을 찾을 수 없습니다');
                }
              }
            }
          }
        } catch (error) {
          console.warn('WebAssembly 래퍼 경로 확인 중 오류:', error);
          // 기본 래퍼 경로 사용
          wrapperPath = wasmModulePath.replace('.js', '-wrapper.mjs');
        }
      } else {
        // 기본 래퍼 경로
        wrapperPath = wasmModulePath.replace('.js', '-wrapper.mjs');
      }
      
      // WebAssembly 래퍼 모듈 로드 시도
      try {
        console.log('WebAssembly 래퍼 모듈 로드 중:', wrapperPath);
        
        if (isBrowser) {
          try {
            // 브라우저 환경에서는 ESM 래퍼 사용
            const wasmWrapper = await dynamicImport(wrapperPath);
            
            // 래퍼 모듈 초기화
            const initResult = await wasmWrapper.initWasm();
            if (initResult) {
              wasmInstance = wasmWrapper;
              isWasmLoaded = true;
              console.log('WebAssembly 래퍼 모듈이 브라우저에서 성공적으로 로드됨');
              resolve(true);
              return;
            }
          } catch (browserError) {
            console.warn('브라우저에서 WebAssembly 래퍼 로드 실패:', browserError);
          }
        } else if (isNode) {
          try {
            if (wrapperPath.endsWith('.mjs')) {
              // Node.js ESM 환경
              const wasmWrapper = await dynamicImport(wrapperPath);
              
              // 래퍼 모듈 초기화
              const initResult = await wasmWrapper.initWasm();
              if (initResult) {
                wasmInstance = wasmWrapper;
                isWasmLoaded = true;
                console.log('WebAssembly 래퍼 모듈이 Node.js ESM 환경에서 성공적으로 로드됨');
                resolve(true);
                return;
              }
            } else {
              // Node.js CommonJS 환경
              try {
                if (typeof require !== 'undefined') {
                  // @ts-ignore
                  const cjsModule = require(wrapperPath);
                  
                  // 래퍼 모듈 초기화 (동기식)
                  const initResult = cjsModule.initWasm();
                  if (initResult) {
                    wasmInstance = cjsModule;
                    isWasmLoaded = true;
                    console.log('WebAssembly 래퍼 모듈이 Node.js CommonJS 환경에서 성공적으로 로드됨');
                    resolve(true);
                    return;
                  }
                }
              } catch (cjsError) {
                console.warn('CommonJS require 호출 실패:', cjsError);
              }
            }
          } catch (nodeError) {
            console.warn('Node.js에서 WebAssembly 래퍼 로드 실패:', nodeError);
          }
        }
        
        // 모든 로드 시도 실패
        console.warn('모든 WebAssembly 래퍼 로드 시도 실패, JavaScript 구현으로 폴백');
        resolve(false);
      } catch (error) {
        console.error('WebAssembly 래퍼 초기화 중 오류:', error);
        resolve(false);
      }
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

    // Wasm 모듈의 convert_excel_to_i18n 함수 호출
    if (typeof wasmInstance.convert_excel_to_i18n === 'function') {
      const result = wasmInstance.convert_excel_to_i18n(wasmOptions);
      
      if (result && result.success) {
        return result.translations;
      } else {
        console.error('WASM 변환 실패:', result?.error || '알 수 없는 오류');
        return null;
      }
    } else {
      console.error('WebAssembly 모듈에 convert_excel_to_i18n 함수가 없습니다');
      return null;
    }
  } catch (error) {
    console.error('WASM 변환 중 오류:', error);
    return null;
  }
}

// WebAssembly가 지원되는지 확인
export function isWasmSupported(): boolean {
  return (
    typeof WebAssembly === 'object' &&
    typeof WebAssembly.instantiate === 'function'
  );
} 