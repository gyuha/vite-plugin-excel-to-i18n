// scripts/create-wasm-wrapper.js
// WebAssembly 모듈을 ESM과 CJS 형식 모두 지원하도록 래퍼 파일을 생성하는 스크립트
const fs = require('fs');
const path = require('path');

// 대상 경로 설정
const DIST_DIR = path.resolve(__dirname, '../dist');

// ESM과 CJS에서 모두 작동하는 래퍼 파일 생성
const createWasmWrapper = () => {
  console.log('Creating WebAssembly module wrapper for ESM/CJS compatibility...');
  
  const wrapperPath = path.join(DIST_DIR, 'excel-to-i18n-wasm-wrapper.js');
  
  // 래퍼 파일 내용
  const wrapperContent = `
// WebAssembly 모듈 래퍼 - ESM과 CJS 호환성을 위한 파일
// 이 파일은 자동으로 생성되었습니다

const isNodeJs = typeof window === 'undefined' && typeof process !== 'undefined';
const hasRequire = typeof require !== 'undefined';
const isBrowser = typeof window !== 'undefined';

const loadModule = async () => {
  try {
    // 브라우저 환경
    if (isBrowser) {
      console.log('Loading WebAssembly module in browser environment');
      try {
        // Vite 또는 Webpack과 함께 사용할 경우
        if (typeof import.meta !== 'undefined') {
          try {
            const wasm = await import('./excel-to-i18n-wasm.js');
            return wasm;
          } catch (viteError) {
            console.warn('Vite import failed, trying relative path:', viteError);
          }
        }
        
        // 일반 브라우저 환경
        try {
          const wasm = await import('./excel-to-i18n-wasm.js');
          return wasm;
        } catch (browserError) {
          console.warn('Browser import failed:', browserError);
          throw browserError;
        }
      } catch (allBrowserErrors) {
        console.error('All browser import methods failed:', allBrowserErrors);
        return null;
      }
    } 
    // Node.js 환경
    else if (isNodeJs) {
      console.log('Loading WebAssembly module in Node.js environment');
      
      // ESM 환경에서 시도
      try {
        const wasm = await import('./excel-to-i18n-wasm.js');
        return wasm;
      } catch (esmError) {
        console.warn('ESM import failed in Node.js:', esmError);
        
        // CommonJS 환경에서 시도
        if (hasRequire) {
          try {
            console.log('Trying CommonJS in Node.js');
            const wasm = require('./excel-to-i18n-wasm-cjs.js');
            return wasm;
          } catch (cjsError) {
            console.warn('CommonJS require failed:', cjsError);
            
            // 절대 경로 시도
            try {
              const cwd = process.cwd();
              const pkgPath = path.resolve(cwd, 'node_modules', 'vite-plugin-excel-to-i18n', 'dist', 'excel-to-i18n-wasm-cjs.js');
              console.log('Trying package path:', pkgPath);
              const wasm = require(pkgPath);
              return wasm;
            } catch (pkgError) {
              console.warn('Package path require failed:', pkgError);
              throw new Error('Failed to load WebAssembly module in Node.js');
            }
          }
        } else {
          throw esmError;
        }
      }
    }
    
    throw new Error('Unknown environment, cannot load WebAssembly module');
  } catch (error) {
    console.error('Failed to load WebAssembly module:', error);
    return null;
  }
};

// ESM 내보내기
export const initWasmModule = loadModule;

// CommonJS 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initWasmModule: loadModule
  };
}
`;

  // CJS 버전 래퍼 파일 생성
  const cjsWrapperPath = path.join(DIST_DIR, 'excel-to-i18n-wasm-cjs.js');
  const cjsWrapperContent = `
// CommonJS WebAssembly 모듈 래퍼
// 이 파일은 자동으로 생성되었습니다
const fs = require('fs');
const path = require('path');

// WebAssembly 파일 경로
let wasmPath, bgJsPath;

// 상대 경로와 절대 경로 모두 시도
const possiblePaths = [
  // 상대 경로
  {
    wasm: path.join(__dirname, 'excel-to-i18n-wasm_bg.wasm'),
    js: path.join(__dirname, 'excel-to-i18n-wasm_bg.js')
  },
  // 패키지 설치 경로
  {
    wasm: path.join(process.cwd(), 'node_modules', 'vite-plugin-excel-to-i18n', 'dist', 'excel-to-i18n-wasm_bg.wasm'),
    js: path.join(process.cwd(), 'node_modules', 'vite-plugin-excel-to-i18n', 'dist', 'excel-to-i18n-wasm_bg.js')
  }
];

// 각 경로 시도
for (const paths of possiblePaths) {
  if (fs.existsSync(paths.wasm) && fs.existsSync(paths.js)) {
    wasmPath = paths.wasm;
    bgJsPath = paths.js;
    break;
  }
}

if (!wasmPath || !bgJsPath) {
  console.error('Could not find WebAssembly files');
  module.exports = {
    convert_excel_to_i18n: () => {
      throw new Error('WebAssembly files not found');
    }
  };
} else {
  try {
    // WebAssembly.Module 인스턴스 생성
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmInstance = new WebAssembly.Instance(
      new WebAssembly.Module(wasmBuffer),
      {}
    );
    
    // JS 백그라운드 모듈 로드
    const bgJs = require(bgJsPath);
    
    // WASM 모듈 설정
    bgJs.__wbg_set_wasm(wasmInstance.exports);
    
    // 모듈 내보내기
    module.exports = {
      ...bgJs,
      // 주요 함수 재정의
      convert_excel_to_i18n: bgJs.convert_excel_to_i18n
    };
  } catch (error) {
    console.error('Failed to load WebAssembly in CommonJS environment:', error);
    // 오류 발생 시 빈 객체 내보내기
    module.exports = {
      convert_excel_to_i18n: () => {
        throw new Error('WebAssembly module failed to load: ' + error.message);
      }
    };
  }
}
`;

  try {
    // 파일 작성
    fs.writeFileSync(wrapperPath, wrapperContent);
    console.log(`Created WebAssembly wrapper: ${wrapperPath}`);
    
    fs.writeFileSync(cjsWrapperPath, cjsWrapperContent);
    console.log(`Created WebAssembly CJS wrapper: ${cjsWrapperPath}`);
    
    return true;
  } catch (error) {
    console.error('Error creating WebAssembly wrapper files:', error);
    return false;
  }
};

// 스크립트 실행
createWasmWrapper(); 