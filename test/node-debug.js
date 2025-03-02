const fs = require('fs');
const path = require('path');

// Import the WASM module
async function runTest() {
  try {
    // Dynamic import of WASM module using the correct filename
    const wasmModulePath = path.resolve(__dirname, '../pkg/excel_to_i18n.js');
    console.log(`Importing WASM module from ${wasmModulePath}`);
    
    // Check if the file exists before trying to import it
    if (!fs.existsSync(wasmModulePath)) {
      throw new Error(`WASM module not found at ${wasmModulePath}`);
    }
    
    const wasmModule = await import(wasmModulePath);
    
    // Read test Excel file
    const excelFilePath = path.join(__dirname, '../example/language.xlsx');
    
    const excelData = fs.readFileSync(excelFilePath);
    
    // Options for Excel processing
    const options = {
      supportLanguages: ['en', 'ko', 'ja'],
      categoryColumnIndex: 0,
      keyColumnIndex: 1,
      valueStartColumnIndex: 2
    };
    
    console.log('Processing Excel file...');
    
    // Call the WASM function
    const result = wasmModule.process_excel(new Uint8Array(excelData), options);
    
    // Log results
    console.log('Processing completed successfully.');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error during WASM execution:');
    console.error(error);
  }
}

runTest().catch(console.error);
