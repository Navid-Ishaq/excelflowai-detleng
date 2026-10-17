import {SAMPLE_PATH} from './sample-path.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ExcelJS from 'exceljs';
import {columns,prepare,inspect} from '../src/engine.js';import {generate} from '../src/export.js';import {analyze} from '../src/analysis.js';
import {sessionDataset,initialFilters,computeLive} from '../src/live-engine.js';import {detectReport,importDataset} from '../src/report-import.js';
import {guardWorkbook} from '../src/workbook-guard.js';
const model={header:0,rows:[['Date','Amount','Activity','Currency'],['2026-01-01',100,' A ','EUR'],['2026-01-02',-30,'A','EUR'],['2026-02-01',0,'','EUR'],['invalid','bad','a','EUR'],['2026-02-03',5,'A','USD']]};model.columns=columns(model.rows,0);
const config={selected:[0,1,2,3],roles:{Date:0,Amount:1,Description:2,Currency:3},period:'all',reports:['Report Data','Inflows','Outflows','Analysis'],groups:[{column:2,mode:'all',chart:true}],timeGrouping:'month',numberStyle:'dot',dateOrder:'dmy'};
const dataset=sessionDataset(model,config,prepare(model,config));
test('shared live engine reconciles with Excel analysis, currency, zero, invalid and groups',()=>{
  const f={...initialFilters(dataset),time:'month'},v=computeLive(dataset,f),a=analyze(model,config,prepare(model,config));
  assert.deepEqual(v.summary,a.sections.find(s=>s.currency==='EUR').summary);assert.equal(v.count,4);assert.equal(v.summary.inCount,1);assert.equal(v.summary.outCount,1);assert.equal(v.summary.validAmounts,3);assert.equal(v.quality.invalidAmounts,1);assert.equal(v.quality.blankGroups,1);assert.equal(v.time.at(-1).cumulative,70);assert.equal(v.groups.reduce((sum,r)=>sum+r.net,0),70);assert.equal(v.rankings.outflows[0].totalOut,-30);assert.equal(v.concentration.inflow,1);assert.equal(computeLive(dataset,{...f,currency:'USD'}).summary.net,5);
});
test('global period + one/many values, Amount and Date grouping use canonical keys',()=>{
  const f=initialFilters(dataset);const selected=computeLive(dataset,{...f,mode:'one',values:['string:A'],period:'custom',start:'2026-01-01',end:'2026-01-02'});assert.equal(selected.count,2);assert.equal(selected.summary.net,70);assert.equal(selected.summary.average,35);
  assert.equal(computeLive(dataset,{...f,mode:'selected',values:['string:A','blank:']}).count,3);
  assert.equal(computeLive(dataset,{...f,period:'custom',start:'2027-01-01',end:'2027-01-02'}).count,0);
  assert.throws(()=>computeLive(dataset,{...f,period:'custom',start:'2026-02-01',end:'2026-01-01'}),/valid start/);
  for(const time of ['day','week','month','quarter','year'])assert.equal(computeLive(dataset,{...f,time}).time.reduce((a,r)=>a+r.net,0),70);
  assert.ok(computeLive(dataset,{...f,column:1}).values.some(v=>v.key==='number:100'));
  assert.ok(computeLive(dataset,{...f,column:0,dateLevel:'month'}).values.some(v=>v.key==='date:2026-01'));
  assert.equal(computeLive(dataset,{...f,metric:'count',sort:'totalOut',direction:'desc'}).explorer[0].label,'A');
});
test('new hidden metadata, reordered columns and safe date serials round-trip all analytics',async()=>{
  const cfg={...config,selected:[2,1,3,0]},d=prepare(model,cfg),bytes=await generate(model,cfg,d),w=new ExcelJS.Workbook();await w.xlsx.load(bytes);assert.equal(w.getWorksheet('_EF_Metadata').state,'hidden');const detected=detectReport(w);assert.equal(detected.kind,'verified');const reopened=importDataset(detected,null,'Renamed.xlsx');
  const f={...initialFilters(dataset),time:'month'};const a=computeLive(dataset,f),b=computeLive(reopened,f);for(const key of ['summary','time','rankings','groups','topIn','topOut']){if(key.startsWith('top'))assert.deepEqual(a[key].map(r=>r.amount),b[key].map(r=>r.amount));else assert.deepEqual(a[key],b[key]);}
  assert.equal(w.getWorksheet('Report Data').getCell('D2').value instanceof Date,true);assert.equal(reopened.metadata.name,'Renamed.xlsx');
});
test('legacy, partial, corrupted, future schema, duplicate positions and invalid amounts fail safely',async()=>{
  const bytes=await generate(model,config,prepare(model,config));const read=async()=>{const w=new ExcelJS.Workbook();await w.xlsx.load(bytes);return w;};let w=await read();w.removeWorksheet('_EF_Metadata');for(const s of [...w.worksheets])if(s.name!=='Report Data')w.removeWorksheet(s.id);const legacy=detectReport(w);assert.equal(legacy.kind,'compatible');assert.throws(()=>importDataset(legacy,{},'Old.xlsx'),/Amount/);assert.equal(importDataset(legacy,{Amount:1,Date:0,Currency:3},'Old.xlsx').records.length,5);
  w=await read();w.removeWorksheet('Report Data');assert.throws(()=>detectReport(w),/no Report Data/);
  w=await read();w.getWorksheet('_EF_Metadata').getCell('B1').value='{bad';assert.throws(()=>detectReport(w),/corrupted/);
  for(const mutation of [m=>m.schemaVersion=9,m=>m.columns[0].label='Renamed',m=>m.roles.Amount=99,m=>m.columns[1].position=1]){w=await read();const cell=w.getWorksheet('_EF_Metadata').getCell('B1');const m=JSON.parse(cell.value);mutation(m);cell.value=JSON.stringify(m);assert.throws(()=>detectReport(w));}
  w=new ExcelJS.Workbook();w.addWorksheet('Random').addRows([['Amount'],[2]]);assert.throws(()=>detectReport(w),/no Report Data/);w.addWorksheet('Report Data').addRows([['Amount'],['bad']]);assert.throws(()=>importDataset(detectReport(w),{Amount:0}),/usable/);
});
test('missing Date, negative-only, zero-only and sparse roles remain honest',()=>{
  for(const amount of [0,-3,4]){const m={header:0,rows:[['Amount','Custom'],[amount,'']]};m.columns=columns(m.rows,0);const c={...config,selected:[0,1],roles:{Amount:0},groups:[]};const ds=sessionDataset(m,c,prepare(m,c));const v=computeLive(ds,initialFilters(ds));assert.equal(v.dateAvailable,false);assert.equal(v.time.length,0);assert.equal(v.count,1);assert.equal(v.summary.net,amount);assert.equal(v.summary.margin,amount>0?1:null);}
});
test('sample current-session and saved-file totals reconcile',{skip:!fs.existsSync(SAMPLE_PATH)},async()=>{
  const w=new ExcelJS.Workbook();await w.xlsx.readFile(SAMPLE_PATH);const m=inspect(w.worksheets[0]);m.columns=columns(m.rows,m.header);const c={...config,selected:[2,3,4,5,9],roles:{Date:2,Description:3,Details:4,Amount:5},groups:[]};const d=prepare(m,c),ds=sessionDataset(m,c,d),bytes=await generate(m,c,d);fs.writeFileSync('work/live-sample.xlsx',bytes);const saved=new ExcelJS.Workbook();await saved.xlsx.load(bytes);const reopened=importDataset(detectReport(saved),null,'Saved sample');const filters={...initialFilters(ds),time:'month'};const a=computeLive(ds,filters),b=computeLive(reopened,filters);assert.deepEqual(a.summary,b.summary);assert.deepEqual(a.time,b.time);assert.deepEqual(a.rankings,b.rankings);assert.equal(a.count,94);assert.equal(a.summary.totalIn,12643.28);assert.equal(a.summary.totalOut,-10367.01);assert.ok(Math.abs(a.summary.net-2276.27)<1e-8);for(const name of ['first','last'])assert.equal(a.summary[name],b.summary[name]);
});
test('1k, 10k and 50k records remain exact and bounded',()=>{
  for(const size of [1000,10000,50000]){const records=Array.from({length:size},(_,i)=>({values:['2026-01-01',i%2?-.01:.03,'Group '+i,'EUR'],amount:i%2?-.01:.03,day:'2026-01-01'}));const ds={...dataset,records};const start=performance.now();const v=computeLive(ds,{...initialFilters(ds),time:'month'});assert.equal(v.count,size);assert.ok(Math.abs(v.summary.net-size*.01)<1e-9);assert.ok(v.transactions.length<=20);assert.ok(v.groups.length<=20);assert.ok(v.explorer.length<=10);console.log(JSON.stringify({liveRecords:size,computeMs:Math.round(performance.now()-start),groups:v.groupCount}));}
});
test('ZIP guard rejects encrypted, malformed and excessive expanded workbooks',async()=>{
  const w=new ExcelJS.Workbook();w.addWorksheet('Report Data').addRows([['Amount'],[2]]);const bytes=await w.xlsx.writeBuffer();const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);assert.ok(guardWorkbook(buffer)>0);assert.throws(()=>guardWorkbook(new ArrayBuffer(8)),/unencrypted/);
  const altered=buffer.slice(0),dv=new DataView(altered);let central=0;while(dv.getUint32(central,true)!==0x02014b50)central++;dv.setUint32(central+24,160*1024*1024,true);assert.throws(()=>guardWorkbook(altered),/expanded limit/);dv.setUint32(central+24,20,true);dv.setUint16(central+8,1,true);assert.throws(()=>guardWorkbook(altered),/Encrypted/);
});
test('metadata chunks, duplicate headers and 1904 serial dates preserve meaning',async()=>{
  const m={header:0,date1904:true,rows:[['Date','Duplicate','Duplicate',...Array.from({length:28},(_,i)=>'Header '+i+'x'.repeat(1000))],[1,8,'memo',...Array.from({length:28},(_,i)=>'value '+i)]]};m.columns=columns(m.rows,0);const c={...config,selected:m.columns.map(c=>c.id),roles:{Date:0,Amount:1,Description:2},groups:[],reports:['Report Data']};const d=prepare(m,c),bytes=await generate(m,c,d),w=new ExcelJS.Workbook();await w.xlsx.load(bytes);assert.ok(w.getWorksheet('_EF_Metadata').rowCount>1);const reopened=importDataset(detectReport(w));assert.equal(reopened.records[0].day,'1904-01-02');assert.equal(reopened.records[0].amount,8);assert.equal(reopened.columns[1].label,reopened.columns[2].label);
});
test('safe formula cache values, missing caches and stale derived totals',()=>{
  const w=new ExcelJS.Workbook();const s=w.addWorksheet('Report Data');s.addRows([['Amount','Activity'],[{formula:'1+2',result:3},'<img src=x onerror=alert(1)>'],[{formula:'BAD()'},'No cache']]);w.addWorksheet('Analysis').getCell('A1').value=999999;const ds=importDataset(detectReport(w),{Amount:0,Description:1});const v=computeLive(ds,initialFilters(ds));assert.equal(v.summary.totalIn,3);assert.equal(v.summary.count,2);assert.equal(v.quality.invalidAmounts,1);assert.equal(v.values.some(x=>String(x.label).includes('onerror')),true);
});
