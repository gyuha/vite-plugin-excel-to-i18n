# Excel to i18n WebAssembly 모듈

이 모듈은 Excel 파일을 i18n JSON 파일로 변환하는 기능을 WebAssembly로 구현한 것입니다.

## 요구 사항

- Node.js 14 이상
- Rust (WebAssembly 모듈 빌드 시 필요)
- wasm-pack (WebAssembly 모듈 빌드 시 필요)

## 설치

```bash
npm install vite-plugin-excel-to-i18n
```

## 사용 방법

### Vite 플러그인으로 사용

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import excelToI18n from 'vite-plugin-excel-to-i18n/wasm';

export default defineConfig({
  plugins: [
    excelToI18n({
      excelPath: 'path/to/excel.xlsx',
      outputDir: 'path/to/output',
      supportLanguages: ['ko', 'en', 'ja']
    })
  ]
});
```

### 직접 사용

```javascript
const { excelToI18nJson } = require('vite-plugin-excel-to-i18n/wasm');

excelToI18nJson({
  excelPath: 'path/to/excel.xlsx',
  outputDir: 'path/to/output',
  supportLanguages: ['ko', 'en', 'ja']
}).then(() => {
  console.log('변환 완료!');
}).catch(error => {
  console.error('변환 실패:', error);
});
```

## 옵션

- `excelPath`: Excel 파일 경로 (프로젝트 루트 기준)
- `outputDir`: i18n JSON 파일이 저장될 디렉토리 경로 (프로젝트 루트 기준)
- `supportLanguages`: 지원 언어 목록

## Excel 파일 형식

Excel 파일은 다음과 같은 형식이어야 합니다:

| category | key | ko | en | ja |
|----------|-----|----|----|----| 
| common   | hello | 안녕하세요 | Hello | こんにちは |
| common   | bye | 안녕히 가세요 | Goodbye | さようなら |
| user/profile | name | 이름 | Name | 名前 |

- `category`: 카테고리 (선택 사항, `/`로 구분하여 중첩 구조 생성 가능)
- `key`: 키 (필수)
- 그 외 열: 언어 코드 (supportLanguages에 지정된 언어)

## 빌드

WebAssembly 모듈을 직접 빌드하려면:

```bash
# Rust와 wasm-pack이 설치되어 있어야 합니다
cd src/wasm
node build.js
```

## 테스트

```bash
npm run test:wasm
```

## 성능

WebAssembly 구현은 JavaScript 구현보다 대용량 Excel 파일 처리 시 더 나은 성능을 제공합니다.

## 라이선스

MIT 