const path = require('path');
const fs = require('fs');

// 빌드된 WebAssembly 모듈이 있는지 확인
const pkgPath = path.join(__dirname, 'pkg');
if (!fs.existsSync(pkgPath)) {
  console.error('❌ WebAssembly 모듈이 빌드되지 않았습니다.');
  console.error('먼저 build.js를 실행하여 WebAssembly 모듈을 빌드해주세요:');
  console.error('  node build.js');
  process.exit(1);
}

// WebAssembly 모듈 로드
try {
  console.log('WebAssembly 모듈 로드 시도...');
  const wasmModule = require('./pkg/excel_to_i18n_wasm');
  console.log('WebAssembly 모듈 로드 성공:', Object.keys(wasmModule));
  
  // process_excel_file 함수가 존재하는지 확인
  if (typeof wasmModule.process_excel_file !== 'function') {
    console.error('❌ process_excel_file 함수를 찾을 수 없습니다.');
    console.log('사용 가능한 함수:', Object.keys(wasmModule).filter(key => typeof wasmModule[key] === 'function'));
    process.exit(1);
  }
  
  const { process_excel_file } = wasmModule;
  console.log('process_excel_file 함수 타입:', typeof process_excel_file);
  
  // 테스트 파일 경로
  const testExcelPath = process.argv[2] || path.join(__dirname, '..', '..', 'example', 'language.xlsx');
  const testOutputDir = process.argv[3] || path.join(__dirname, '..', '..', 'example', 'locales');
  
  console.log('파일 존재 여부 확인:', fs.existsSync(testExcelPath));
  
  // 출력 디렉토리가 없으면 생성
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  
  // 지원 언어 (테스트용)
  const supportLanguages = ['ko', 'en', 'ja'];
  
  console.log('🧪 WebAssembly 모듈 테스트 시작');
  console.log(`📄 Excel 파일: ${testExcelPath}`);
  console.log(`📁 출력 디렉토리: ${testOutputDir}`);
  console.log(`🌐 지원 언어: ${supportLanguages.join(', ')}`);
  
  // Excel 파일 읽기
  try {
    console.log('Excel 파일 읽기 시도...');
    console.log(`Excel 파일 경로: ${testExcelPath}`);
    console.log(`파일 존재 여부: ${fs.existsSync(testExcelPath)}`);
    
    const excelData = fs.readFileSync(testExcelPath);
    console.log('Excel 파일 읽기 성공, 크기:', excelData.length, 'bytes');
    console.log('Excel 데이터 타입:', excelData.constructor.name);
    
    // WebAssembly 함수 호출
    console.log('WebAssembly 함수 호출 시도...');
    console.log('지원 언어:', supportLanguages);
    console.log('지원 언어 타입:', typeof supportLanguages, Array.isArray(supportLanguages));
    
    try {
      console.log('process_excel_file 함수 호출 직전...');
      try {
        const result = process_excel_file(excelData, supportLanguages);
        console.log('WebAssembly 함수 호출 성공, 결과 타입:', typeof result);
        if (result) {
          console.log('결과 키:', Object.keys(result));
        }
        
        // 각 언어별 JSON 파일 생성
        Object.entries(result).forEach(([lang, json]) => {
          const filePath = path.join(testOutputDir, `translation.${lang}.json`);
          fs.writeFileSync(filePath, json);
          console.log(`✅ ${lang} 언어 파일 생성 완료: ${filePath}`);
        });
        
        // 생성된 파일 확인
        if (fs.existsSync(testOutputDir)) {
          const files = fs.readdirSync(testOutputDir);
          console.log('📋 생성된 파일 목록:');
          files.forEach(file => {
            const filePath = path.join(testOutputDir, file);
            const stats = fs.statSync(filePath);
            console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
          });
        } else {
          console.error('❌ 출력 디렉토리가 생성되지 않았습니다.');
        }
      } catch (wasmFunctionError) {
        console.error('❌ WebAssembly 함수 실행 중 오류 발생:', wasmFunctionError);
        if (wasmFunctionError.stack) {
          console.error('스택 트레이스:', wasmFunctionError.stack);
        }
        if (wasmFunctionError.message) {
          console.error('오류 메시지:', wasmFunctionError.message);
        }
        console.error('오류 타입:', typeof wasmFunctionError);
        console.error('오류 문자열:', String(wasmFunctionError));
      }
    } catch (wasmError) {
      console.error('❌ WebAssembly 함수 호출 실패:', wasmError);
      if (wasmError.stack) {
        console.error('스택 트레이스:', wasmError.stack);
      }
    }
  } catch (fileError) {
    console.error('❌ Excel 파일 읽기 실패:', fileError);
  }
} catch (moduleError) {
  console.error('❌ WebAssembly 모듈 로드 실패:', moduleError);
}

// 사용 방법 출력
console.log('\n📝 사용 방법:');
console.log('  node test.js [엑셀파일경로] [출력디렉토리]');
console.log('  예: node test.js ../example/language.xlsx ../example/locales'); 