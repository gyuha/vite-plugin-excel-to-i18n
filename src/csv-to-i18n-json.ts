import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ExcelToI18nOptions } from '.';
import {
  _dirname,
  writeFile,
  initializeLocalize,
  processRow,
  ensureOutputDir,
  logger
} from './utils/i18n-utils';

/**
 * 카테고리 경로를 배열로 변환
 * @param category 카테고리 문자열 (예: 'common/button' 또는 'common.button')
 * @returns 카테고리 경로 배열
 */
const getCategoryPath = (category: string): string[] => {
  if (!category) return [];
  // '/' 또는 '.'로 분리하여 배열로 변환
  return category.split(/[/.]/);
};

export default function csvToI18nJson(config: ExcelToI18nOptions) {
  try {
    // CSV 파일 읽기
    const csvContent = fs.readFileSync(path.join(_dirname, config.excelPath), 'utf-8');

    // CSV 파싱
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const localize = initializeLocalize(config.supportLanguages);

    // CSV 데이터 처리
    records.forEach((row: any) => {
      processRow(row, localize, config.supportLanguages);
    });

    ensureOutputDir(config.outputDir);
    writeFile(config.outputDir, localize);
    logger.info(`${config.excelPath} 파일이 성공적으로 변환되었습니다.`, { timestamp: true });
  } catch (error) {
    logger.error(`CSV 파일 처리 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`, { timestamp: true });
  }
} 