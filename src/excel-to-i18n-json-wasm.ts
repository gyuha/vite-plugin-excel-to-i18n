/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import { createLogger } from 'vite';
import { ExcelToI18nOptions } from '.';

// WebAssembly 모듈 인터페이스 타입 정의
interface ExcelToI18nWasm {
  process_excel: (
    excelData: Uint8Array,
    options: {
      supportLanguages: string[];
      categoryColumnIndex: number;
      keyColumnIndex: number;
      valueStartColumnIndex: number;
    }
  ) => Record<string, Record<string, string>>;
}

const logger = createLogger('info', { prefix: '[language-wasm]' });
const _dirname = process.cwd();

// WebAssembly 모듈 상태 관리
let wasmModule: ExcelToI18nWasm | null = null;
let wasmInitialized = false;
let wasmInitFailed = false;

/**
 * WebAssembly 모듈 초기화 함수
 */
async function initWasm(): Promise<ExcelToI18nWasm | null> {
  if (wasmModule) return wasmModule;
  if (wasmInitFailed) return null;
  if (wasmInitialized) return null;

  wasmInitialized = true;
  logger.info('Initializing WebAssembly module...', { timestamp: true });

  try {
    // WebAssembly 파일 경로 (다양한 가능한 경로 시도)
    const possibleWasmPaths = [
      path.join(_dirname, 'dist/wasm/excel_to_i18n_bg.wasm'),
      path.join(_dirname, 'dist/wasm/pkg/excel_to_i18n_bg.wasm'),
      path.join(_dirname, 'node_modules/vite-plugin-excel-to-i18n/dist/wasm/excel_to_i18n_bg.wasm')
    ];
    
    const possibleJsPaths = [
      path.join(_dirname, 'dist/wasm/excel_to_i18n.js'),
      path.join(_dirname, 'dist/wasm/pkg/excel_to_i18n.js'),
      path.join(_dirname, 'node_modules/vite-plugin-excel-to-i18n/dist/wasm/excel_to_i18n.js')
    ];
    
    // 유효한 WebAssembly 파일 및 JS 래퍼 파일 경로 찾기
    let wasmPath: string | null = null;
    let jsPath: string | null = null;
    
    for (const wPath of possibleWasmPaths) {
      if (fs.existsSync(wPath)) {
        wasmPath = wPath;
        logger.info(`Found WebAssembly binary at ${wPath}`, { timestamp: true });
        break;
      }
    }
    
    for (const jPath of possibleJsPaths) {
      if (fs.existsSync(jPath)) {
        jsPath = jPath;
        logger.info(`Found WebAssembly JS wrapper at ${jPath}`, { timestamp: true });
        break;
      }
    }

    if (!wasmPath || !jsPath) {
      logger.error('WebAssembly files not found', { timestamp: true });
      wasmInitFailed = true;
      return null;
    }

    // WebAssembly 모듈 로드
    try {
      // Node.js에서 동적 import
      const wasmInstance = require(jsPath);
      
      // WebAssembly 바이너리 파일을 명시적으로 초기화
      await wasmInstance.default(wasmPath);
      
      // process_excel 함수 확인
      if (typeof wasmInstance.process_excel !== 'function') {
        logger.error('WebAssembly module does not have process_excel function', { timestamp: true });
        wasmInitFailed = true;
        return null;
      }
      
      // 모듈 반환
      wasmModule = wasmInstance;
      logger.info('WebAssembly module initialized successfully', { timestamp: true });
      return wasmModule;
    } catch (importError) {
      logger.error(`Failed to import WebAssembly JS wrapper: ${importError instanceof Error ? importError.message : String(importError)}`, { timestamp: true });
      wasmInitFailed = true;
      return null;
    }
  } catch (error) {
    logger.error(`Failed to initialize WebAssembly module: ${error instanceof Error ? error.message : String(error)}`, { timestamp: true });
    wasmInitFailed = true;
    return null;
  }
}

/**
 * Excel 파일을 WebAssembly를 사용하여 i18n JSON으로 변환
 */
export default async function excelToI18nJsonWasm(config: ExcelToI18nOptions) {
  try {
    // WebAssembly 모듈 초기화
    const wasm = await initWasm();
    if (!wasm) {
      logger.error('WebAssembly module not available, conversion failed', { timestamp: true });
      return false;
    }

    // Excel 파일 읽기
    const excelFilePath = path.join(_dirname, config.excelPath);
    if (!fs.existsSync(excelFilePath)) {
      logger.error(`Excel file not found: ${excelFilePath}`, { timestamp: true });
      return false;
    }

    const excelData = fs.readFileSync(excelFilePath);
    
    // WebAssembly 모듈에 전달할 옵션 생성
    const wasmOptions = {
      supportLanguages: config.supportLanguages,
      categoryColumnIndex: 0, // 기본값, 실제 구현에서는 설정에서 가져오기
      keyColumnIndex: 1, // 기본값, 실제 구현에서는 설정에서 가져오기
      valueStartColumnIndex: 2 // 기본값, 실제 구현에서는 설정에서 가져오기
    };

    // WebAssembly 함수 호출하여 변환
    logger.info('Calling WebAssembly function to process Excel file...', { timestamp: true });
    const results = wasm.process_excel(new Uint8Array(excelData), wasmOptions);

    // 출력 디렉토리 생성
    const outputDir = path.join(_dirname, config.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 결과 파일 저장
    let filesSaved = 0;
    for (const lang of config.supportLanguages) {
      if (results[lang]) {
        const filePath = path.join(outputDir, `translation.${lang}.json`);
        fs.writeFileSync(filePath, JSON.stringify(results[lang], null, 2));
        filesSaved++;
      }
    }

    logger.info(`Excel file processed with WebAssembly. ${filesSaved} language files created.`, { timestamp: true });
    return true;
  } catch (error) {
    logger.error(`Error in WebAssembly processing: ${error instanceof Error ? error.message : String(error)}`, { timestamp: true });
    return false;
  }
}

