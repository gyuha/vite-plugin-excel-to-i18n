const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 현재 디렉토리
const currentDir = __dirname;

// wasm-pack 설치 확인
try {
  execSync('wasm-pack --version', { stdio: 'ignore' });
  console.log('✅ wasm-pack이 이미 설치되어 있습니다.');
} catch (error) {
  console.log('⚠️ wasm-pack이 설치되어 있지 않습니다. 설치를 시도합니다...');
  try {
    execSync('cargo install wasm-pack', { stdio: 'inherit' });
    console.log('✅ wasm-pack 설치 완료');
  } catch (installError) {
    console.error('❌ wasm-pack 설치 실패:', installError.message);
    console.error('수동으로 설치해주세요: https://rustwasm.github.io/wasm-pack/installer/');
    process.exit(1);
  }
}

// WebAssembly 빌드
console.log('🔨 WebAssembly 모듈 빌드 중...');
try {
  execSync('wasm-pack build --target nodejs --out-dir pkg', { 
    cwd: currentDir,
    stdio: 'inherit' 
  });
  console.log('✅ WebAssembly 모듈 빌드 완료');
} catch (error) {
  console.error('❌ WebAssembly 모듈 빌드 실패:', error.message);
  process.exit(1);
}

// pkg/package.json 수정
const pkgJsonPath = path.join(currentDir, 'pkg', 'package.json');
if (fs.existsSync(pkgJsonPath)) {
  const pkgJson = require(pkgJsonPath);
  
  // 패키지 이름 수정
  pkgJson.name = 'excel-to-i18n-wasm';
  
  // 필요한 파일 추가
  pkgJson.files = [
    'excel_to_i18n_wasm_bg.wasm',
    'excel_to_i18n_wasm.js',
    'excel_to_i18n_wasm.d.ts',
    '../index.js',
    '../vite-plugin.js'
  ];
  
  // 메인 파일 수정
  pkgJson.main = '../index.js';
  
  // 타입 정의 파일 추가
  pkgJson.types = 'excel_to_i18n_wasm.d.ts';
  
  // 패키지 설명 추가
  pkgJson.description = 'WebAssembly implementation of Excel to i18n JSON converter';
  
  // 저장
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  console.log('✅ pkg/package.json 수정 완료');
  
  // index.js와 vite-plugin.js 복사
  fs.copyFileSync(
    path.join(currentDir, 'src', 'index.js'),
    path.join(currentDir, 'pkg', 'index.js')
  );
  
  fs.copyFileSync(
    path.join(currentDir, 'src', 'vite-plugin.js'),
    path.join(currentDir, 'pkg', 'vite-plugin.js')
  );
  
  console.log('✅ JavaScript 래퍼 파일 복사 완료');
} else {
  console.error('❌ pkg/package.json 파일을 찾을 수 없습니다.');
  process.exit(1);
}

console.log('🎉 WebAssembly 모듈 빌드 및 설정이 완료되었습니다!');
console.log('사용 방법:');
console.log('  const excelToI18n = require("excel-to-i18n-wasm/vite-plugin");');
console.log('  // Vite 플러그인으로 사용');
console.log('  export default {');
console.log('    plugins: [');
console.log('      excelToI18n({');
console.log('        excelPath: "path/to/excel.xlsx",');
console.log('        outputDir: "path/to/output",');
console.log('        supportLanguages: ["ko", "en", "ja"]');
console.log('      })');
console.log('    ]');
console.log('  };'); 