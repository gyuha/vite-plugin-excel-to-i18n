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

| category | key | ko | en | ... |
|----------|-----|----|----|-----|
| common/button | reset | 초기화 | Reset | ... |
| common/button | next | 다음 | Next | ... |
| common/button | pre | 이전 | Previous | ... |
| common/button | button | 버튼 | Button | ... |

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
      categoryColumnIndex: 0, // 카테고리 열 인덱스 (기본값: 0)
      keyColumnIndex: 1, // 키 열 인덱스 (기본값: 1)
      valueStartColumnIndex: 2, // 번역 값 시작 열 인덱스 (기본값: 2)
      sheetName: 'Translations', // 시트 이름 (기본값: 첫 번째 시트)
      headerRowIndex: 0, // 헤더 행 인덱스 (기본값: 0)
      dataStartRowIndex: 1, // 데이터 시작 행 인덱스 (기본값: 1)
      useNestedKeys: false // 중첩된 키 사용 여부 (기본값: false)
    })
  ]
});
```

## 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| excelPath | string | - | Excel 파일 경로 (필수) |
| outputDir | string | - | i18n JSON 파일이 저장될 디렉토리 경로 (필수) |
| categoryColumnIndex | number | 0 | 카테고리가 있는 열 인덱스 (0부터 시작) |
| keyColumnIndex | number | 1 | 키가 있는 열 인덱스 (0부터 시작) |
| valueStartColumnIndex | number | 2 | 번역 값이 시작되는 열 인덱스 (0부터 시작) |
| sheetName | string | 첫 번째 시트 | Excel 시트 이름 |
| headerRowIndex | number | 0 | 헤더 행 인덱스 (0부터 시작) |
| dataStartRowIndex | number | 1 | 데이터 시작 행 인덱스 (0부터 시작) |
| useNestedKeys | boolean | false | 중첩된 키를 사용할지 여부 (카테고리/키 형식) |

## 결과

### useNestedKeys: false (기본값)

플러그인은 각 언어별로 JSON 파일을 생성합니다. 기본적으로 카테고리와 키를 결합한 형식으로 생성됩니다:

**ko.json**
```json
{
  "common/button/reset": "초기화",
  "common/button/next": "다음",
  "common/button/pre": "이전",
  "common/button/button": "버튼"
}
```

**en.json**
```json
{
  "common/button/reset": "Reset",
  "common/button/next": "Next",
  "common/button/pre": "Previous",
  "common/button/button": "Button"
}
```

### useNestedKeys: true

중첩된 키를 사용하면 다음과 같이 계층 구조로 JSON 파일이 생성됩니다:

**ko.json**
```json
{
  "common/button": {
    "reset": "초기화",
    "next": "다음",
    "pre": "이전",
    "button": "버튼"
  }
}
```

**en.json**
```json
{
  "common/button": {
    "reset": "Reset",
    "next": "Next",
    "pre": "Previous",
    "button": "Button"
  }
}
```

## 라이센스

MIT 