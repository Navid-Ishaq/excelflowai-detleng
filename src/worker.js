import ExcelJS from 'exceljs';
import {inspect,columns,prepare} from './engine.js';
import {generate} from './export.js';
import {detectReport,importDataset} from './report-import.js';
import {guardWorkbook} from './workbook-guard.js';
import {recognizeSource} from './source-recognition.js';
let workbook,detected,builderSource;
self.onmessage=async({data:m})=>{
  const progress=stage=>self.postMessage({type:'progress',stage});
  try{
    if(m.type==='load'||m.type==='existing-load'){
      progress('Reading workbook contents locally…');guardWorkbook(m.buffer);workbook=new ExcelJS.Workbook();detected=null;await workbook.xlsx.load(m.buffer);
      if(m.type==='load'){builderSource=recognizeSource(workbook);const sheets=workbook.worksheets.filter(s=>!['_EF_Metadata','_EF_Lists'].includes(s.name)).map(s=>s.name);if(builderSource?.sourceSheet)sheets.sort((a,b)=>a===builderSource.sourceSheet?-1:b===builderSource.sourceSheet?1:0);self.postMessage({type:'loaded',sheets});}
      else{
        progress('Validating ExcelFlow AI structure…');detected=detectReport(workbook);progress('Loading Report Data and normalizing records…');
        if(detected.kind==='verified')self.postMessage({type:'existing-ready',dataset:importDataset(detected,null,m.name)});
        else self.postMessage({type:'existing-detected',detected:{columns:detected.model.columns,warning:detected.warning}});
      }
    }
    if(m.type==='existing-confirm'){
      if(!detected)throw Error('Choose the report file again to restore the compatibility session.');
      if(Object.entries(m.roles).some(([,id])=>!detected.model.columns.some(c=>c.id===id)))throw Error('Choose valid columns for the report roles.');
      detected.numberStyle=m.numberStyle;detected.dateOrder=m.dateOrder;
      self.postMessage({type:'existing-ready',dataset:importDataset(detected,m.roles,m.name)});
    }
    if(m.type==='sheet'){const model=m.name===builderSource?.sourceSheet?builderSource.model:inspect(workbook.getWorksheet(m.name));model.date1904=!!workbook.properties.date1904;if(builderSource?.warning&&!model.builder)model.builder={recognized:false,roles:{},warning:builderSource.warning};self.postMessage({type:'model',model});}
    if(m.type==='generate'){const model=m.model;model.columns=columns(model.rows,model.header);const data=prepare(model,m.config);const buffer=await generate(model,m.config,data,progress);self.postMessage({type:'result',buffer,data});}
  }catch(e){const known=/ExcelFlow AI|Report Data|report exceeds|Workbook contents exceed|Workbook is too complex|Encrypted workbooks|unsupported large-file|ZIP structure/.test(e.message||'');self.postMessage({type:'error',message:(m.type==='load'||m.type==='existing-load')&&!known?'Workbook could not be read. Use an unencrypted .xlsx file.':e.message});}
};
