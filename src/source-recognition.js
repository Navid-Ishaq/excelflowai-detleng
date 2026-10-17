import {inspect} from './engine.js';
import {recognizeBuilder} from './builder-import.js';
import {detectReport} from './report-import.js';
// Recognition stays separate from heuristic suggestions: only validated mappings enter this path.
export function recognizeSource(workbook){
 const builder=recognizeBuilder(workbook);if(builder)return builder;
 if(workbook.getWorksheet('_EF_Metadata')?.getCell('A1').value!=='ExcelFlowAIMetadata')return null;
 try{
  const saved=detectReport(workbook);if(!saved.metadata)return null;
  const metadata=saved.metadata;
  if(!['dot','comma'].includes(metadata.numberStyle)||!['dmy','mdy'].includes(metadata.dateOrder))throw Error('Unsupported saved formats.');
  const model=inspect(workbook.getWorksheet('Report Data'));model.header=0;
  model.builder={recognized:true,roles:Object.fromEntries(Object.entries(metadata.roles).map(([role,id])=>[role,metadata.columns.find(c=>c.id===id).position-1])),numberStyle:metadata.numberStyle,dateOrder:metadata.dateOrder};
  return {sourceSheet:'Report Data',model};
 }catch{return {warning:'Saved report mappings could not be verified. Review the suggested roles before continuing.'};}
}
