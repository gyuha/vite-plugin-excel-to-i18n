import fs from 'fs';
import path from 'path';
import { createLogger } from 'vite';
import { set } from 'lodash-es';
import { ExcelToI18nOptions } from '..';

export const logger = createLogger('info', { prefix: '[i18n]' });
export const _dirname = path.resolve();

/**
 * 카테고리 경로를 배열로 변환
 * @param category 카테고리 문자열 (예: 'common/button' 또는 'common.button')
 * @returns 카테고리 경로 배열
 */
export const getCategoryPath = (category: string): string[] => {
  if (!category) return [];
  // '/' 또는 '.'로 분리하여 배열로 변환
  return category.split(/[/.]/);
};

/**
 * 번역 파일 작성
 * @param langPath 언어 파일 경로
 * @param data 번역 데이터
 */
export const writeFile = (langPath: string, data: { [key: string]: object }) => {
  Object.entries(data).forEach(([lang, localize]) => {
    const filePath = path.join(_dirname, langPath, `translation.${lang}.json`);
    fs.writeFileSync(filePath, JSON.stringify(localize, null, 2));
  });
};

/**
 * 초기 지역화 객체 생성
 * @param supportLanguages 지원하는 언어 배열
 * @returns 초기화된 지역화 객체
 */
export const initializeLocalize = (supportLanguages: string[]): { [key: string]: object } => {
  const localize: { [key: string]: object } = {};
  supportLanguages.forEach((lang) => {
    localize[lang] = {};
  });
  return localize;
};

/**
 * 행 데이터를 지역화 객체에 추가
 * @param row 행 데이터
 * @param localize 지역화 객체
 * @param supportLanguages 지원하는 언어 배열
 */
export const processRow = (
  row: any,
  localize: { [key: string]: object },
  supportLanguages: string[]
) => {
  const categoryPath = getCategoryPath(row['category']);
  if (!row['key']) return;

  const key = categoryPath.concat(row['key']);
  supportLanguages.forEach((lang) => {
    set(localize[lang], key, row[lang] || '');
  });
};

/**
 * 출력 디렉토리 생성
 * @param outputDir 출력 디렉토리 경로
 */
export const ensureOutputDir = (outputDir: string) => {
  const fullPath = path.join(_dirname, outputDir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}; 