# vite-plugin-excel-to-i18n

A Vite plugin that converts Excel files to i18n JSON files. Makes translation management easy in multilingual applications.

## Features

- 🚀 Converts Excel files to i18n JSON files
- 📱 Real-time updates when Excel files change
- 🔄 Supports nested key structures
- ⚡ WebAssembly support for high-performance conversion
- 🔄 Automatic fallback to JavaScript if WebAssembly is not supported

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

| category | key | ko | en | ... |
|----------|-----|----|----|-----|
| common/button | reset | 초기화 | Reset | ... |
| common/button | next | 다음 | Next | ... |
| common/button | pre | 이전 | Previous | ... |
| common/button | button | 버튼 | Button | ... |

### vite.config.ts Configuration

```typescript
import { defineConfig } from 'vite';
import excelToI18n from 'vite-plugin-excel-to-i18n';

export default defineConfig({
  plugins: [
    excelToI18n({
      excelPath: 'path/to/translations.xlsx', // Path to Excel file
      outputDir: 'src/locales', // Output directory
      // Optional options
      categoryColumnIndex: 0, // Category column index (default: 0)
      keyColumnIndex: 1, // Key column index (default: 1)
      valueStartColumnIndex: 2, // Translation value start column index (default: 2)
      sheetName: 'Translations', // Sheet name (default: first sheet)
      headerRowIndex: 0, // Header row index (default: 0)
      dataStartRowIndex: 1, // Data start row index (default: 1)
      useNestedKeys: false, // Whether to use nested keys (default: false)
      useWasm: true, // Whether to use WebAssembly (default: true)
      wasmModulePath: 'excel-to-i18n-wasm.js' // WebAssembly module path (optional)
    })
  ]
});
```

## Options

| Option | Type | Default | Description |
|------|------|--------|------|
| excelPath | string | - | Path to Excel file (required) |
| outputDir | string | - | Directory path where i18n JSON files will be saved (required) |
| categoryColumnIndex | number | 0 | Column index for category (starting from 0) |
| keyColumnIndex | number | 1 | Column index for key (starting from 0) |
| valueStartColumnIndex | number | 2 | Column index where translation values start (starting from 0) |
| sheetName | string | First sheet | Excel sheet name |
| headerRowIndex | number | 0 | Header row index (starting from 0) |
| dataStartRowIndex | number | 1 | Data start row index (starting from 0) |
| useNestedKeys | boolean | false | Whether to use nested keys (category/key format) |
| useWasm | boolean | true | Whether to use WebAssembly for improved performance |
| wasmModulePath | string | './excel-to-i18n-wasm.js' | Path to the WebAssembly module |

## WebAssembly Support

This plugin supports WebAssembly for high-performance Excel to i18n conversions. WebAssembly provides several benefits:

- 🚀 **Faster Processing**: Significantly faster Excel parsing and conversion.
- ⚙️ **Lower Memory Usage**: More efficient memory management for large Excel files.
- 🔄 **Automatic Fallback**: If WebAssembly is not supported or fails, the plugin automatically falls back to the JavaScript implementation.

WebAssembly is enabled by default but can be disabled by setting `useWasm: false` in the options.

## Results

### useNestedKeys: false (default)

The plugin generates JSON files for each language. By default, it combines category and key:

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

When using nested keys, JSON files are generated with a hierarchical structure:

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

## Direct API Usage

This package also provides direct access to WebAssembly-based conversion functions:

```typescript
import { 
  convertExcelToI18nWithWasm, 
  initWasm, 
  isWasmSupported 
} from 'vite-plugin-excel-to-i18n';

// 1. Check if WebAssembly is supported
if (isWasmSupported()) {
  // 2. Initialize the WebAssembly module
  await initWasm('excel-to-i18n-wasm.js');
  
  // 3. Read excel file
  const excelData = await fetch('translations.xlsx').then(res => res.arrayBuffer());
  
  // 4. Convert Excel to i18n JSON
  const translations = await convertExcelToI18nWithWasm(
    new Uint8Array(excelData),
    {
      categoryColumnIndex: 0,
      keyColumnIndex: 1,
      valueStartColumnIndex: 2,
      sheetName: 'Translations',
      headerRowIndex: 0,
      dataStartRowIndex: 1,
      useNestedKeys: false
    }
  );
  
  console.log(translations);
}
```

## Building from Source

If you're contributing to this package, you'll need to build the WebAssembly module from source:

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build the WebAssembly module
npm run build:wasm

# Build the entire package
npm run build
```

## License

MIT 