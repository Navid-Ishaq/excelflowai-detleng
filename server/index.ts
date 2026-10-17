import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {uploadSchema,createData,type DataSession} from './data.js';
import {ask,questionSchema} from './agent.js';
export function makeServer(){
 const sessions=new Map<string,DataSession>();const rates=new Map<string,{at:number,count:number}>();let active=0,creating=0;
 const ttl=20*60*1000,maxBytes=Number(process.env.AI_MEMORY_MB||96)*1024*1024;let spent=0,day=new Date().toISOString().slice(0,10);
 const origins=(process.env.ALLOWED_ORIGINS||'http://127.0.0.1:5180,http://localhost:5180').split(',').map(x=>x.trim());
 const cleanup=()=>{for(const [id,s] of sessions)if(Date.now()-s.touched>ttl)sessions.delete(id);for(const [id,r] of rates)if(Date.now()-r.at>60000)rates.delete(id);};
 const timer=setInterval(cleanup,60000);timer.unref();
 const server=createServer(async(req,res)=>{
 const origin=req.headers.origin;
 const send=(status:number,data:unknown)=>{if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 if(origin&&!origins.includes(origin)){send(403,{error:'Origin is not allowed.'});return;}
 if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.method==='GET'&&req.url==='/api/health'){send(200,{status:'ready',configured:!!process.env.OPENAI_API_KEY,sessionMinutes:20});return;}
 cleanup();
 const forwarded=process.env.TRUST_PROXY==='true'?req.headers['x-forwarded-for']:undefined;const ip=String(forwarded||req.socket.remoteAddress||'unknown').split(',')[0].trim();
 const quota=(key:string,max:number)=>{const r=rates.get(key);if(!r||Date.now()-r.at>60000){rates.set(key,{at:Date.now(),count:1});return true;}return ++r.count<=max;};
 try{
 if(!quota(ip,30))return send(429,{error:'Too many requests. Wait one minute and retry.'});
 if(req.method==='DELETE'&&req.url==='/api/session'){sessions.delete((req.headers.authorization||'').replace(/^Bearer /,''));return send(200,{deleted:true});}
 if(req.method!=='POST'||!['/api/session','/api/ask'].includes(req.url||''))return send(404,{error:'Not found.'});
 const max=req.url==='/api/session'?40*1024*1024:12000;let size=0;const chunks:Buffer[]=[];
 for await(const chunk of req){size+=chunk.length;if(size>max){send(413,{error:'Request is too large for this service.'});req.resume();return;}chunks.push(chunk);}
 let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'Invalid JSON.'});}
 if(req.url==='/api/session'){
 if(creating||active>1)return send(503,{error:'The analyst is busy. Please retry shortly.'});
 if(sessions.size>=8||[...sessions.values()].reduce((n,s)=>n+s.bytes,0)+size>maxBytes)return send(503,{error:'Session capacity reached. Close unused sessions and retry shortly.'});
 const parsed=uploadSchema.safeParse(body);if(!parsed.success)return send(400,{error:'Invalid dataset or consent missing.'});
 creating++;try{const session=await createData(parsed.data);if(session.bytes>maxBytes/2)throw Error('Dataset exceeds this AI service capacity.');const token=randomBytes(32).toString('hex');sessions.set(token,session);return send(201,{token,tables:session.tables.map(t=>({id:t.id,name:t.name,rows:t.records.length})),expiresIn:ttl/1000});}finally{creating--;}
 }
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');const session=sessions.get(token);if(!session)return send(410,{error:'Session expired or server restarted. Reconnect to restore your dataset.'});
 if(!quota('session:'+token,6))return send(429,{error:'Please wait a minute before asking more questions.'});
 const parsed=questionSchema.safeParse(body);if(!parsed.success)return send(400,{error:'Enter a question and supported language.'});
 if(active>=2)return send(503,{error:'The analyst is busy. Please retry shortly.'});
 const today=new Date().toISOString().slice(0,10);if(today!==day){day=today;spent=0;}
 if(spent>=Number(process.env.AI_DAILY_REQUESTS||100))return send(429,{error:'Daily AI request limit reached. Your reports are still available.'});
 session.touched=Date.now();active++;spent++;const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),110000);res.on('close',()=>{if(!res.writableEnded)abort.abort();});
 try{const answer=await ask(session,parsed.data,abort.signal);send(200,answer);}finally{active--;clearTimeout(timeout);session.touched=Date.now();}
 }catch(error:any){const status=error.status||((error.name==='ZodError'||/workbook|column|dataset|role|capacity|record/i.test(error.message))?400:502);send(status,{error:status===503?error.message:status===400?'Dataset could not be opened. Check file size, column mappings and workbook format.':'The analyst could not finish this request. Your report is safe; retry or ask a narrower question.'});}
 });
 server.requestTimeout=130000;server.headersTimeout=15000;server.on('close',()=>{clearInterval(timer);sessions.clear();rates.clear();});return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)makeServer().listen(Number(process.env.PORT||8787),'0.0.0.0',()=>console.log('ExcelFlow AI API ready'));
