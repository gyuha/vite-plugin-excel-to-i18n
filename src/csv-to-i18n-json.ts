import fs from 'fs';
import path from 'path';
import { createLogger } from 'vite';
import { parse } from 'csv-parse/sync';
import { set } from 'lodash-es';
import { ExcelToI18nOptions } from '.';

const logger = createLogger('info', { prefix: '[csv-to-i18n]' });
const _dirname = path.resolve();

const writeFile = (langPath: string, data: { [key: string]: object }) => {
  Object.entries(data).forEach(([lang, localize]) => {
    const filePath = path.join(_dirname, langPath, `translation.${lang}.json`);
    fs.writeFileSync(filePath, JSON.stringify(localize, null, 2));
  });
};

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

    const localize: any = {};
    config.supportLanguages.forEach((lang) => {
      localize[lang] = {};
    });

    // CSV 데이터 처리
    records.forEach((row: any) => {
      // category가 undefined인 경우 빈 배열 반환
      const categoryPath = getCategoryPath(row['category']);
      // key가 없으면 처리하지 않음
      if (!row['key']) {
        return;
      }

      const key = categoryPath.concat(row['key']);

      config.supportLanguages.forEach((lang) => {
        set(localize[lang], key, row[lang] || '');
      });
    });

    // 출력 디렉토리가 없으면 생성
    const outputDir = path.join(_dirname, config.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    writeFile(config.outputDir, localize);
    logger.info(`${config.excelPath} 파일이 성공적으로 변환되었습니다.`, { timestamp: true });
  } catch (error) {
    logger.error(`CSV 파일 처리 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`, { timestamp: true });
  }
} 