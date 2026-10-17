
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:390,height:900}});
const base=process.env.EF_BASE_URL||(process.env.EF_BASE_URL||'http://127.0.0.1:5184');const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
await page.goto(base);await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
for(const kind of ['quick-guide','behind-story']){
 if(await page.locator('#menu').getAttribute('aria-expanded')!=='true')await page.locator('#menu').click();await page.locator('#navigation .'+kind).click();await page.locator('.experience').waitFor();if(await page.locator('[data-restart],[data-replay]').count())await page.locator('[data-restart],[data-replay]').first().click();
 if(kind==='behind-story'){while(await page.locator('[data-back]').isEnabled())await page.locator('[data-back]').click();}
 for(let i=0;i<(kind==='quick-guide'?8:6);i++){
  assert.equal(await page.evaluate(()=>document.querySelector('.experience').scrollWidth>document.querySelector('.experience').clientWidth),false);
  const result=await page.evaluate(()=>axe.run(document.querySelector('.experience')));assert.deepEqual(result.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
  if(i===4&&kind==='quick-guide'){await page.screenshot({path:'work/quick-guide-live-mobile.png'});await page.locator('.experience-demo summary').click();await page.locator('[data-chart=Line]').click();assert(await page.locator('.experience-demo details').getAttribute('open')!==null);}
  if(await page.locator('[data-next]').isEnabled())await page.locator('[data-next]').click();
 }
 await page.keyboard.press('Escape');
}
await page.setViewportSize({width:320,height:800});await page.locator('.guide-entry .quick-guide').click();assert.equal(await page.evaluate(()=>document.querySelector('.experience').scrollWidth>document.querySelector('.experience').clientWidth),false);await page.keyboard.press('Escape');
await page.setViewportSize({width:1440,height:1000});
for(const target of ['build','create','explore']){
 await page.locator('.guide-entry .quick-guide').click();await page.locator('[data-all]').click();while(await page.locator('[data-next]').isEnabled())await page.locator('[data-next]').click();await page.locator('[data-route='+target+']').click();
 assert(await page.locator(target==='build'?'#builder':target==='create'?'#workspace':'#existing-report').isVisible());
 await page.reload();await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
}
await page.locator('#navigation .behind-story').click();await page.locator('[data-timeline]').click();await page.locator('[data-tier="5"]').click();await page.locator('[data-route=guide]').click();await page.waitForFunction(()=>document.querySelector('.experience-header strong')?.textContent==='ExcelFlow AI Quick Guide');
assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await browser.close();console.log('PASS All 14 scenes mobile/axe, 320px layout, chart switches, all workflow CTAs and milestone crosslink.');
