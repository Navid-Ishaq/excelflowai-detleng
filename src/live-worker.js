import {computeLive} from './live-engine.js';
let dataset;
self.onmessage=({data:m})=>{try{if(m.type==='init')dataset=m.dataset;const view=computeLive(dataset,m.filters);self.postMessage({id:m.id,view});}catch(e){self.postMessage({id:m.id,error:e.message});}};
