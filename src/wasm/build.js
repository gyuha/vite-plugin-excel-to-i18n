const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// WebAssembly 빌드 스크립트
// 이 스크립트는 Rust 코드를 WebAssembly로 빌드하고 필요한 파일을 복사합니다

// 기본 디렉토리 설정
const WASM_DIR = __dirname;
const DIST_DIR = path.resolve(__dirname, '../../dist/wasm');
const PKG_DIR = path.resolve(WASM_DIR, 'pkg');

// 디렉토리 생성 또는 비우기
function ensureDir(dir) {
  if (fs.existsSync(dir)) {
    // 디렉토리가 존재하면 내용물 삭제
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    });
  } else {
    // 디렉토리가 없으면 생성
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Rust 코드를 WebAssembly로 빌드
function buildWasm() {
  console.log('🔨 Building WebAssembly module...');

  try {
    // wasm-pack 설치 확인
    try {
      execSync('wasm-pack --version', { stdio: 'pipe' });
      console.log('✓ wasm-pack is already installed');
    } catch (err) {
      console.log('⚠️  wasm-pack not found, installing...');
      execSync('cargo install wasm-pack', { stdio: 'inherit' });
    }

    // Cargo 의존성 업데이트
    console.log('📦 Updating Cargo dependencies...');
    execSync('cargo update', {
      cwd: WASM_DIR,
      stdio: 'inherit'
    });

    // pkg 디렉토리 준비
    ensureDir(PKG_DIR);

    // WebAssembly 빌드
    console.log('🚀 Building Rust to WebAssembly...');
    execSync('wasm-pack build --target web --out-dir pkg', {
      cwd: WASM_DIR,
      stdio: 'inherit'
    });

    // dist 디렉토리 준비 및 결과물 복사
    ensureDir(DIST_DIR);
    
    // pkg 디렉토리에서 dist/wasm 디렉토리로 파일 복사
    fs.readdirSync(PKG_DIR).forEach(file => {
      const srcPath = path.join(PKG_DIR, file);
      const destPath = path.join(DIST_DIR, file);
      
      if (!file.endsWith('.gitignore')) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✓ Copied ${file} to dist/wasm/`);
      }
    });

    console.log('✅ WebAssembly build completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ WebAssembly build failed:', error.message);
    return false;
  }
}

// 스크립트가 직접 실행된 경우에만 빌드 함수 실행
if (require.main === module) {
  const success = buildWasm();
  process.exit(success ? 0 : 1);
} else {
  // 모듈로 가져온 경우 빌드 함수 내보내기
  module.exports = buildWasm;
} 