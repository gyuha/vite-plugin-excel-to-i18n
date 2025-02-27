# vite-plugin-excel-to-i18n

Vite 플러그인으로, Excel 파일을 i18n JSON 파일로 변환합니다. 다국어 지원 애플리케이션에서 번역 관리를 쉽게 할 수 있습니다.

## 설치

```bash
npm install vite-plugin-excel-to-i18n --save-dev
# 또는
yarn add vite-plugin-excel-to-i18n -D
# 또는
pnpm add vite-plugin-excel-to-i18n -D
```

## 사용 방법

### Excel 파일 형식

Excel 파일은 다음과 같은 형식이어야 합니다:

| 언어코드 | 키 | 한국어 | 영어 | 일본어 | ... |
|---------|-----|-------|------|-------|-----|
| lang    | key | ko    | en   | ja    | ... |
| lang    | greeting | 안녕하세요 | Hello | こんにちは | ... |
| lang    | welcome | 환영합니다 | Welcome | ようこそ | ... |

### vite.config.ts 설정

```typescript
import { defineConfig } from 'vite';
import excelToI18n from 'vite-plugin-excel-to-i18n';

export default defineConfig({
  plugins: [
    excelToI18n({
      excelPath: 'path/to/translations.xlsx', // Excel 파일 경로
      outputDir: 'src/locales', // 출력 디렉토리
      // 선택적 옵션
      langColumnIndex: 0, // 언어 코드 열 인덱스 (기본값: 0)
      keyColumnIndex: 1, // 키 열 인덱스 (기본값: 1)
      valueStartColumnIndex: 2, // 번역 값 시작 열 인덱스 (기본값: 2)
      sheetName: 'Translations', // 시트 이름 (기본값: 첫 번째 시트)
      headerRowIndex: 0, // 헤더 행 인덱스 (기본값: 0)
      dataStartRowIndex: 1 // 데이터 시작 행 인덱스 (기본값: 1)
    })
  ]
});
```

## 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| excelPath | string | - | Excel 파일 경로 (필수) |
| outputDir | string | - | i18n JSON 파일이 저장될 디렉토리 경로 (필수) |
| langColumnIndex | number | 0 | 언어 코드가 있는 열 인덱스 (0부터 시작) |
| keyColumnIndex | number | 1 | 키가 있는 열 인덱스 (0부터 시작) |
| valueStartColumnIndex | number | 2 | 번역 값이 시작되는 열 인덱스 (0부터 시작) |
| sheetName | string | 첫 번째 시트 | Excel 시트 이름 |
| headerRowIndex | number | 0 | 헤더 행 인덱스 (0부터 시작) |
| dataStartRowIndex | number | 1 | 데이터 시작 행 인덱스 (0부터 시작) |

## 결과

플러그인은 각 언어별로 JSON 파일을 생성합니다. 예를 들어:

**ko.json**
```json
{
  "greeting": "안녕하세요",
  "welcome": "환영합니다"
}
```

**en.json**
```json
{
  "greeting": "Hello",
  "welcome": "Welcome"
}
```

**ja.json**
```json
{
  "greeting": "こんにちは",
  "welcome": "ようこそ"
}
```

## 라이센스

MIT 