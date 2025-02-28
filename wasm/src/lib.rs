use wasm_bindgen::prelude::*;
use calamine::{Reader, Xlsx};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::io::Cursor;

// 콘솔 로그 매크로 정의
macro_rules! console_log {
    ($($t:tt)*) => (web_sys::console::log_1(&format!($($t)*).into()))
}

// TypeScript의 ExcelToI18nOptions와 동일한 설정 구조체
#[derive(Deserialize)]
pub struct ExcelToI18nOptions {
    pub excel_data: Vec<u8>,
    #[serde(default = "default_category_column_index")]
    pub category_column_index: usize,
    #[serde(default = "default_key_column_index")]
    pub key_column_index: usize,
    #[serde(default = "default_value_start_column_index")]
    pub value_start_column_index: usize,
    pub sheet_name: Option<String>,
    #[serde(default = "default_header_row_index")]
    pub header_row_index: usize,
    #[serde(default = "default_data_start_row_index")]
    pub data_start_row_index: usize,
    #[serde(default = "default_use_nested_keys")]
    pub use_nested_keys: bool,
}

// 기본값 함수들
fn default_category_column_index() -> usize { 0 }
fn default_key_column_index() -> usize { 1 }
fn default_value_start_column_index() -> usize { 2 }
fn default_header_row_index() -> usize { 0 }
fn default_data_start_row_index() -> usize { 1 }
fn default_use_nested_keys() -> bool { false }

// 결과 반환 타입
#[derive(Serialize)]
pub struct ConversionResult {
    pub success: bool,
    pub translations: HashMap<String, serde_json::Value>,
    pub error: Option<String>,
}

#[wasm_bindgen]
pub fn convert_excel_to_i18n(options_js: JsValue) -> Result<JsValue, JsValue> {
    // 옵션 파싱
    let options: ExcelToI18nOptions = serde_wasm_bindgen::from_value(options_js)?;
    
    // 결과 초기화
    let mut result = ConversionResult {
        success: false,
        translations: HashMap::new(),
        error: None,
    };
    
    // Excel 바이너리 데이터로부터 워크북 열기
    let cursor = Cursor::new(options.excel_data);
    
    match Xlsx::new(cursor) {
        Ok(mut workbook) => {
            // 시트 선택
            let sheet_name = match &options.sheet_name {
                Some(name) => name.clone(),
                None => {
                    match workbook.sheet_names().first() {
                        Some(first_sheet) => first_sheet.clone(),
                        None => {
                            result.error = Some("No sheets found in Excel file".to_string());
                            return Ok(serde_wasm_bindgen::to_value(&result).unwrap());
                        }
                    }
                }
            };
            
            // 선택한 시트 읽기
            match workbook.worksheet_range(&sheet_name) {
                Some(Ok(range)) => {
                    // 헤더 행에서 언어 코드 추출
                    let header_row = range.rows().nth(options.header_row_index);
                    if header_row.is_none() {
                        result.error = Some(format!("Header row {} not found", options.header_row_index));
                        return Ok(serde_wasm_bindgen::to_value(&result).unwrap());
                    }
                    
                    let header_row = header_row.unwrap();
                    let mut languages = Vec::new();
                    
                    // 언어 코드 추출
                    for i in options.value_start_column_index..header_row.len() {
                        if let Some(lang_cell) = header_row.get(i) {
                            if let Some(lang) = lang_cell.get_string() {
                                languages.push(lang.to_string());
                            }
                        }
                    }
                    
                    // 각 언어별 번역 데이터 객체 초기화
                    let mut translations: HashMap<String, serde_json::Value> = HashMap::new();
                    for lang in &languages {
                        translations.insert(lang.clone(), serde_json::json!({}));
                    }
                    
                    // 데이터 행 처리
                    for (row_idx, row) in range.rows().enumerate().skip(options.data_start_row_index) {
                        if row_idx < options.data_start_row_index {
                            continue;
                        }
                        
                        if row.len() <= options.key_column_index {
                            continue;
                        }
                        
                        let category_cell = row.get(options.category_column_index);
                        let key_cell = row.get(options.key_column_index);
                        
                        let category = match category_cell {
                            Some(cell) => cell.get_string().unwrap_or("").to_string(),
                            None => "".to_string(),
                        };
                        
                        let key = match key_cell {
                            Some(cell) => cell.get_string().unwrap_or("").to_string(),
                            None => "".to_string(),
                        };
                        
                        if key.is_empty() {
                            continue;
                        }
                        
                        // 각 언어별 번역 값 추출
                        for (lang_idx, lang) in languages.iter().enumerate() {
                            let col_idx = options.value_start_column_index + lang_idx;
                            if col_idx >= row.len() {
                                continue;
                            }
                            
                            let value_cell = row.get(col_idx);
                            let value = match value_cell {
                                Some(cell) => {
                                    if let Some(s) = cell.get_string() {
                                        s.to_string()
                                    } else if let Some(f) = cell.get_float() {
                                        f.to_string()
                                    } else if let Some(i) = cell.get_int() {
                                        i.to_string()
                                    } else {
                                        "".to_string()
                                    }
                                },
                                None => "".to_string(),
                            };
                            
                            if !value.is_empty() {
                                let translation_obj = translations.get_mut(lang).unwrap();
                                
                                if options.use_nested_keys && !category.is_empty() {
                                    // 중첩된 키 사용 (카테고리/키 형식)
                                    if !translation_obj.as_object().unwrap().contains_key(&category) {
                                        translation_obj[&category] = serde_json::json!({});
                                    }
                                    translation_obj[&category][&key] = serde_json::json!(value);
                                } else {
                                    // 카테고리와 키를 결합한 형식 (category/key)
                                    let full_key = if !category.is_empty() {
                                        format!("{}/{}", category, key)
                                    } else {
                                        key.clone()
                                    };
                                    translation_obj[&full_key] = serde_json::json!(value);
                                }
                            }
                        }
                    }
                    
                    result.translations = translations;
                    result.success = true;
                },
                Some(Err(e)) => {
                    result.error = Some(format!("Error reading sheet: {}", e));
                },
                None => {
                    result.error = Some(format!("Sheet '{}' not found", sheet_name));
                }
            }
        },
        Err(e) => {
            result.error = Some(format!("Error opening Excel file: {}", e));
        }
    }
    
    Ok(serde_wasm_bindgen::to_value(&result).unwrap())
}

// 웹 바인딩 초기화 함수
#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    console_log!("Excel to i18n WASM module initialized");
    Ok(())
} 