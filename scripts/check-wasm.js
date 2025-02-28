#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 패키지 경로 설정
const packageRoot = path.join(__dirname, '..');
const wasmPkgPath = path.join(packageRoot, 'wasm', 'pkg');
const distPath = path.join(packageRoot, 'dist');
const wasmJsPath = path.join(distPath, 'excel-to-i18n-wasm.js');
const wasmWasmPath = path.join(distPath, 'excel-to-i18n-wasm_bg.wasm');

console.log('Package root:', packageRoot);
console.log('WASM package path:', wasmPkgPath);
console.log('Dist path:', distPath);

// dist 디렉토리가 없으면 생성
if (!fs.existsSync(distPath)) {
  try {
    fs.mkdirSync(distPath, { recursive: true });
    console.log('Created dist directory');
  } catch (error) {
    console.warn('Failed to create dist directory:', error);
  }
}

// wasm/pkg 디렉토리 확인
if (fs.existsSync(wasmPkgPath)) {
  try {
    // wasm/pkg 디렉토리에서 JS 및 WASM 파일 찾기
    const wasmPkgFiles = fs.readdirSync(wasmPkgPath);
    console.log('WASM package files:', wasmPkgFiles);
    
    const jsFile = wasmPkgFiles.find(file => file.endsWith('.js') && !file.includes('snippets'));
    const wasmFile = wasmPkgFiles.find(file => file.endsWith('.wasm'));
    
    console.log('JS file:', jsFile);
    console.log('WASM file:', wasmFile);

    if (jsFile && wasmFile) {
      // 소스 파일 경로
      const jsSourcePath = path.join(wasmPkgPath, jsFile);
      const wasmSourcePath = path.join(wasmPkgPath, wasmFile);
      
      // 파일이 존재하는지 확인
      if (!fs.existsSync(jsSourcePath)) {
        console.warn('JS source file not found:', jsSourcePath);
      }
      
      if (!fs.existsSync(wasmSourcePath)) {
        console.warn('WASM source file not found:', wasmSourcePath);
      }
      
      // dist 디렉토리로 파일 복사
      try {
        fs.copyFileSync(jsSourcePath, wasmJsPath);
        console.log('Copied JS file to:', wasmJsPath);
      } catch (jsError) {
        console.warn('Failed to copy JS file:', jsError);
      }
      
      try {
        fs.copyFileSync(wasmSourcePath, wasmWasmPath);
        console.log('Copied WASM file to:', wasmWasmPath);
      } catch (wasmError) {
        console.warn('Failed to copy WASM file:', wasmError);
      }
      
      console.log('WebAssembly 모듈이 성공적으로 복사되었습니다!');
    } else {
      console.warn('WebAssembly 모듈 파일을 찾을 수 없습니다. JS:', jsFile, 'WASM:', wasmFile);
    }
  } catch (error) {
    console.warn('WebAssembly 모듈 파일 복사 중 오류:', error);
  }
} else {
  console.warn('WebAssembly 모듈 디렉토리를 찾을 수 없습니다:', wasmPkgPath);
  console.warn('JavaScript 구현으로 대체됩니다.');
}

// JS 및 WASM 파일이 모두 존재하는지 확인
const hasJsFile = fs.existsSync(wasmJsPath);
const hasWasmFile = fs.existsSync(wasmWasmPath);
const hasWasmModule = hasJsFile && hasWasmFile;

console.log('JS file exists:', hasJsFile);
console.log('WASM file exists:', hasWasmFile);

if (hasWasmModule) {
  console.log('WebAssembly 모듈이 사용 가능합니다!');
} else {
  console.warn('WebAssembly 모듈이 없습니다. JavaScript 구현으로 대체됩니다.');
  if (!hasJsFile) {
    console.warn('JS 파일이 없습니다:', wasmJsPath);
  }
  if (!hasWasmFile) {
    console.warn('WASM 파일이 없습니다:', wasmWasmPath);
  }
} 