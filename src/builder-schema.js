import {ROLES,date} from './engine.js';
export const TYPES=['Text','Date','Number','Amount','Quantity','Percentage','Currency','Reference / ID','Status','Category','Long Text / Notes'];
export const CAPACITIES=[100,500,1000,1500,2000,2500,5000];
export const DATE_FORMATS=['dd/mm/yyyy','mm/dd/yyyy','yyyy-mm-dd'];
export const CURRENCIES=['EUR','USD','GBP','CAD','AUD','PKR','INR','AED','JPY'];
const payment=['Cash','Card','Bank Transfer','Direct Debit','Digital Wallet','Other'];
const status=['Active','Completed','Pending','Cancelled','Other'];
const paid=['Paid','Pending','Partially Paid','Refunded','Cancelled'];
const fields={
 date:['Date','Date','Date'],reference:['Reference','Reference / ID','Reference'],customer:['Customer','Text','Description'],product:['Product','Text'],category:['Category','Category','Category'],quantity:['Quantity','Quantity'],price:['Unit Price','Amount'],discount:['Discount','Percentage'],tax:['Tax','Percentage'],amount:['Amount','Amount','Amount'],payment:['Payment Method','Text','',payment],paymentStatus:['Payment Status','Status','',paid],currency:['Currency','Currency','Currency',CURRENCIES],channel:['Sales Channel','Text'],status:['Status','Status','',status],notes:['Notes','Long Text / Notes','Notes'],sku:['SKU','Reference / ID'],movement:['Movement Type','Text','',['Sale','Purchase','Supplier Refund','Customer Refund','Adjustment','Transfer']],supplier:['Supplier','Text','Description'],location:['Warehouse / Location','Text'],customerId:['Customer ID','Reference / ID'],supplierId:['Supplier ID','Reference / ID'],transaction:['Transaction Type','Text','',['Purchase','Payment','Refund']],description:['Description','Text','Description'],details:['Details','Long Text / Notes','Details'],region:['Region','Text'],purchase:['Purchase Type','Text','',['Purchase','Supplier Payment','Supplier Credit']],cost:['Unit Cost','Amount'],counterparty:['Counterparty','Text'],record:['Record Type','Text','',['Sale','Purchase','Expense','Refund','Transfer','Fee','Adjustment','Other']]};
export const TEMPLATES=[
 {id:'sales',name:'Sales & Orders',sheet:'Sales',purpose:'Sales, customer payments and refunds.',keys:['date','reference','customer','product','category','quantity','price','discount','tax','amount','payment','paymentStatus','currency','channel','status','notes'],recommended:['date','reference','customer','product','quantity','price','amount','payment','currency','status'],labels:{reference:'Order / Invoice Reference',amount:'Total Amount'}},
 {id:'products',name:'Products & Stock',sheet:'Products',purpose:'Product activity and stock movements with meaningful flows.',keys:['date','sku','product','category','movement','quantity','price','amount','counterparty','location','reference','currency','status','notes'],labels:{amount:'Total Value',counterparty:'Supplier / Customer'},description:'product'},
 {id:'customers',name:'Customers / Buyers',sheet:'Customers',purpose:'Customer activity and buyer transactions.',keys:['date','customerId','customer','reference','transaction','description','product','quantity','amount','payment','paymentStatus','currency','region','status','notes'],labels:{customer:'Customer / Buyer',product:'Product / Service'}},
 {id:'suppliers',name:'Suppliers / Purchases',sheet:'Suppliers',purpose:'Purchases, supplier payments and credits.',keys:['date','supplierId','supplier','reference','purchase','product','category','quantity','cost','amount','payment','paymentStatus','currency','status','notes'],labels:{reference:'Invoice / Reference',product:'Product / Service'}},
 {id:'transactions',name:'Business Transactions',sheet:'Transactions',purpose:'A universal ledger of inflows and outflows.',keys:['date','reference','description','details','category','amount','currency','payment','counterparty','status','notes']},
 {id:'complete',name:'Complete Business Workbook',sheet:'Business Data',purpose:'A rich mixed ledger for reports, grouping and Live Analytics.',keys:['date','record','reference','counterparty','description','details','product','category','quantity','price','amount','payment','paymentStatus','currency','channel','status','notes'],labels:{counterparty:'Customer / Supplier',product:'Product / Service',channel:'Sales Channel / Source'}},
 {id:'custom',name:'Custom Workbook',sheet:'Data',purpose:'Your own structure, with optional ExcelFlow AI roles.',keys:[]}
];
export function definition(id='transactions'){
 const t=TEMPLATES.find(t=>t.id===id);if(!t)throw Error('Choose a workbook type.');
 const recommended=t.recommended||t.keys.filter(k=>!['notes','paymentStatus','region','location','channel','details'].includes(k));
 const cols=t.keys.map((key,i)=>{const [label,type,role='',list=[]]=fields[key];return {id:key,label:t.labels?.[key]||label,type,role,selected:recommended.includes(key),recommended:recommended.includes(key),required:['date','amount'].includes(key),validation:list.slice(),order:i};});
 if(id==='customers')cols.find(c=>c.id==='description').role='';
 if(t.description){cols.forEach(c=>{if(c.role==='Description')c.role='';});cols.find(c=>c.id===t.description).role='Description';}
 return {templateId:id,templateVersion:1,workbookName:`ExcelFlow-AI-${t.name.replace(/[^\w]+/g,'-')}`,sheetName:t.sheet,columns:cols,rowCapacity:1000,currency:'EUR',dateFormat:'dd/mm/yyyy',numberStyle:'dot',sampleMonths:3,sampleStart:'',sampleEnd:''};
}
export const selected=d=>d.columns.filter(c=>c.selected);
export function addColumn(d){let n=1;while(d.columns.some(c=>c.id===`custom_${n}`))n++;d.columns.push({id:`custom_${n}`,label:`Field ${n}`,type:'Text',role:'',selected:true,required:false,recommended:false,validation:[],order:d.columns.length});}
export function validateDefinition(d){
 if(!TEMPLATES.some(t=>t.id===d.templateId))throw Error('Choose a supported workbook type.');
 if(!Number.isInteger(d.rowCapacity)||d.rowCapacity<100||d.rowCapacity>5000)throw Error('Choose a whole row count from 100 to 5,000.');
 if(typeof d.workbookName!=='string'||!d.workbookName.trim()||d.workbookName.length>100)throw Error('Give your workbook a name of 1–100 characters.');
 if(!DATE_FORMATS.includes(d.dateFormat)||!['dot','comma'].includes(d.numberStyle)||!CURRENCIES.includes(d.currency))throw Error('Choose supported date, number and currency settings.');
 const cols=selected(d);if(!cols.length||d.columns.length>64)throw Error('Select 1–64 columns.');
 const labels=new Set(),ids=new Set(),roles=new Set();
 for(const c of cols){const name=c.label.trim().toLocaleLowerCase();if(!name||c.label.length>100||/[\u0000-\u001f]/.test(c.label))throw Error('Column headings must be readable names of 1–100 characters.');if(labels.has(name))throw Error('Every selected column needs a unique heading. Rename the duplicate.');labels.add(name);if(typeof c.id!=='string'||ids.has(c.id))throw Error('Column identities must be unique.');ids.add(c.id);if(!TYPES.includes(c.type))throw Error('Choose a supported field type.');if(c.role){if(!ROLES.includes(c.role)||roles.has(c.role))throw Error('Each ExcelFlow AI role can be assigned to only one column.');roles.add(c.role);if(c.role==='Amount'&&!['Number','Amount'].includes(c.type))throw Error('The Amount role needs a numeric Amount or Number field.');if(c.role==='Date'&&c.type!=='Date')throw Error('The Date role needs a Date field.');}if(!Array.isArray(c.validation)||c.validation.length>50||c.validation.some(v=>typeof v!=='string'||!v.trim()||v.length>100||/[\u0000-\u001f]/.test(v)))throw Error('Dropdown lists support up to 50 readable values, each 1–100 characters.');}
 for(const c of cols)if(c.validation.length&&['Date','Number','Amount','Quantity','Percentage'].includes(c.type))throw Error('Dropdown lists are for text fields. Remove the list or choose a text field type.');
 return cols;
}
export function sampleRange(d,now=new Date()){
 if(d.sampleMonths==='custom'){if(!date(d.sampleStart)||!date(d.sampleEnd)||d.sampleStart>d.sampleEnd)throw Error('Choose a valid sample start and end date.');return [d.sampleStart,d.sampleEnd];}
 if(![1,3,6,12].includes(+d.sampleMonths))throw Error('Choose 1, 3, 6 or 12 months, or a custom sample range.');
 return [new Date(Date.UTC(now.getFullYear(),now.getMonth()-Number(d.sampleMonths)+1,1)).toISOString().slice(0,10),new Date(Date.UTC(now.getFullYear(),now.getMonth()+1,0)).toISOString().slice(0,10)];
}
export function fileName(d,mode){return `${d.workbookName.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/[. ]+$/,'').slice(0,100)||'ExcelFlow-AI'}-${mode==='blank'?'Blank':'Sample'}.xlsx`;}
