import {validateDefinition,sampleRange} from './builder-schema.js';
export const money=x=>Math.round((x+Number.EPSILON)*100)/100;
export function seeded(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const products=[['P-101','Harbor Notebook','Stationery',8.75],['P-102','Cedar Desk Lamp','Workspace',39.95],['P-103','Meadow Tote','Accessories',18.4],['P-104','Orbit Cable Kit','Technology',24.65],['P-105','Pebble Mug','Home',12.85],['P-106','Willow Organizer','Workspace',29.9],['P-107','Horizon Workshop','Services',145.5],['P-108','Studio Consultation','Services',265.75]];
const customers=['Amber Workshop','Cobalt Studio','Meadow Collective','Juniper Works','Lumen Atelier','Maple Corner','Saffron Studio','Pebble Office'];
const suppliers=['Cedar Supply','Harbor Materials','Orbit Wholesale','Willow Services','Meadow Goods'];
const expenses=[['Rent','Workspace rent',790.5],['Utilities','Utility payment',97.35],['Software','Software subscription',39.9],['Supplies','Office supplies',62.75],['Professional services','Professional services',210.5],['Taxes','Tax payment',160.45],['Fees','Payment processing fee',9.85],['Miscellaneous','Business expense',45.6]];
export function sampleRecords(d,seed=1,now=new Date()){
 const cols=validateDefinition(d),[start,end]=sampleRange(d,now),random=seeded(seed),pick=a=>a[Math.floor(random()*a.length)],weighted=a=>a[Math.min(a.length-1,Math.floor(random()**1.8*a.length))],rows=[];
 const lo=Date.parse(start+'T00:00:00Z'),days=Math.round((Date.parse(end+'T00:00:00Z')-lo)/86400000)+1;
 for(let i=0;i<d.rowCapacity;i++){
  const p=weighted(products),ci=customers.indexOf(weighted(customers)),si=suppliers.indexOf(weighted(suppliers));
  let offset=Math.min(days-1,Math.floor((i+random())/d.rowCapacity*days));let day=new Date(lo+offset*86400000);if([0,6].includes(day.getUTCDay())&&offset+1<days&&random()<.75)day=new Date(+day+86400000);
  let event='Sale';const r=random();
  if(d.templateId==='sales')event=r<.075?'Refund':'Sale';
  else if(d.templateId==='products')event=r<.52?'Sale':r<.82?'Purchase':r<.87?'Supplier Refund':r<.94?'Customer Refund':r<.98?'Adjustment':'Transfer';
  else if(d.templateId==='suppliers')event=r<.09?'Supplier Credit':r<.65?'Purchase':'Supplier Payment';
  else if(d.templateId==='customers')event=r<.08?'Refund':r<.6?'Purchase':'Payment';
  else event=r<.52?'Sale':r<.66?'Purchase':r<.83?'Expense':r<.89?'Refund':r<.94?'Transfer':r<.975?'Fee':'Adjustment';
  const expense=event==='Fee'?expenses.find(x=>x[0]==='Fees'):pick(expenses),quantity=1+Math.floor(random()**2*12),price=money(p[3]*(event==='Purchase'&&d.templateId!=='customers'?.64:1));
  const discount=cols.some(c=>c.id==='discount')&&random()<.22?.1:0,tax=cols.some(c=>c.id==='tax')?.075:0;
  let sign=['Refund','Purchase','Expense','Fee','Supplier Payment','Customer Refund'].includes(event)?-1:1;if(d.templateId==='customers'&&event==='Purchase')sign=1;
  let amount=money(quantity*price*(1-discount)*(1+tax))*sign;
  if(['transactions','complete'].includes(d.templateId)&&['Expense','Fee'].includes(event))amount=-money((event==='Fee'?9.85:expense[2])*(.8+random()*.4));
  if(event==='Transfer'||event==='Adjustment')amount=0;
  const isSupplier=['Purchase','Supplier Payment','Supplier Credit','Supplier Refund'].includes(event)&&d.templateId!=='customers';
  const refunded=/Refund|Credit/.test(event),desc=['Expense','Fee'].includes(event)?expense[1]:`${event==='Sale'?'Sales receipt':event} — ${p[1]}`;
  const entity=isSupplier?suppliers[si]:customers[ci];
  const record={date:day,reference:`DEMO-${d.templateId.toUpperCase()}-${String(i+1).padStart(6,'0')}`,customer:customers[ci],customerId:`DEMO-C${String(ci+1).padStart(3,'0')}`,supplier:suppliers[si],supplierId:`DEMO-S${String(si+1).padStart(3,'0')}`,product:p[1],sku:p[0],category:['Expense','Fee'].includes(event)?expense[0]:p[2],quantity,price,cost:price,discount,tax,amount,payment:weighted(['Card','Bank Transfer','Cash','Digital Wallet','Direct Debit','Other']),paymentStatus:refunded?'Refunded':'Paid',currency:d.currency,channel:weighted(['Online','In person','Direct order','Partner']),status:'Completed',notes:'Synthetic demonstration record; not real business data.',movement:event,transaction:event,purchase:event,record:event,counterparty:entity,description:desc,details:`${event} for ${entity}`,location:pick(['Main workspace','North store','Central stock']),region:pick(['North','South','Central','West'])};
  // Expense records still reconcile quantity × unit value in the Complete ledger.
  if(d.templateId==='complete'&&['Expense','Fee'].includes(event)){record.quantity=1;record.price=Math.abs(amount);record.product=expense[1];}
  if(['Transfer','Adjustment'].includes(event)){record.price=0;record.cost=0;}
  const row=cols.map((c,j)=>{
   let value=record[c.id];
   const fallback=()=>c.role==='Amount'?amount:c.role==='Date'?day:c.role==='Currency'?d.currency:c.role==='Reference'?record.reference:c.role==='Description'?desc:c.role==='Category'?record.category:c.role==='Details'?record.details:c.role==='Notes'?record.notes:undefined;
   if(value===undefined)value=fallback();
   if(c.validation.length&&!c.validation.includes(String(value)))value=weighted(c.validation);
   if(c.type==='Date')return value instanceof Date?value:day;
   if(['Number','Amount','Quantity','Percentage'].includes(c.type)){if(typeof value==='number')return value;return c.type==='Percentage'?money(random()*.2):c.type==='Quantity'?quantity:c.role==='Amount'?amount:money(25+random()**2*500);}
   if(c.type==='Currency')return c.validation.length?(c.validation.includes(d.currency)?d.currency:c.validation[0]):d.currency;
   if(c.type==='Reference / ID')return typeof value==='string'?value:`DEMO-F${j+1}-${String(i+1).padStart(6,'0')}`;
   if(c.type==='Status'&&value===undefined)return 'Completed';
   if(c.type==='Category'&&value===undefined)return record.category;
   if(c.type==='Long Text / Notes'&&value===undefined)return record.notes;
   return value instanceof Date?value.toISOString().slice(0,10):String(value??`${c.label} — ${entity}`);
  });rows.push(row);
 }
 return rows;
}
