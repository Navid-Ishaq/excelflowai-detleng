import {scalar,columns,prepare,period,ROLES} from './engine.js';
import {sessionDataset} from './live-engine.js';
export const METADATA_SHEET='_EF_Metadata';
export function addMetadata(workbook,model,config){
  const s=workbook.addWorksheet(METADATA_SHEET,{state:'hidden'});
  // Configuration only: no transaction copies, credentials or session identifiers.
  const exported=model.columns.filter(col=>config.selected.includes(col.id)).sort((a,b)=>config.selected.indexOf(a.id)-config.selected.indexOf(b.id));
  const roles=Object.fromEntries(Object.entries(config.roles).filter(([,id])=>config.selected.includes(id)));
  const range=period(config.period,config.start,config.end);
  const metadata={product:'ExcelFlow AI by DeTLeng',schemaVersion:1,generatedAt:new Date().toISOString(),reportSheet:'Report Data',headerRow:1,
    columns:exported.map((col,i)=>({id:col.id,key:col.key,label:col.label,position:i+1})),roles,period:{key:config.period,start:range?.[0]||'',end:range?.[1]||''},numberStyle:'dot',dateOrder:config.dateOrder,
    groups:(config.groups||[]).map(({column,mode,dateLevel,sort,direction,chart})=>({column,mode,dateLevel,sort,direction,chart}))};
  const json=JSON.stringify(metadata);for(let i=0;i<json.length;i+=20000){const row=s.addRow([i===0?'ExcelFlowAIMetadata':'Continuation',json.slice(i,i+20000)]);row.alignment={horizontal:'left',vertical:'middle'};}
}
export function detectReport(workbook){
  const sheet=workbook.getWorksheet('Report Data');
  if(!sheet)throw Error('This workbook has no Report Data sheet. Choose a complete ExcelFlow AI report, or use Create New Report for source data.');
  if(sheet.rowCount<2)throw Error('Report Data contains no records. Choose another report.');
  if(sheet.rowCount>200001||sheet.columnCount>256)throw Error('This report exceeds the supported 200,000 rows or 256 columns. Choose a smaller report.');
  const rows=[],width=sheet.columnCount;sheet.eachRow({includeEmpty:true},r=>rows.push(Array.from({length:width},(_,i)=>scalar(r.getCell(i+1).value))));
  const model={rows,header:0,date1904:!!workbook.properties.date1904};model.columns=columns(rows,0);
  if(!model.columns.length)throw Error('Report Data has no usable headers.');
  const metadataSheet=workbook.getWorksheet(METADATA_SHEET);
  if(!metadataSheet)return {kind:'compatible',model};
  let metadata;try{if(metadataSheet.getCell('A1').value!=='ExcelFlowAIMetadata'||metadataSheet.rowCount>50)throw Error();let raw='';for(let i=1;i<=metadataSheet.rowCount;i++){const part=metadataSheet.getCell(i,2).value;if(typeof part!=='string')throw Error();raw+=part;}if(raw.length>1000000)throw Error();metadata=JSON.parse(raw);}catch{throw Error('ExcelFlow AI metadata is corrupted. Use an original report or remove the damaged metadata sheet in a copy to confirm roles manually.');}
  if(metadata.schemaVersion!==1)throw Error('This ExcelFlow AI metadata version is unsupported. Use a compatible version of the report.');
  if(metadata.product!=='ExcelFlow AI by DeTLeng'||metadata.reportSheet!=='Report Data'||metadata.headerRow!==1||!Array.isArray(metadata.columns)||metadata.columns.length!==sheet.columnCount)throw Error('ExcelFlow AI metadata does not match Report Data. Confirm the workbook was not structurally changed.');
  const ids=new Set(),positions=new Set();for(const col of metadata.columns){if(!col||!Number.isInteger(col.id)||col.id<0||col.id>255||ids.has(col.id)||col.key!==`column_${col.id+1}`||!Number.isInteger(col.position)||col.position<1||col.position>sheet.columnCount||positions.has(col.position)||String(rows[0][col.position-1]??'')!==col.label)throw Error('ExcelFlow AI metadata refers to a missing or changed column.');ids.add(col.id);positions.add(col.position);}
  if(!metadata.roles||Object.entries(metadata.roles).some(([role,id])=>!ROLES.includes(role)||!ids.has(id))||new Set(Object.values(metadata.roles)).size!==Object.values(metadata.roles).length)throw Error('ExcelFlow AI role mappings are invalid.');
  if(metadata.roles.Amount==null)return {kind:'compatible',model,metadata,warning:'The saved report does not include a mapped Amount column. Confirm a usable column below.'};
  const restoredRows=rows.map(row=>{const next=[];for(const col of metadata.columns)next[col.id]=row[col.position-1];return next;});
  return {kind:'verified',model:{...model,rows:restoredRows,columns:metadata.columns.map(c=>({...c,samples:[]}))},metadata};
}
export function importDataset(detected,roles,name){
  const {model,metadata}=detected;
  const c={selected:model.columns.map(col=>col.id),reports:['Report Data','Inflows'],roles:roles||metadata?.roles||{},period:'all',groups:[],numberStyle:detected.numberStyle||metadata?.numberStyle||'dot',dateOrder:detected.dateOrder||metadata?.dateOrder||'dmy'};
  if(c.roles.Amount==null)throw Error('Choose the Amount column before opening Live Analytics.');
  const data=prepare(model,c);if(!data.records.some(r=>r.amount!=null))throw Error('The chosen Amount column has no usable numeric values.');
  const dataset=sessionDataset(model,c,data,name);dataset.period=metadata?.period||{key:'all'};dataset.metadata={name,source:'existing',generatedAt:metadata?.generatedAt,recognition:detected.kind};return dataset;
}
