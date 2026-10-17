import {ROLES,number,date} from './engine.js';
export const normalizeHeader=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const aliases={
 Date:['date','transaction date','txn date','value date','order date','payment date','settlement date','fecha','fecha valor','f valor','datum','buchungsdatum','date operation','تاریخ'],
 Amount:['amount','transaction amount','txn amount','net amount','value','importe','monto','montant','betrag','valor','رقم'],
 Description:['description','transaction description','concept','concepto','descripcion','libelle','beschreibung','تفصیل'],
 Details:['details','detail','transaction details','movement','movimiento','detalle','detalles'],
 Notes:['notes','note','remarks','comment','comments','observations','observaciones','notas','remarques','anmerkungen'],
 Category:['category','categories','categoria','categorie','kategorie'],
 Currency:['currency','currency code','ccy','moneda','devise','wahrung'],
 Balance:['balance','bank balance','account balance','saldo','solde','kontostand'],
 Reference:['reference','ref','transaction ref','transaction reference','txn ref','invoice reference','referencia','referenz']
};
const index=new Map();for(const [role,list]of Object.entries(aliases))for(const label of list)index.set(normalizeHeader(label),role);
const currencies=new Set(['EUR','USD','GBP','CHF','CAD','AUD','NZD','JPY','CNY','INR','PKR','AED','SAR','HKD','SGD','ZAR','SEK','NOK','DKK','PLN','MXN','BRL','TRY','KRW']);
function sample(model,id){const values=[];const start=model.header+1,end=Math.min(model.rows.length,start+256);for(let r=start;r<end&&values.length<128;r++){const v=model.rows[r]?.[id];if(v!=null&&String(v).trim()!=='')values.push(v);}return values;}
function compatible(role,values,c,model){if(!values.length)return !['Date','Amount','Currency','Balance'].includes(role);const fraction=fn=>values.filter(fn).length/values.length;
 if(role==='Date')return fraction(v=>date(v,c.dateOrder,model.date1904)!=null)>=.9;
 if(role==='Amount'||role==='Balance')return fraction(v=>!(v instanceof Date)&&number(v,c.numberStyle)!=null)>=.9;
 if(role==='Currency')return fraction(v=>typeof v==='string'&&currencies.has(v.trim().toUpperCase()))>=.9;
 if(role==='Reference')return fraction(v=>typeof v==='string'||typeof v==='number')>=.9&&new Set(values.map(String)).size/values.length>=.6;
 return fraction(v=>typeof v==='string')>=.8;
}
export function suggestRoles(model,config,metadataRoles={}){
 const selected=new Set(config.selected),roles={},badges={},notices=[],reserved=new Set();
 // Callers provide only already validated/reconciled ExcelFlow AI metadata.
 for(const [role,id]of Object.entries(metadataRoles))if(ROLES.includes(role)&&selected.has(id)&&model.columns.some(c=>c.id===id)&&!reserved.has(id)){roles[role]=id;badges[id]={kind:'recognized',role,reason:'Restored from validated ExcelFlow AI workbook information.'};reserved.add(id);}
 const candidates=new Map(ROLES.map(r=>[r,[]])),amountRisks=[];
 for(const col of model.columns){if(!selected.has(col.id)||reserved.has(col.id))continue;const header=normalizeHeader(col.label),values=sample(model,col.id);let role=index.get(header),reason='Column name and sampled values match '+role+'.';
  if(['debit','credit','debitamount','creditamount','balance'].includes(header)&&compatible('Amount',values,config,model))amountRisks.push(col.id);
  if(role){if(!compatible(role,values,config,model))continue;}
  else if(values.length>=3&&values.every(v=>v instanceof Date&&!Number.isNaN(+v)||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)&&date(v,config.dateOrder)!=null)){role='Date';reason='Sampled values are native dates or valid ISO dates.';}
  else if(values.length>=3&&values.every(v=>typeof v==='string'&&currencies.has(v.trim().toUpperCase()))){role='Currency';reason='Sampled values are recognized currency codes.';}
  else continue;
  candidates.get(role).push({id:col.id,reason});
 }
 for(const role of ROLES){if(roles[role]!=null)continue;const matches=candidates.get(role),risks=role==='Amount'?new Set([...matches.map(x=>x.id),...amountRisks]).size:matches.length;
  if(risks>1||role==='Amount'&&amountRisks.length&&matches.length===0){notices.push({role,columns:role==='Amount'?[...new Set([...matches.map(x=>x.id),...amountRisks])]:matches.map(x=>x.id),message:role==='Amount'?'We found more than one possible transaction-value interpretation. Choose the Amount column that represents each transaction; debit, credit and balance fields need review.':role==='Date'?'We found more than one possible Date column. Choose the date to use for reporting.':'More than one column could mean '+role+'. Choose the one you want.'});continue;}
  if(matches.length===1){const match=matches[0];roles[role]=match.id;badges[match.id]={kind:'suggested',role,reason:match.reason};}
 }
 return {roles,badges,notices};
}
