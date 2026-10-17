import fs from 'node:fs';import {definition} from '../src/builder-schema.js';import {buildWorkbook} from '../src/builder-output.js';
for(const id of ['sales','products','customers','suppliers','transactions','complete'])for(const mode of ['blank','sample']){const d=definition(id);d.rowCapacity=100;d.columns.forEach(c=>c.selected=true);const out=await buildWorkbook(d,mode,{seed:42});fs.writeFileSync(`work/builder-${id}-${mode}.xlsx`,Buffer.from(out.buffer));}
console.log('12 representative Builder fixtures generated for native Excel and independent inspection.');
