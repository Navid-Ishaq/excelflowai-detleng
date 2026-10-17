import ExcelJS from 'exceljs';
import {validateDefinition,fileName,TEMPLATES} from './builder-schema.js';
import {sampleRecords} from './builder-data.js';
export function sourceModel(d,rows){const cols=validateDefinition(d);return {rows:[cols.map(c=>c.label),...rows],header:0,date1904:false,columns:cols.map((c,i)=>({id:i,key:`column_${i+1}`,schemaId:c.id,label:c.label,type:c.type,samples:rows.slice(0,3).map(r=>r[i])})),builder:{recognized:true,roles:Object.fromEntries(cols.flatMap((c,i)=>c.role?[[c.role,i]]:[])),numberStyle:d.numberStyle,dateOrder:d.dateFormat==='mm/dd/yyyy'?'mdy':'dmy',sampleData:rows.length>0}};}
export async function buildWorkbook(d,mode,{seed=Date.now(),now=new Date(),progress=()=>{}}={}){
 if(!['blank','sample'].includes(mode))throw Error('Choose Blank or Sample Workbook.');
 const cols=validateDefinition(d);progress('Building workbook structure…');
 progress(mode==='sample'?'Generating sample records…':'Preparing empty data-entry rows…');const rows=mode==='sample'?sampleRecords(d,seed,now):[];
 const w=new ExcelJS.Workbook();w.creator='ExcelFlow AI by DeTLeng';w.created=now;w.properties.subject=mode==='sample'?'Sample data — generated for demonstration and testing. Not real business records.':'Blank business data-entry workbook';
 const sheet=w.addWorksheet(d.sheetName,{views:[{state:'frozen',ySplit:1,showGridLines:false}],properties:{tabColor:{argb:'FF163D36'}}});
 sheet.addRow(cols.map(c=>c.label));sheet.getRow(1).height=34;
 sheet.autoFilter={from:{row:1,column:1},to:{row:d.rowCapacity+1,column:cols.length}};
 const lists=w.addWorksheet('_EF_Lists',{state:'veryHidden'});
 cols.forEach((c,i)=>{const col=sheet.getColumn(i+1);const textWidth=c.type==='Long Text / Notes'?44:c.type==='Reference / ID'?28:['Text','Status','Category'].includes(c.type)?30:18;col.width=Math.min(48,Math.max(textWidth,Math.min(36,c.label.length+3)));sheet.getRow(1).height=Math.max(sheet.getRow(1).height,Math.ceil(c.label.length/(col.width*.85))*15+12);const head=sheet.getCell(1,i+1);head.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF163D36'}};head.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};head.alignment={horizontal:'left',vertical:'middle',wrapText:true};
  if(c.validation.length){c.validation.forEach((v,r)=>lists.getCell(r+1,i+1).value=v);const letter=lists.getColumn(i+1).letter;w.definedNames.add(`'_EF_Lists'!$${letter}$1:$${letter}$${c.validation.length}`,`EF_List_${i+1}`);}
 });
 progress('Applying formats and validation…');
 for(let r=2;r<=d.rowCapacity+1;r++){
  const row=sheet.getRow(r);row.height=22;
  cols.forEach((c,i)=>{const cell=row.getCell(i+1);if(mode==='sample')cell.value=rows[r-2][i];cell.font={name:'Calibri',size:11,color:{argb:'FF163D36'}};cell.alignment={horizontal:'left',vertical:'middle',wrapText:!['Date','Number','Amount','Quantity','Percentage'].includes(c.type)};if(mode==='sample'&&typeof cell.value==='string')row.height=Math.max(row.height,Math.ceil(cell.value.length/(sheet.getColumn(i+1).width*.85))*14+8);
   if(r%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F6F3'}};
   if(c.role==='Amount')cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEAF3FB'}};
   cell.numFmt=c.type==='Date'?d.dateFormat:c.type==='Percentage'?'0.00%':['Number','Amount'].includes(c.type)?'#,##0.00;[Red]-#,##0.00':c.type==='Quantity'?'0':c.type==='Reference / ID'?'@':'General';
   if(c.validation.length)cell.dataValidation={type:'list',allowBlank:!c.required,formulae:[`EF_List_${i+1}`],showErrorMessage:true,errorStyle:'stop',errorTitle:'Choose a listed value',error:'Use the dropdown to choose a supported value.'};
   else if(['Amount','Number','Quantity','Percentage'].includes(c.type))cell.dataValidation={type:'decimal',operator:'between',formulae:c.type==='Percentage'?[0,1]:c.type==='Quantity'?[0,1000000]:[-1000000000,1000000000],allowBlank:!c.required,showErrorMessage:true,error:'Enter a numeric value within the supported range.'};
   else if(c.type==='Date')cell.dataValidation={type:'date',operator:'between',formulae:[new Date(Date.UTC(1900,0,1)),new Date(Date.UTC(9999,11,31))],allowBlank:!c.required,showErrorMessage:true,error:'Enter a valid Excel date.'};
  });
 }
 const meta={product:'ExcelFlow AI by DeTLeng',schemaVersion:1,builderSchemaVersion:1,templateId:d.templateId,templateVersion:1,templateName:TEMPLATES.find(t=>t.id===d.templateId).name,workbookName:d.workbookName,generatedAt:now.toISOString(),mode,sampleData:mode==='sample',rowCapacity:d.rowCapacity,sampleRecordCount:rows.length,dateFormat:d.dateFormat,numberStyle:d.numberStyle,dateOrder:d.dateFormat==='mm/dd/yyyy'?'mdy':'dmy',currency:d.currency,sourceSheet:d.sheetName,headerRow:1,columns:cols.map((c,i)=>({id:c.id,label:c.label,type:c.type,role:c.role,required:c.required,validation:c.validation,position:i+1}))};
 const ms=w.addWorksheet('_EF_Metadata',{state:'hidden'}),raw=JSON.stringify(meta);for(let i=0;i<raw.length;i+=20000)ms.addRow([i===0?'ExcelFlowAIBuilderMetadata':'Continuation',raw.slice(i,i+20000)]);
 progress('Preparing workbook…');const buffer=await w.xlsx.writeBuffer();return {buffer,name:fileName(d,mode),mode,model:mode==='sample'?sourceModel(d,rows):null,preview:rows.slice(0,10),metadata:meta};
}
