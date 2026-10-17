
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.EF_BASE_URL||(process.env.EF_BASE_URL||'http://127.0.0.1:5184'));
const open=async()=>{await page.locator('.guide-entry .quick-guide').click();await page.locator('.experience').waitFor();};
for(const journey of ['build','create','explore']){
 await open();await page.locator('.decision summary').click();await page.locator('.decision [data-journey='+journey+']').click();
 while(await page.locator('[data-next]').isEnabled())await page.locator('[data-next]').click();
 assert.equal(await page.locator('[data-route]:not([data-route=story])').count(),3);await page.keyboard.press('Escape');
}
await open();await page.locator('[data-all]').click();
await page.locator('[data-output=sample]').click();assert.match(await page.locator('.experience-demo').innerText(),/Use in ExcelFlow AI/);
await page.locator('[data-next]').click();await page.locator('[data-amount="0"]').click();assert.match(await page.locator('.experience-answer').innerText(),/Report Data only/);
await page.locator('[data-amount="-250"]').click();assert.match(await page.locator('.experience-answer').innerText(),/Outflow/);
await page.locator('[data-period=custom]').click();await page.locator('[data-next]').click();
for(const sheet of ['Inflows','Outflows','Analysis - Summary','Analysis - Charts','Group Analysis']){await page.locator('[data-sheet="'+sheet+'"]').click();assert.equal(await page.locator('.experience-demo h3').innerText(),sheet);}
await page.locator('[data-next]').click();await page.locator('[data-select=samplePeriod]').selectOption('q1');assert.match(await page.locator('.experience-kpis').innerText(),/5,500/);
await page.locator('[data-select=by]').selectOption('Product');await page.locator('[data-values=one]').click();assert.match(await page.locator('.experience-kpis').innerText(),/960/);
await page.locator('.experience-demo summary').click();await page.locator('[data-metric="Transaction Count"]').click();assert(await page.locator('.experience-demo details').getAttribute('open')!==null);
await page.locator('[data-reset]').click();assert.match(await page.locator('.experience-kpis').innerText(),/12,500/);
await page.locator('[data-next]').click();await page.locator('[data-recognize]').click();assert.match(await page.locator('[data-recognized]').innerText(),/recognized/);
await page.locator('[data-next]').click();assert.match(await page.locator('.experience').innerText(),/Preview limited to 20 rows/);
await page.locator('[data-back]').click();await page.locator('[data-restart]').click();assert.match(await page.locator('.experience h1').innerText(),/Welcome/);
await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.querySelector('.experience').scrollWidth>document.querySelector('.experience').clientWidth),false);const result=await page.evaluate(()=>axe.run(document.querySelector('.experience')));assert.deepEqual(result.violations.filter(x=>['serious','critical'].includes(x.impact)).map(x=>x.id),[]);}
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.guide-entry button').evaluate(e=>getComputedStyle(e).animationName),'none');
await page.screenshot({path:'work/quick-guide-mobile.png',fullPage:false});await page.keyboard.press('Escape');
await page.setViewportSize({width:1440,height:1000});await page.locator('.build-workbook').click();await page.locator('#builder-next').click();const before=await page.locator('#builder').innerHTML();await page.locator('#navigation .quick-guide').click();await page.locator('.experience').waitFor();await page.locator('[data-all]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#builder').innerHTML(),before);
await page.reload();await open();await page.locator('[data-all]').click();while(await page.locator('[data-next]').isEnabled())await page.locator('[data-next]').click();await page.locator('[data-route=create]').click();assert(await page.locator('#file').isVisible());
assert.deepEqual(errors,[]);await browser.close();console.log('PASS Quick Guide focused/full paths, interactions, CTA, Builder preservation, responsive, axe and reduced motion.');
