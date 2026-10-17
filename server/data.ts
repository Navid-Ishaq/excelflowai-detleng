import {z} from 'zod';
import ExcelJS from 'exceljs';
import {guardWorkbook} from '../src/workbook-guard.js';
import {inspect,columns,scalar,number,date} from '../src/engine.js';
import {analyze} from '../src/analysis.js';
export const cell=z.union([z.string().max(32767),z.number().finite(),z.boolean(),z.null()]);
const column=z.object({id:z.number().int().min(0).max(16383),label:z.string().max(500)});
const role=z.record(z.string(),z.number().int().min(0).max(16383));
export const datasetSchema=z.object({columns:z.array(column).min(1).max(512),roles:role,records:z.array(z.object({values:z.array(cell).max(16384),amount:z.number().finite().nullable(),day:z.string().nullable()})).min(1).max(100000),period:z.object({key:z.string(),start:z.string(),end:z.string()}),numberStyle:z.enum(['dot','comma']),dateOrder:z.enum(['dmy','mdy']),metadata:z.object({name:z.string().max(300),source:z.string()})});
export const uploadSchema=z.object({consent:z.literal(true),processed:datasetSchema,raw:z.object({name:z.string().max(300),base64:z.string().max(28*1024*1024),sheet:z.string().max(300).optional(),header:z.number().int().min(0).max(100000).optional(),roles:role.optional()}).optional()});
export type Dataset=z.infer<typeof datasetSchema>;
export type Table={id:string,name:string,columns:{id:number,label:string}[],roles:Record<string,number>,records:{id:string,values:any[],amount:number|null,day:string|null}[],numberStyle:'dot'|'comma',dateOrder:'dmy'|'mdy',date1904?:boolean,structure?:{id:string,values:any[],amount:null,day:null}[],header:number};
export type DataSession={tables:Table[],processed:Dataset,created:number,touched:number,bytes:number,history:{role:'user'|'assistant',content:string}[]};
export function validateDataset(data:Dataset){
 const ids=new Set(data.columns.map(c=>c.id));if(ids.size!==data.columns.length)throw Error('Duplicate column IDs.');
 for(const id of Object.values(data.roles))if(!ids.has(id))throw Error('Role references an unavailable column.');
 if(new Set(Object.values(data.roles)).size!==Object.values(data.roles).length)throw Error('A column has multiple roles.');
 for(const record of data.records){if(data.columns.some(c=>c.id>=record.values.length))throw Error('Record has missing columns.');
 // The browser supplies normalized fields for display only. Recompute authoritative values.
 record.amount=data.roles.Amount==null?null:number(record.values[data.roles.Amount],data.numberStyle);
 record.day=data.roles.Date==null?null:date(record.values[data.roles.Date],data.dateOrder,false);
 }
 return data;
}
export async function createData(input:z.infer<typeof uploadSchema>):Promise<DataSession>{
 const data=validateDataset(input.processed);
 const tables:Table[]=[{id:'processed',name:'Processed Report Data',columns:data.columns,roles:data.roles,records:data.records.map((r,i)=>({...r,id:`processed:r${i+1}`})),numberStyle:data.numberStyle,dateOrder:data.dateOrder,header:0}];
 if(input.raw){const b=Buffer.from(input.raw.base64,'base64');if(!b.length||b.length>20*1024*1024)throw Error('Raw workbook exceeds 20 MB or is empty.');guardWorkbook(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));const book=new ExcelJS.Workbook();await book.xlsx.load(b as any);
 let cells=0;
 for(const [i,sheet] of book.worksheets.entries()){

 cells+=sheet.rowCount*sheet.columnCount;if(cells>2000000||sheet.columnCount>512||sheet.rowCount>100001)throw Error('AI workbook capacity exceeded (2 million cells, 100,000 rows per sheet, 512 columns).');
 const model=inspect(sheet);const selected=sheet.name===input.raw.sheet;
 const header=selected&&input.raw.header!=null?input.raw.header:model.header;
 if(header>=model.rows.length)throw Error("Source header row is unavailable.");const cols=columns(model.rows,header);if(!cols.length)continue;
 const roles=selected?input.raw.roles||{}:{};if(Object.values(roles).some(id=>!cols.some((c:any)=>c.id===id)))throw Error("Source role mapping references an unavailable column.");
 const records=model.rows.slice(header+1).flatMap((r:any[],n:number)=>r.some(v=>v!=null&&v!=='')?[{id:`raw${i+1}:r${header+n+2}`,values:r.map(v=>v instanceof Date?v.toISOString():scalar(v)),amount:roles.Amount==null?null:number(r[roles.Amount],data.numberStyle),day:roles.Date==null?null:date(r[roles.Date],data.dateOrder,book.properties.date1904)}]:[]);
 const structure=model.rows.slice(0,header+1).flatMap((r:any[],n:number)=>r.some(v=>v!=null&&v!=='')?[{id:`raw${i+1}:r${n+1}`,values:r.map(v=>v instanceof Date?v.toISOString():scalar(v)),amount:null,day:null}]:[]);
 tables.push({structure,id:`raw${i+1}`,name:sheet.name,columns:cols.map(({id,label}:any)=>({id,label})),roles,records,numberStyle:data.numberStyle,dateOrder:data.dateOrder,date1904:!!book.properties.date1904,header});
 }
 }
 return {tables,processed:data,created:Date.now(),touched:Date.now(),bytes:Buffer.byteLength(JSON.stringify(tables)),history:[]};
}
export function tableOf(s:DataSession,id:string){const t=s.tables.find(t=>t.id===id);if(!t)throw Error('Unknown table. Use catalog to inspect available tables.');return t;}
export const filterSchema=z.object({column:z.number().int(),op:z.enum(['eq','ne','contains','gt','gte','lt','lte','blank']),value:z.union([z.string(),z.number(),z.boolean()]).optional(),type:z.enum(['text','number','date']).default('text')});
export const querySchema=z.object({table:z.string().default('processed'),filters:z.array(filterSchema).max(12).default([]),currency:z.string().optional(),from:z.string().optional(),through:z.string().optional(),amountColumn:z.number().int().optional(),dateColumn:z.number().int().optional(),includeStructure:z.boolean().default(false),currencyColumn:z.number().int().optional()});
export type Query=z.infer<typeof querySchema>;
export function select(s:DataSession,q:Query){const original=tableOf(s,q.table);const t:Table={...original,roles:{...original.roles,...(q.currencyColumn==null?{}:{Currency:q.currencyColumn})}};const amount=q.amountColumn??t.roles.Amount,di=q.dateColumn??t.roles.Date;
 const requireCol=(id:number)=>{if(!t.columns.some(c=>c.id===id))throw Error('Unavailable column.');};
 for(const f of q.filters)requireCol(f.column);if(amount!=null)requireCol(amount);if(di!=null)requireCol(di);if(q.currencyColumn!=null)requireCol(q.currencyColumn);
 if((q.from||q.through)&&di==null)throw Error('Date mapping required for this table.');if(q.from&&q.through&&q.from>q.through)throw Error('Date range is reversed.');
 if(q.currency&&t.roles.Currency==null)throw Error('No Currency role is mapped in this table.');
 const rows=[...(q.includeStructure?t.structure||[]:[]),...t.records].map(r=>({...r,amount:amount==null?null:number(r.values[amount],t.numberStyle),day:di==null?null:date(r.values[di],t.dateOrder,t.date1904)})).filter(r=>(!q.from||(r.day&&r.day>=q.from))&&(!q.through||(r.day&&r.day<=q.through))&&(!q.currency||String(r.values[t.roles.Currency])===q.currency)&&q.filters.every(f=>{const v=r.values[f.column];if(f.op==='blank')return v==null||v==='';const x=f.type==='number'?number(v,t.numberStyle):f.type==='date'?date(v,t.dateOrder,t.date1904):String(v??'').toLocaleLowerCase();const y=f.type==='number'?Number(f.value):f.type==='date'?String(f.value):String(f.value??'').toLocaleLowerCase();if(x==null)return false;switch(f.op){case 'eq':return x===y;case 'ne':return x!==y;case 'contains':return String(x).includes(String(y));case 'gt':return x>y;case 'gte':return x>=y;case 'lt':return x<y;case 'lte':return x<=y;default:return false;}}));
 return {table:t,rows,amount,di};
}
export function summaries(s:DataSession,q:Query){const {table:t,rows,amount,di}=select(s,q);if(amount==null)return {count:rows.length,limitation:'Amount is not mapped. Supply amountColumn after inspecting the catalog.'};
 const roles={...t.roles,Amount:amount,...(di==null?{}:{Date:di})};return analyze({columns:t.columns},{roles,reports:['Analysis'],groups:[],timeGrouping:'auto',dateOrder:t.dateOrder},{records:rows}).sections.map((section:any)=>({currency:section.currency,summary:section.summary,time:section.time}));
}
export function quality(s:DataSession,q:Query){const {table,rows,amount,di}=select(s,q);const seen=new Set<string>();let duplicateLooking=0;const issues=rows.flatMap(r=>{const signature=JSON.stringify(r.values);const duplicate=seen.has(signature);seen.add(signature);if(duplicate)duplicateLooking++;const reasons=[];if(amount!=null&&r.amount==null)reasons.push(r.values[amount]==null||r.values[amount]===''?'missing amount':'invalid amount');if(di!=null&&!r.day)reasons.push('invalid/missing date');if(duplicate)reasons.push('duplicate-looking (retained)');return reasons.length?[{row:r.id,reasons}]:[];});return {table:table.id,count:rows.length,duplicateLooking,issues:issues.slice(0,50),issueCount:issues.length,limited:issues.length>50};}
