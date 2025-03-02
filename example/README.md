# vite-plugin-excel-to-i18n 예제

이 디렉토리는 vite-plugin-excel-to-i18n 플러그인의 사용 예제를 포함하고 있습니다.

## 예제 Excel 파일 생성

다음 형식으로 `translations.xlsx` 파일을 생성하세요:

| category | key | ko | en |
|----------|-----|----|----|
| common/button | reset | 초기화 | Reset |
| common/button | next | 다음 | Next |
| common/button | pre | 이전 | Previous |
| common/button | button | 버튼 | Button |

## 예제 실행

1. 이 디렉토리에 `translations.xlsx` 파일을 생성합니다.
2. 다음 명령어를 실행합니다:

```bash
# 프로젝트 루트 디렉토리에서
npm run build

# 예제 디렉토리로 이동
cd example

# Vite 설치 (필요한 경우)
npm install vite

# Vite 실행
npx vite
```

3. `locales` 디렉토리에 생성된 JSON 파일을 확인합니다.

## 결과

플러그인이 성공적으로 실행되면 `locales` 디렉토리에 다음과 같은 파일이 생성됩니다:

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

`useNestedKeys: true` 옵션을 사용하면 중첩된 형식으로 JSON 파일이 생성됩니다.

# Example Directory

This directory contains example files for the vite-plugin-excel-to-i18n project.

## language.xlsx

A sample Excel file used for testing the WebAssembly module. The Excel file should have the following structure:

| Category | Key | English | Korean | Japanese |
|----------|-----|---------|--------|----------|
| common   | hello | Hello | 안녕하세요 | こんにちは |
| common   | goodbye | Goodbye | 안녕히 가세요 | さようなら |
| menu     | file | File | 파일 | ファイル |
| menu     | edit | Edit | 편집 | 編集 |

The WebAssembly module will convert this Excel file into separate JSON files for each language.