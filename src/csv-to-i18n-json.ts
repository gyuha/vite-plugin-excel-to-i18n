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
  logger,
  cleanString
} from './utils/i18n-utils';

/**
 * BOM을 제거하는 함수
 * @param content 원본 콘텐츠
 * @returns BOM이 제거된 콘텐츠
 */
const removeBOM = (content: string): string => {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
};

export default function csvToI18nJson(config: ExcelToI18nOptions) {
  try {
    // CSV 파일 읽기
    let csvContent = fs.readFileSync(path.join(_dirname, config.excelPath), 'utf-8');

    // BOM 제거
    csvContent = removeBOM(csvContent);

    // CSV 파싱
    const records = parse(csvContent, {
      columns: (headers: any) => {
        // 헤더 이름에서 BOM과 따옴표 제거
        return headers.map((header: string) => cleanString(header));
      },
      skip_empty_lines: true,
      trim: true,
      bom: true // CSV-Parse 라이브러리의 BOM 자동 제거 옵션 추가
    });

    const localize = initializeLocalize(config.supportLanguages);

    // CSV 데이터 처리
    records.forEach((row: any) => {
      // row 객체의 키를 수정하여 BOM이 포함된 경우 제거
      const cleanedRow: any = {};
      Object.keys(row).forEach(key => {
        const cleanKey = cleanString(key);
        cleanedRow[cleanKey] = row[key];
      });

      processRow(cleanedRow, localize, config.supportLanguages);
    });

    ensureOutputDir(config.outputDir);
    writeFile(config.outputDir, localize);
    logger.info(`${config.excelPath} 파일이 성공적으로 변환되었습니다.`, { timestamp: true });
  } catch (error) {
    logger.error(`CSV 파일 처리 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`, { timestamp: true });
  }
} 