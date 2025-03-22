# vite-plugin-excel-to-i18n

A Vite plugin that converts Excel files to i18n JSON files. Makes translation management easy in multilingual applications.

## Features

- 🚀 Converts Excel and CSV files to i18n JSON files
- 📱 Real-time updates when source files change
- 🔄 Supports nested key structures (using '/' or '.' as separators)
- 🌐 Supports multiple languages

## Installation

```bash
npm install vite-plugin-excel-to-i18n --save-dev
# or
yarn add vite-plugin-excel-to-i18n -D
# or
pnpm add vite-plugin-excel-to-i18n -D
```

## Usage

### Excel File Format

The Excel file should be in the following format:

| category | key | ko | en | ja | ... |
|----------|-----|----|----|----|----|
| common/button | reset | 초기화 | Reset | リセット | ... |
| common.button | next | 다음 | Next | 次へ | ... |
| common/button | pre | 이전 | Previous | 前へ | ... |
| common.button | button | 버튼 | Button | ボタン | ... |

Note: You can use either '/' or '.' as category separators (e.g., 'common/button' or 'common.button').

### CSV File Format

The CSV file should follow the same structure as Excel:

```csv
category,key,ko,en,ja
common/button,reset,초기화,Reset,リセット
common.button,next,다음,Next,次へ
common/button,pre,이전,Previous,前へ
common.button,button,버튼,Button,ボタン
```

Note: UTF-8 with BOM is fully supported to prevent character encoding issues.

### vite.config.ts Configuration

```typescript
import { defineConfig } from 'vite';
import excelToI18n from 'vite-plugin-excel-to-i18n';

export default defineConfig({
  plugins: [
    excelToI18n({
      excelPath: 'src/i18n/language.xlsx',  // .xlsx, .xls 또는 .csv 파일 지원
      outputDir: 'src/i18n/locales',
      supportLanguages: ['ko', 'en', 'ja']
    })
  ]
});
```

## Supported File Types

- Excel: `.xlsx`, `.xls`
- CSV: `.csv`

## Options

| Option | Type | Description |
|------|------|------|
| excelPath | string | Path to Excel or CSV file (required) |
| outputDir | string | Directory path where i18n JSON files will be saved (required) |
| supportLanguages | string[] | Array of supported language codes (required) |

## Results

The plugin generates JSON files for each language. It combines category and key into a nested structure:

**translation.ko.json**
```json
{
  "common": {
    "button": {
      "reset": "초기화",
      "next": "다음",
      "pre": "이전",
      "button": "버튼"
    }
  }
}
```

**translation.en.json**
```json
{
  "common": {
    "button": {
      "reset": "Reset",
      "next": "Next",
      "pre": "Previous",
      "button": "Button"
    }
  }
}
```

**translation.ja.json**
```json
{
  "common": {
    "button": {
      "reset": "リセット",
      "next": "次へ",
      "pre": "前へ",
      "button": "ボタン"
    }
  }
}
```

## License

MIT 