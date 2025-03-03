/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import { createLogger } from 'vite';
import { ExcelToI18nOptions } from '.';
const { process_excel_file } = require('./lib/excel_to_i18n_wasm');

const logger = createLogger('info', { prefix: '[language-wasm]' });



export default async function excelToI18nJsonWasm(options: ExcelToI18nOptions): Promise<boolean> {
  try {
    const { excelPath, outputDir, supportLanguages } = options;

    const normalizedExcelPath = path.resolve(process.cwd(), excelPath);
    const normalizedOutputDir = path.resolve(process.cwd(), outputDir);

    const excelData = fs.readFileSync(normalizedExcelPath);

    logger.info('WASM 모듈 로드 성공', { timestamp: true });
    const result = process_excel_file(excelData, supportLanguages);
    console.log('📢[excel-to-i18n-json-wasm.ts:24]: result: ', result);

    if (!fs.existsSync(normalizedOutputDir)) {
      fs.mkdirSync(normalizedOutputDir, { recursive: true });
    }

    return false; // WASM 방식은 실패했으므로 false 반환
  } catch (error) {
    logger.error(`WASM 모듈 초기화 실패: ${error instanceof Error ? error.message : String(error)}`, { timestamp: true });
    return false;
  }
} 