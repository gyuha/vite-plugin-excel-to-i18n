use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use js_sys::{Array, Object, Reflect, JsString};
use wasm_bindgen::JsCast;
use calamine::{Reader, open_workbook_auto, DataType};
use std::collections::HashMap;

// JavaScript에서 전달받을 옵션 구조체
#[derive(Serialize, Deserialize)]
pub struct ExcelProcessingOptions {
    pub support_languages: Vec<String>,
    pub category_column_index: usize,
    pub key_column_index: usize,
    pub value_start_column_index: usize,
}

// Excel 처리 함수 - JavaScript에서 호출됨
#[wasm_bindgen]
pub fn process_excel(excel_data: &[u8], options_obj: JsValue) -> Result<JsValue, JsValue> {
    // 패닉 시 에러 메시지를 콘솔에 출력
    console_error_panic_hook::set_once();
    
    // 옵션 객체에서 필드 추출
    let options = parse_options(options_obj)?;
    
    // 결과를 저장할 해시맵
    let mut results: HashMap<String, HashMap<String, String>> = HashMap::new();
    
    // 각 언어별로 결과 해시맵 초기화
    for lang in &options.support_languages {
        results.insert(lang.clone(), HashMap::new());
    }
    
    // Excel 파일 읽기 (바이트 배열에서 직접 읽기)
    // 임시 파일에 바이트 배열 저장 후 읽기
    use std::fs::File;
    use std::io::Write;
    use std::env::temp_dir;
    use std::path::PathBuf;
    
    // 임시 파일 경로 생성
    let mut temp_path = temp_dir();
    temp_path.push("excel_data.xlsx");
    
    // 바이트 배열을 임시 파일에 쓰기
    let mut file = match File::create(&temp_path) {
        Ok(file) => file,
        Err(e) => return Err(JsValue::from_str(&format!("Failed to create temp file: {}", e))),
    };
    
    if let Err(e) = file.write_all(excel_data) {
        return Err(JsValue::from_str(&format!("Failed to write to temp file: {}", e)));
    }
    
    // 임시 파일에서 Excel 읽기 - temp_path를 참조로 전달
    let mut workbook = match open_workbook_auto(&temp_path) {
        Ok(wb) => wb,
        Err(e) => return Err(JsValue::from_str(&format!("Failed to read Excel data: {}", e))),
    };
    
    // 첫 번째 시트 가져오기
    if let Some(sheet_name) = workbook.sheet_names().get(0).cloned() {
        // worksheet_range의 반환 타입이 Option<Result<Range, Error>>이므로 이중 매치 사용
        match workbook.worksheet_range(&sheet_name) {
            Some(Ok(range)) => {
                // 첫 번째 행은 헤더로 간주하고 스킵
                for row_index in 1..range.height() {
                    let row = range.rows().nth(row_index);
                    if let Some(row) = row {
                        // 카테고리와 키 가져오기
                        let category = if options.category_column_index < row.len() {
                            match &row[options.category_column_index] {
                                DataType::String(s) => s.clone(),
                                _ => String::new(),
                            }
                        } else {
                            String::new()
                        };
                        
                        // 키 필드 처리
                        if options.key_column_index >= row.len() {
                            continue; // 키 열이 없으면 스킵
                        }
                        
                        let key = match &row[options.key_column_index] {
                            DataType::String(s) if !s.is_empty() => s.clone(),
                            _ => continue, // 키가 없으면 스킵
                        };
                        
                        // 각 언어별 값 처리
                        for (lang_index, lang) in options.support_languages.iter().enumerate() {
                            let value_index = options.value_start_column_index + lang_index;
                            
                            // 값이 범위를 벗어나면 건너뜀
                            if value_index >= row.len() {
                                continue;
                            }
                            
                            let value = match &row[value_index] {
                                DataType::String(s) => s.clone(),
                                DataType::Int(i) => i.to_string(),
                                DataType::Float(f) => f.to_string(),
                                DataType::Bool(b) => b.to_string(),
                                _ => String::new(),
                            };
                            
                            // 최종 키 생성 (카테고리가 있으면 카테고리/키 형식)
                            let full_key = if category.is_empty() {
                                key.clone()
                            } else {
                                format!("{}/{}", category, key)
                            };
                            
                            // 언어별 해시맵에 추가
                            if let Some(lang_map) = results.get_mut(lang) {
                                lang_map.insert(full_key, value);
                            }
                        }
                    }
                }
            },
            Some(Err(e)) => return Err(JsValue::from_str(&format!("Failed to get worksheet range: {}", e))),
            None => return Err(JsValue::from_str("Worksheet not found")),
        }
    }
    
    // 임시 파일 삭제
    if let Err(_) = std::fs::remove_file(&temp_path) {
        // 파일 삭제 실패 시 무시 (로그만 출력)
        log("Warning: Failed to delete temporary Excel file");
    }
    
    // 해시맵을 JavaScript 객체로 변환하여 반환
    match serde_wasm_bindgen::to_value(&results) {
        Ok(js_value) => Ok(js_value),
        Err(e) => Err(JsValue::from_str(&format!("Serialization error: {}", e))),
    }
}

// JavaScript 객체에서 Rust 구조체로 옵션 변환
fn parse_options(options: JsValue) -> Result<ExcelProcessingOptions, JsValue> {
    // JavaScript 배열을 Rust 벡터로 변환하는 함수
    fn js_array_to_vec(arr: &Array) -> Vec<String> {
        let mut result = Vec::with_capacity(arr.length() as usize);
        for i in 0..arr.length() {
            if let Some(item) = arr.get(i).as_string() {
                result.push(item);
            }
        }
        result
    }
    
    let obj = Object::from(options);
    
    // supportLanguages 배열 가져오기
    let support_languages = match Reflect::get(&obj, &JsString::from("supportLanguages")) {
        Ok(val) if val.is_object() => {
            let arr = val.dyn_into::<Array>()
                .map_err(|_| JsValue::from_str("supportLanguages is not an array"))?;
            js_array_to_vec(&arr)
        },
        _ => return Err(JsValue::from_str("supportLanguages is required and must be an array")),
    };
    
    // 나머지 필드 가져오기
    let category_column_index = Reflect::get(&obj, &JsString::from("categoryColumnIndex"))
        .map(|val| val.as_f64().unwrap_or(0.0) as usize)
        .unwrap_or(0);
        
    let key_column_index = Reflect::get(&obj, &JsString::from("keyColumnIndex"))
        .map(|val| val.as_f64().unwrap_or(1.0) as usize)
        .unwrap_or(1);
        
    let value_start_column_index = Reflect::get(&obj, &JsString::from("valueStartColumnIndex"))
        .map(|val| val.as_f64().unwrap_or(2.0) as usize)
        .unwrap_or(2);
    
    Ok(ExcelProcessingOptions {
        support_languages,
        category_column_index,
        key_column_index,
        value_start_column_index,
    })
}

// 웹 콘솔에 로그 출력을 위한 래퍼
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    
    #[wasm_bindgen(js_namespace = console, js_name = error)]
    fn error(s: &str);
} 