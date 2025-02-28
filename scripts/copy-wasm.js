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
    // 래퍼 파일 생성 전에 원본 WebAssembly 파일이 존재하는지 확인
    const wasmBgJsPath = path.join(DIST_DIR, 'excel-to-i18n-wasm_bg.js');
    const wasmPath = path.join(DIST_DIR, 'excel-to-i18n-wasm_bg.wasm');
    
    if (!fs.existsSync(wasmBgJsPath) || !fs.existsSync(wasmPath)) {
      console.error('WebAssembly 파일이 dist 디렉토리에 없습니다.');
      return false;
    }
    
    // 1. ESM 래퍼 생성
    const esmWrapperPath = path.join(DIST_DIR, 'excel-to-i18n-wasm-wrapper.mjs');
    const esmWrapperContent = `
// ESM WebAssembly 래퍼
// 이 파일은 자동 생성됩니다
// ESM 환경(브라우저, Vite 등)에서 WebAssembly 로드를 위한 래퍼

// 여기서는 웹어셈블리 바인딩을 직접 가져오지 않고 동적으로 로드합니다
// import * as wasmBindings from './excel-to-i18n-wasm_bg.js';
let wasmBindings = null;

// WebAssembly 인스턴스
let wasmInstance = null;

// WebAssembly 모듈 초기화
export async function initWasm() {
  try {
    // 이미 초기화되었으면 true 반환
    if (wasmInstance) return true;
    
    // 먼저 바인딩 모듈 동적 로드 시도
    try {
      // 브라우저 환경
      if (typeof window !== 'undefined') {
        wasmBindings = await import('./excel-to-i18n-wasm_bg.js');
      } 
      // Node.js ESM 환경
      else if (typeof process !== 'undefined') {
        try {
          const { createRequire } = await import('module');
          const require = createRequire(import.meta.url);
          wasmBindings = require('./excel-to-i18n-wasm_bg.js');
        } catch (requireError) {
          console.error('ESM 환경에서 require 사용 실패:', requireError);
          
          // 대안으로 fs와 path를 사용하여 직접 로드
          try {
            // WebAssembly 파일 직접 로드
            const fs = await import('fs/promises');
            const path = await import('path');
            
            const wasmBinaryPath = new URL('./excel-to-i18n-wasm_bg.wasm', import.meta.url).pathname;
            console.log('WebAssembly 파일 로드 시도:', wasmBinaryPath);
            
            const wasmBinary = await fs.readFile(wasmBinaryPath);
            const { instance } = await WebAssembly.instantiate(wasmBinary);
            wasmInstance = instance.exports;
            
            console.log('WebAssembly 인스턴스 직접 로드 성공');
            return true;
          } catch (fsError) {
            console.error('파일 시스템을 통한 로드 실패:', fsError);
            throw new Error('웹어셈블리 모듈을 로드할 수 없습니다');
          }
        }
      }
    } catch (bindingError) {
      console.error('WebAssembly 바인딩 모듈 로드 실패:', bindingError);
      throw bindingError;
    }
    
    // WebAssembly 바이너리 파일 경로
    const wasmUrl = new URL('./excel-to-i18n-wasm_bg.wasm', import.meta.url);
    
    // 브라우저 환경
    if (typeof window !== 'undefined') {
      const response = await fetch(wasmUrl);
      const wasmBinary = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(wasmBinary);
      wasmInstance = instance.exports;
    } 
    // Node.js 환경
    else if (typeof process !== 'undefined') {
      try {
        const fs = await import('fs/promises');
        const wasmBinary = await fs.readFile(new URL(wasmUrl).pathname);
        const { instance } = await WebAssembly.instantiate(wasmBinary);
        wasmInstance = instance.exports;
      } catch (error) {
        console.error('파일 시스템에서 WebAssembly 바이너리 로드 실패:', error);
        throw error;
      }
    }
    
    // WebAssembly 바인딩에 인스턴스 설정
    if (wasmBindings && typeof wasmBindings.__wbg_set_wasm === 'function') {
      wasmBindings.__wbg_set_wasm(wasmInstance);
      
      // 시작 함수 호출 (있는 경우)
      if (wasmInstance.__wbindgen_start) {
        wasmInstance.__wbindgen_start();
      }
    }
    
    console.log('WebAssembly 모듈 초기화 성공');
    return true;
  } catch (error) {
    console.error('WebAssembly 초기화 오류:', error);
    return false;
  }
}

// Excel 파일을 i18n 형식으로 변환
export function convert_excel_to_i18n(options) {
  if (!wasmBindings || typeof wasmBindings.convert_excel_to_i18n !== 'function') {
    return { success: false, error: 'WebAssembly 바인딩이 초기화되지 않았습니다' };
  }
  
  try {
    // 원본 WebAssembly 함수 호출
    return wasmBindings.convert_excel_to_i18n(options);
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

// 원본 바인딩 파일을 CJS 형식으로 변환하여 새로 생성
const createCjsBindings = () => {
  try {
    const bgJsPath = path.join(__dirname, 'excel-to-i18n-wasm_bg.js');
    const cjsBgJsPath = path.join(__dirname, 'excel-to-i18n-wasm_bg.cjs');
    
    if (!fs.existsSync(bgJsPath)) {
      console.error('WebAssembly 바인딩 파일을 찾을 수 없습니다:', bgJsPath);
      return null;
    }
    
    // 원본 ESM 파일 읽기
    let content = fs.readFileSync(bgJsPath, 'utf8');
    
    // ESM 코드를 CJS로 변환
    content = content.replace(/export function/g, 'function')
                     .replace(/export const/g, 'const')
                     .replace(/export class/g, 'class')
                     .replace(/export let/g, 'let');
    
    // CJS exports 추가
    content += '\n\n// CommonJS exports\n';
    content += 'module.exports = {\n';
    
    // export 문을 찾아서 내보낼 심볼 목록 생성
    const exportedSymbols = [];
    const exportRegex = /export (function|const|class|let) ([a-zA-Z0-9_$]+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exportedSymbols.push(match[2]);
    }
    
    // 변환된 내용에 exports 추가
    content += exportedSymbols.map(symbol => '  ' + symbol + ',').join('\n');
    content += '\n};';
    
    // 변환된 파일 저장
    fs.writeFileSync(cjsBgJsPath, content, 'utf8');
    console.log('CJS 바인딩 파일 생성:', cjsBgJsPath);
    
    // 바인딩 모듈 로드 (직접 require 하지 않고 동적 평가)
    try {
      return require(cjsBgJsPath);
    } catch (e) {
      console.error('CJS 바인딩 모듈 로드 실패:', e);
      return null;
    }
  } catch (error) {
    console.error('CJS 바인딩 생성 실패:', error);
    return null;
  }
};

// WebAssembly 모듈을 로딩하기 위한 정적 import
let wasmBindings = createCjsBindings();

// 바인딩을 불러오지 못했을 경우 원본 파일 직접 사용 시도
if (!wasmBindings) {
  try {
    console.warn('CJS 바인딩 로드 실패, 원본 파일 직접 사용 시도');
    // 여기서 원본 파일을 통한 로드는 실패할 가능성이 높지만 시도는 합니다
    wasmBindings = require('./excel-to-i18n-wasm_bg.js');
  } catch (error) {
    console.error('WebAssembly 바인딩 로드 실패:', error);
    wasmBindings = null;
  }
}

// WebAssembly 인스턴스
let wasmInstance = null;

// WebAssembly 모듈 초기화
function initWasm() {
  if (wasmInstance) {
    return true;
  }
  
  try {
    // WebAssembly 바이너리 파일 경로
    const wasmPath = path.resolve(__dirname, 'excel-to-i18n-wasm_bg.wasm');
    
    if (!fs.existsSync(wasmPath)) {
      console.error('WebAssembly 바이너리 파일을 찾을 수 없습니다:', wasmPath);
      return false;
    }
    
    // 바이너리 파일 로드
    const wasmBinary = fs.readFileSync(wasmPath);
    
    // WebAssembly 모듈 인스턴스화
    const wasmModule = new WebAssembly.Module(wasmBinary);
    const instance = new WebAssembly.Instance(wasmModule);
    wasmInstance = instance.exports;
    
    // WebAssembly 바인딩에 인스턴스 설정
    if (wasmBindings && typeof wasmBindings.__wbg_set_wasm === 'function') {
      wasmBindings.__wbg_set_wasm(wasmInstance);
      
      // 시작 함수 호출 (있는 경우)
      if (wasmInstance.__wbindgen_start) {
        wasmInstance.__wbindgen_start();
      }
    }
    
    console.log('WebAssembly 모듈 초기화 성공 (CJS)');
    return true;
  } catch (error) {
    console.error('WebAssembly 초기화 오류 (CJS):', error);
    return false;
  }
}

// 초기화 시도
initWasm();

function convert_excel_to_i18n(options) {
  if (!wasmBindings || typeof wasmBindings.convert_excel_to_i18n !== 'function') {
    return { success: false, error: 'WebAssembly 바인딩이 초기화되지 않았습니다' };
  }
  
  try {
    // 원본 WebAssembly 함수 호출
    return wasmBindings.convert_excel_to_i18n(options);
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

    // 추가로 .js 확장자를 가진 ESM 래퍼 파일 생성 (호환성을 위해)
    const jsWrapperPath = path.join(DIST_DIR, 'excel-to-i18n-wasm-wrapper.js');
    fs.writeFileSync(jsWrapperPath, esmWrapperContent);
    console.log(`Created JS wrapper: ${jsWrapperPath}`);

    // 3. 통합 모듈 생성 - require 및 import 모두 지원
    const universalWrapperPath = path.join(DIST_DIR, 'excel-to-i18n-wasm.js');
    const universalWrapperContent = `
/**
 * 범용 WebAssembly 래퍼 모듈
 * CommonJS 및 ESM 환경 모두 지원
 */

// 현재 환경 감지
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const isESM = typeof import !== 'undefined' && typeof import.meta !== 'undefined';
const isBrowser = typeof window !== 'undefined';

// CommonJS 환경에서는 cjs 래퍼를 내보냄
if (isNode && !isESM && typeof module !== 'undefined' && module.exports) {
  // cjs.js 래퍼 사용
  module.exports = require('./excel-to-i18n-wasm-cjs.js');
} 
// ESM 환경 (브라우저, Vite, Node.js ESM)
else if (isESM || isBrowser) {
  // 동적 import를 통해 ESM 모듈 로드
  console.warn('Universal Wasm Loader: ESM 방식으로 로드되었습니다. import { initWasm } from "./excel-to-i18n-wasm-wrapper.mjs"를 직접 사용하세요.');
  
  // 빈 객체 내보내기 (실제 기능은 .mjs 파일에서 가져와야 함)
  // 이 부분은 브라우저에서만 의미가 있음
  if (isBrowser && typeof window !== 'undefined') {
    window.excelToI18nWasm = {
      loadModule: async () => {
        try {
          return await import('./excel-to-i18n-wasm-wrapper.mjs');
        } catch (error) {
          console.error('WebAssembly ESM 모듈 로드 실패:', error);
          return null;
        }
      }
    };
  }
}
// 기타 환경 (예상치 못한 환경)
else {
  console.warn('Universal Wasm Loader: 지원되지 않는 환경입니다.');
}
`;
    fs.writeFileSync(universalWrapperPath, universalWrapperContent);
    console.log(`Created universal module: ${universalWrapperPath}`);

    // 4. ESM -> CJS 바인딩 변환
    const srcBgJsPath = path.join(DIST_DIR, 'excel-to-i18n-wasm_bg.js');
    const destCjsBgJsPath = path.join(DIST_DIR, 'excel-to-i18n-wasm_bg.cjs');
    
    if (fs.existsSync(srcBgJsPath)) {
      // 원본 ESM 파일 읽기
      let content = fs.readFileSync(srcBgJsPath, 'utf8');
      
      // ESM 코드를 CJS로 변환
      content = content.replace(/export function/g, 'function')
                       .replace(/export const/g, 'const')
                       .replace(/export class/g, 'class')
                       .replace(/export let/g, 'let');
      
      // CJS exports 추가
      content += '\n\n// CommonJS exports\n';
      content += 'module.exports = {\n';
      
      // export 문을 찾아서 내보낼 심볼 목록 생성
      const exportedSymbols = [];
      const exportRegex = /export (function|const|class|let) ([a-zA-Z0-9_$]+)/g;
      let match;
      
      while ((match = exportRegex.exec(content)) !== null) {
        exportedSymbols.push(match[2]);
      }
      
      // 변환된 내용에 exports 추가
      content += exportedSymbols.map(symbol => '  ' + symbol + ',').join('\n');
      content += '\n};\n';
      
      // 변환된 파일 저장
      fs.writeFileSync(destCjsBgJsPath, content, 'utf8');
      console.log(`Created CJS bindings: ${destCjsBgJsPath}`);
    }

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