/* eslint-disable @typescript-eslint/no-explicit-any */
import { forEach, set } from 'lodash-es';
import readXlsxFile from 'read-excel-file/node';

import fs from 'fs';
import path from 'path';
import { createLogger } from 'vite';
import { ExcelToI18nOptions } from '.';

const logger = createLogger('info', { prefix: '[language]' });

const _dirname = path.resolve();

const schema: any = {
    category: {
        prop: 'category',
        type: String,
    },
    key: {
        prop: 'key',
        type: String,
    },
};

const writeFile = (langPath: string, data: { [key: string]: object }) => {
    forEach(data, (localize: any, lang: string) => {
        const filePath = path.join(_dirname, langPath, `translation.${lang}.json`);
        fs.writeFileSync(filePath, JSON.stringify(localize, null, 2));
    });
};

export default function excelToI18nJson(config: ExcelToI18nOptions) {
    config.supportLanguages.forEach((lang) => {
        if (schema[lang] === undefined) {
            schema[lang] = { prop: lang, type: String };
        }
    });

    const localize: any = {};
    config.supportLanguages.forEach((lang) => {
        localize[lang] = {};
    });

    readXlsxFile(path.join(_dirname, config.excelPath), { schema }).then(({ rows, errors }) => {
        if (errors.length > 0) {
            logger.error(`Excel 파일 읽기 오류: ${errors.join(', ')}`, { timestamp: true });
            return;
        }
        try {
            rows.forEach((row: any) => {
                // category가 undefined인 경우 빈 문자열로 처리
                const categoryPath = row['category'] ? row['category'].split('/') : [];
                // key가 없으면 처리하지 않음
                if (!row['key']) {
                    return;
                }
                
                const key = [...categoryPath, row['key']];

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
        } catch (error) {
            console.error('엑셀 처리 중 오류 발생:', error);
            return;
        }
        logger.info(`${config.excelPath} 파일이 성공적으로 변환되었습니다.`, { timestamp: true });
    }).catch(error => {
        logger.error(`엑셀 파일 읽기 실패: ${error.message}`, { timestamp: true });
    });
}
