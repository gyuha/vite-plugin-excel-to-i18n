// scripts/copy-wasm.js
// WebAssembly 파일을 dist 디렉토리로 복사하는 스크립트
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 소스 및 대상 경로 설정
const WASM_SRC_DIR = path.resolve(__dirname, '../wasm/pkg');
const DIST_DIR = path.resolve(__dirname, '../dist');

// dist 디렉토리가 존재하는지 확인하고 없으면 생성
console.log('Copying WebAssembly files to dist directory...');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log(`Created directory: ${DIST_DIR}`);
}

// 복사할 파일 목록
const filesToCopy = [
  'excel_to_i18n_wasm_bg.wasm',
  'excel_to_i18n_wasm.js',
  'excel_to_i18n_wasm_bg.js',
];

// 파일 복사 함수
const copyFile = (src, dest) => {
  try {
    // 소스 파일 존재 여부 확인
    if (!fs.existsSync(src)) {
      console.error(`Source file does not exist: ${src}`);
      return false;
    }

    // 파일 복사
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.basename(src)} -> ${dest}`);
    return true;
  } catch (error) {
    console.error(`Error copying ${src} to ${dest}:`, error);
    return false;
  }
};

// 래퍼 스크립트 생성 - ESM 및 CJS 모두 지원
const createWasmWrapper = () => {
  try {
    // 1. ESM 환경을 위한 래퍼 생성
    const esmWrapperPath = path.join(DIST_DIR, 'excel-to-i18n-wasm-wrapper.mjs');
    const esmWrapperContent = `
// ESM WebAssembly 래퍼
// 이 파일은 자동 생성됩니다
// ESM 환경(브라우저, Vite 등)에서 WebAssembly 로드를 위한 래퍼

let wasmInstance = null;

export async function initWasm() {
  try {
    const wasmUrl = new URL('./excel-to-i18n-wasm_bg.wasm', import.meta.url);
    
    // 브라우저 환경
    if (typeof window !== 'undefined') {
      const fetchResponse = await fetch(wasmUrl);
      const { instance } = await WebAssembly.instantiateStreaming(fetchResponse);
      wasmInstance = instance.exports;
    } 
    // Node.js ESM 환경 
    else if (typeof process !== 'undefined') {
      // Node.js의 경우 fs 모듈을 사용하여 파일에서 직접 로드
      const fs = await import('fs/promises');
      const path = await import('path');
      const wasmPath = new URL(wasmUrl).pathname; 
      const buffer = await fs.readFile(wasmPath);
      const { instance } = await WebAssembly.instantiate(buffer);
      wasmInstance = instance.exports;
    }
    
    return true;
  } catch (error) {
    console.error('WebAssembly 초기화 오류:', error);
    return false;
  }
}

export function convert_excel_to_i18n(options) {
  if (!wasmInstance) {
    return { success: false, error: 'WebAssembly 모듈이 초기화되지 않았습니다' };
  }
  
  try {
    // WebAssembly 함수 호출 로직
    // 실제 구현이 필요함
    return {
      success: true,
      translations: {} // 실제 변환 결과로 대체 필요
    };
  } catch (error) {
    return {
      success: false, 
      error: error.message || 'WebAssembly 함수 호출 중 오류 발생'
    };
  }
}
`;
    fs.writeFileSync(esmWrapperPath, esmWrapperContent);
    console.log(`Created ESM wrapper: ${esmWrapperPath}`);

    // 2. CommonJS 환경을 위한 래퍼 생성
    const cjsWrapperPath = path.join(DIST_DIR, 'excel-to-i18n-wasm-cjs.js');
    const cjsWrapperContent = `
// CommonJS WebAssembly 래퍼
// 이 파일은 자동 생성됩니다
// Node.js (CommonJS) 환경에서 WebAssembly 로드를 위한 래퍼

const fs = require('fs');
const path = require('path');

let wasmInstance = null;

function initWasm() {
  try {
    // WebAssembly 파일 경로
    const wasmPath = path.resolve(__dirname, 'excel-to-i18n-wasm_bg.wasm');
    
    // WebAssembly를 동기식으로 로드 (Node.js에서만 가능)
    const buffer = fs.readFileSync(wasmPath);
    const wasmModule = new WebAssembly.Module(buffer);
    const instance = new WebAssembly.Instance(wasmModule, {});
    wasmInstance = instance.exports;
    
    return true;
  } catch (error) {
    console.error('WebAssembly 초기화 오류 (CJS):', error);
    return false;
  }
}

// 초기화 시도
initWasm();

function convert_excel_to_i18n(options) {
  if (!wasmInstance) {
    return { success: false, error: 'WebAssembly 모듈이 초기화되지 않았습니다' };
  }
  
  try {
    // WebAssembly 함수 호출 로직
    // 실제 구현이 필요함
    return {
      success: true,
      translations: {} // 실제 변환 결과로 대체 필요
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'WebAssembly 함수 호출 중 오류 발생'
    };
  }
}

// CommonJS exports
exports.initWasm = initWasm;
exports.convert_excel_to_i18n = convert_excel_to_i18n;
`;
    fs.writeFileSync(cjsWrapperPath, cjsWrapperContent);
    console.log(`Created CommonJS wrapper: ${cjsWrapperPath}`);

    // 3. 통합 모듈 생성 - require 및 import 모두 지원
    const universalWrapperPath = path.join(DIST_DIR, 'excel-to-i18n-wasm.js');
    const universalWrapperContent = `
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof exports === 'object' && typeof module === 'object') {
    // CommonJS
    module.exports = require('./excel-to-i18n-wasm-cjs.js');
  } else if (typeof exports === 'object') {
    // CommonJS-like 
    exports["excel-to-i18n-wasm"] = factory();
  } else {
    // Browser globals
    root["excel-to-i18n-wasm"] = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  // 브라우저 환경에서는 ESM 모듈을 동적으로 로드하는 로직이 필요
  console.warn('Universal Wasm Loader: 환경에 따라 적절한 모듈을 로드하세요 (CJS 또는 ESM)');
  return {}; // 스텁 구현
});
`;
    fs.writeFileSync(universalWrapperPath, universalWrapperContent);
    console.log(`Created universal module: ${universalWrapperPath}`);

    return true;
  } catch (error) {
    console.error('Error creating wasm wrappers:', error);
    return false;
  }
};

// 메인 실행 함수
const copyWasmFiles = () => {
  console.log(`Source directory: ${WASM_SRC_DIR}`);
  console.log(`Destination directory: ${DIST_DIR}`);

  // WASM 소스 디렉토리 확인
  if (!fs.existsSync(WASM_SRC_DIR)) {
    console.error(`WASM source directory does not exist: ${WASM_SRC_DIR}`);
    console.error('Please build the WebAssembly module first with: npm run build:wasm');
    process.exit(1);
  }

  // 각 파일 복사 및 처리
  let success = true;
  
  for (const file of filesToCopy) {
    const srcFile = path.join(WASM_SRC_DIR, file);
    const destFile = path.join(DIST_DIR, file.replace('excel_to_i18n_wasm', 'excel-to-i18n-wasm'));
    
    if (!copyFile(srcFile, destFile)) {
      success = false;
    }
  }

  // WebAssembly 래퍼 파일 생성
  if (success) {
    console.log('Creating WebAssembly wrapper files for compatibility...');
    if (!createWasmWrapper()) {
      success = false;
    }
  }

  // 결과 출력
  if (success) {
    console.log('All WebAssembly files copied and processed successfully!');
  } else {
    console.error('Some files failed to copy or process. See errors above.');
    process.exit(1);
  }
};

// 스크립트 실행
copyWasmFiles(); 