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
            logger.error(`Excel file reading error: ${errors.join(', ')}`, { timestamp: true });
            return;
        }
        try {
            rows.forEach((row: any) => {
                // Handle undefined category as empty array
                const categoryPath = row['category'] ? row['category'].split('/') : [];
                // Skip processing if key is missing
                if (!row['key']) {
                    return;
                }
                
                const key = [...categoryPath, row['key']];

                config.supportLanguages.forEach((lang) => {
                    set(localize[lang], key, row[lang] || '');
                });
            });

            // Create output directory if it doesn't exist
            const outputDir = path.join(_dirname, config.outputDir);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            writeFile(config.outputDir, localize);
        } catch (error) {
            console.error('Error occurred while processing Excel:', error);
            return;
        }
        logger.info(`${config.excelPath} file has been successfully converted.`, { timestamp: true });
    }).catch(error => {
        logger.error(`Failed to read Excel file: ${error.message}`, { timestamp: true });
    });
}
