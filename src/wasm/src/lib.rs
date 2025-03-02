use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use calamine::{Reader, Xlsx, open_workbook_from_rs};
use std::io::Cursor;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen(js_namespace = console, js_name = error)]
    fn error(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format!($($t)*)))
}

macro_rules! console_error {
    ($($t:tt)*) => (error(&format!($($t)*)))
}

// ExcelToI18nOptions 구조체 정의 - wasm_bindgen 속성 없이 정의
#[derive(Serialize, Deserialize)]
pub struct ExcelToI18nOptions {
    pub excel_path: String,
    pub output_dir: String,
    pub support_languages: Vec<String>,
}

// JavaScript에서 사용할 수 있는 래퍼 함수
#[wasm_bindgen]
pub fn process_excel_file(excel_data: &[u8], support_languages: js_sys::Array) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    
    let support_langs: Vec<String> = support_languages
        .iter()
        .map(|lang| lang.as_string().unwrap_or_default())
        .collect();
    
    console_log!("Processing Excel file...");
    
    // 각 언어별 로컬라이즈 데이터를 저장할 해시맵
    let mut localize: HashMap<String, HashMap<String, String>> = HashMap::new();
    
    // 지원 언어별로 빈 해시맵 초기화
    for lang in &support_langs {
        localize.insert(lang.clone(), HashMap::new());
    }
    
    // Excel 파일 열기
    let cursor = Cursor::new(excel_data);
    let mut workbook: Xlsx<_> = match open_workbook_from_rs(cursor) {
        Ok(wb) => wb,
        Err(e) => {
            let error_msg = format!("Excel 파일 읽기 실패: {}", e);
            console_error!("{}", error_msg);
            return Err(JsValue::from_str(&error_msg));
        }
    };
    
    // 첫 번째 시트 가져오기
    let sheet_name = match workbook.sheet_names().first() {
        Some(name) => name.clone(),
        None => {
            let error_msg = "Excel 파일에 시트가 없습니다.";
            console_error!("{}", error_msg);
            return Err(JsValue::from_str(error_msg));
        }
    };
    
    // 시트 데이터 가져오기
    let range = match workbook.worksheet_range(&sheet_name) {
        Some(Ok(range)) => range,
        Some(Err(e)) => {
            let error_msg = format!("시트 데이터를 읽을 수 없습니다: {}", e);
            console_error!("{}", error_msg);
            return Err(JsValue::from_str(&error_msg));
        },
        None => {
            let error_msg = "시트를 찾을 수 없습니다.";
            console_error!("{}", error_msg);
            return Err(JsValue::from_str(error_msg));
        }
    };
    
    // 헤더 행 가져오기
    if range.height() < 2 {
        let error_msg = "Excel 파일에 데이터가 충분하지 않습니다.";
        console_error!("{}", error_msg);
        return Err(JsValue::from_str(error_msg));
    }
    
    let headers: Vec<String> = range.rows()
        .next()
        .unwrap()
        .iter()
        .map(|cell| cell.to_string())
        .collect();
    
    // 헤더에서 category와 key 인덱스 찾기
    let category_idx = headers.iter().position(|h| h == "category");
    let key_idx = match headers.iter().position(|h| h == "key") {
        Some(idx) => idx,
        None => {
            let error_msg = "Excel 파일에 'key' 열이 없습니다.";
            console_error!("{}", error_msg);
            return Err(JsValue::from_str(error_msg));
        }
    };
    
    // 지원 언어 인덱스 찾기
    let lang_indices: HashMap<String, usize> = support_langs
        .iter()
        .filter_map(|lang| {
            headers.iter().position(|h| h == lang).map(|idx| (lang.clone(), idx))
        })
        .collect();
    
    // 데이터 행 처리
    for row in range.rows().skip(1) {
        // key가 없으면 처리하지 않음
        if row.get(key_idx).map_or(true, |cell| cell.is_empty()) {
            continue;
        }
        
        let key_value = row[key_idx].to_string();
        
        // category 처리
        let category_path = match category_idx {
            Some(idx) if row.get(idx).map_or(false, |cell| !cell.is_empty()) => {
                row[idx].to_string().split('/').map(String::from).collect::<Vec<String>>()
            },
            _ => Vec::new(),
        };
        
        // 전체 키 경로 생성
        let mut full_key = category_path.clone();
        full_key.push(key_value);
        let key_path = full_key.join(".");
        
        // 각 언어별 값 설정
        for (lang, &idx) in &lang_indices {
            let value = row.get(idx).map_or(String::new(), |cell| cell.to_string());
            if let Some(lang_map) = localize.get_mut(lang) {
                lang_map.insert(key_path.clone(), value);
            }
        }
    }
    
    // 각 언어별 JSON 데이터 생성
    let mut result = HashMap::new();
    for (lang, translations) in localize {
        // 중첩된 객체 구조로 변환
        let nested = create_nested_structure(&translations);
        
        // JSON 문자열로 변환
        let json = match serde_json::to_string_pretty(&nested) {
            Ok(json) => json,
            Err(e) => {
                let error_msg = format!("JSON 변환 실패: {}", e);
                console_error!("{}", error_msg);
                return Err(JsValue::from_str(&error_msg));
            }
        };
        
        result.insert(lang, json);
    }
    
    // 결과를 JavaScript 객체로 변환
    console_log!("변환 결과: {:?}", result);
    console_log!("지원 언어: {:?}", support_langs);
    console_log!("결과 언어 수: {}", result.len());
    
    for (lang, json) in &result {
        console_log!("언어 {}: {} 바이트", lang, json.len());
    }
    
    // JavaScript 객체 생성
    let js_obj = js_sys::Object::new();
    
    for (lang, json) in result {
        let js_str = JsValue::from_str(&json);
        js_sys::Reflect::set(&js_obj, &JsValue::from_str(&lang), &js_str)
            .map_err(|e| JsValue::from_str(&format!("JavaScript 객체 속성 설정 실패: {:?}", e)))?;
    }
    
    console_log!("Excel 파일이 성공적으로 변환되었습니다.");
    Ok(js_obj.into())
}

// 점(.)으로 구분된 키를 중첩된 객체 구조로 변환
fn create_nested_structure(flat_map: &HashMap<String, String>) -> serde_json::Value {
    let mut result = serde_json::Map::new();
    
    for (key, value) in flat_map {
        let parts: Vec<&str> = key.split('.').collect();
        set_nested_value(&mut result, &parts, value);
    }
    
    serde_json::Value::Object(result)
}

// 중첩 구조에 값을 설정하는 헬퍼 함수
fn set_nested_value(obj: &mut serde_json::Map<String, serde_json::Value>, parts: &[&str], value: &str) {
    if parts.is_empty() {
        return;
    }
    
    if parts.len() == 1 {
        // 마지막 부분은 값으로 설정
        obj.insert(parts[0].to_string(), serde_json::Value::String(value.to_string()));
        return;
    }
    
    // 중간 부분은 객체로 설정
    let current_part = parts[0];
    
    if !obj.contains_key(current_part) {
        obj.insert(current_part.to_string(), serde_json::Value::Object(serde_json::Map::new()));
    }
    
    // 다음 레벨로 재귀 호출
    if let Some(serde_json::Value::Object(next_obj)) = obj.get_mut(current_part) {
        set_nested_value(next_obj, &parts[1..], value);
    }
}
