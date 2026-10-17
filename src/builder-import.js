import {inspect,columns,ROLES} from './engine.js';
import {TYPES,DATE_FORMATS,CURRENCIES} from './builder-schema.js';
export function recognizeBuilder(w){
 const sheet=w.getWorksheet('_EF_Metadata');if(sheet?.getCell('A1').value!=='ExcelFlowAIBuilderMetadata')return null;
 let m;try{if(sheet.rowCount>50)throw Error();let raw='';for(let r=1;r<=sheet.rowCount;r++){const v=sheet.getCell(r,2).value;if(typeof v!=='string')throw Error();raw+=v;}if(raw.length>1000000)throw Error();m=JSON.parse(raw);}catch{return {warning:'Builder metadata is damaged. Review the source and map roles manually.'};}
 if(m.product!=='ExcelFlow AI by DeTLeng'||m.schemaVersion!==1||m.builderSchemaVersion!==1||!Array.isArray(m.columns)||m.columns.length<1||m.columns.length>64||m.headerRow!==1||typeof m.sourceSheet!=='string'||!DATE_FORMATS.includes(m.dateFormat)||!CURRENCIES.includes(m.currency)||!['dot','comma'].includes(m.numberStyle))return {warning:'Builder metadata is unsupported. Review the source and map roles manually.'};
 const ids=new Set(),roles=new Set(),positions=new Set();for(const c of m.columns){if(!c||typeof c.id!=='string'||ids.has(c.id)||typeof c.label!=='string'||!TYPES.includes(c.type)||!Number.isInteger(c.position)||c.position<1||c.position>64||positions.has(c.position)||c.role&&(!ROLES.includes(c.role)||roles.has(c.role)))return {warning:'Builder metadata contains invalid mappings. Review roles manually.'};ids.add(c.id);positions.add(c.position);if(c.role)roles.add(c.role);}
 const data=w.getWorksheet(m.sourceSheet);if(!data)return {warning:'The Builder data sheet was renamed or removed. Choose a source worksheet and confirm its roles.'};
 const model=inspect(data);model.header=0;model.date1904=!!w.properties.date1904;model.columns=columns(model.rows,0);
 const rolesByPosition={},unresolved=[];
 for(const c of m.columns){const matches=model.columns.filter(x=>x.label===c.label);if(matches.length===1){const match=matches[0];match.schemaId=c.id;match.type=c.type;if(c.role)rolesByPosition[c.role]=match.id;}else if(c.role)unresolved.push(c.role);}
 model.builder={recognized:true,sampleData:m.sampleData===true,roles:rolesByPosition,numberStyle:m.numberStyle,dateOrder:m.dateOrder==='mdy'?'mdy':'dmy',warning:unresolved.length?`Changed or missing fields need confirmation: ${unresolved.join(', ')}. Unambiguous fields were restored.`:'',currency:m.currency};
 return {sourceSheet:data.name,model};
}
