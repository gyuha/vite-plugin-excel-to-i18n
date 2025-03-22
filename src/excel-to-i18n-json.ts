/* eslint-disable @typescript-eslint/no-explicit-any */
import readXlsxFile from 'read-excel-file/node';
import path from 'path';
import { ExcelToI18nOptions } from '.';
import {
    _dirname,
    writeFile,
    initializeLocalize,
    processRow,
    ensureOutputDir,
    logger
} from './utils/i18n-utils';

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

export default function excelToI18nJson(config: ExcelToI18nOptions) {
    // 스키마에 지원 언어 추가
    config.supportLanguages.forEach((lang) => {
        if (schema[lang] === undefined) {
            schema[lang] = { prop: lang, type: String };
        }
    });

    const localize = initializeLocalize(config.supportLanguages);

    readXlsxFile(path.join(_dirname, config.excelPath), { schema }).then(({ rows, errors }) => {
        if (errors.length > 0) {
            logger.error(`Excel file reading error: ${errors.join(', ')}`, { timestamp: true });
            return;
        }
        try {
            rows.forEach((row: any) => {
                processRow(row, localize, config.supportLanguages);
            });

            ensureOutputDir(config.outputDir);
            writeFile(config.outputDir, localize);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Error processing Excel file: ${errorMessage}`, { timestamp: true });
            return;
        }
        logger.info(`${config.excelPath} file has been successfully converted.`, { timestamp: true });
    }).catch(error => {
        logger.error(`Failed to read Excel file: ${error.message}`, { timestamp: true });
    });
}
