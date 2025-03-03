/**
 * WASM 빌드 파일을 src/lib 폴더로 복사하는 스크립트
 */
const fs = require('fs');
const path = require('path');

// 경로 설정
const rootDir = path.resolve(__dirname, '..');
const srcWasmPkgDir = path.join(rootDir, 'src', 'wasm', 'pkg');
const srcLibDir = path.join(rootDir, 'src', 'lib');

// src/lib 디렉토리가 없으면 생성
if (!fs.existsSync(srcLibDir)) {
  console.log(`'${srcLibDir}' 디렉토리 생성 중...`);
  fs.mkdirSync(srcLibDir, { recursive: true });
}

// src/wasm/pkg 디렉토리가 존재하는지 확인
if (!fs.existsSync(srcWasmPkgDir)) {
  console.error(`오류: '${srcWasmPkgDir}' 디렉토리가 존재하지 않습니다.`);
  console.error('WASM 빌드를 먼저 실행해주세요: npm run build:wasm');
  process.exit(1);
}

// src/wasm/pkg 폴더의 내용을 src/lib 폴더로 복사 (.gitignore 제외)
console.log(`'${srcWasmPkgDir}'의 파일을 '${srcLibDir}'로 복사 중...`);

try {
  const files = fs.readdirSync(srcWasmPkgDir);
  
  let copiedCount = 0;
  for (const file of files) {
    if (file === '.gitignore') {
      console.log(`'${file}' 파일은 제외합니다.`);
      continue;
    }
    
    const srcPath = path.join(srcWasmPkgDir, file);
    const destPath = path.join(srcLibDir, file);
    
    // 파일 상태 확인
    const stat = fs.statSync(srcPath);
    
    if (stat.isFile()) {
      // 파일 복사
      fs.copyFileSync(srcPath, destPath);
      console.log(`'${file}' 파일을 복사했습니다.`);
      copiedCount++;
    }
  }
  
  console.log(`\n총 ${copiedCount}개의 파일이 복사되었습니다.`);
} catch (error) {
  console.error('파일 복사 중 오류가 발생했습니다:', error.message);
  process.exit(1);
}

console.log('\nWASM 빌드 파일 복사가 완료되었습니다.'); 