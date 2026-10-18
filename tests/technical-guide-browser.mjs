import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {TECH_CHAPTERS} from '../src/technical-content.js';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto(process.env.EF_BASE_URL||'http://127.0.0.1:5194');await page.locator('#navigation .technical-guide-entry').click();await page.locator('.technical-guide').waitFor();
 assert(await page.locator('[data-tech-back]').isDisabled());await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(let i=0;i<TECH_CHAPTERS.length;i++){
   await page.locator('[data-tech-chapter]').selectOption(String(i));assert.equal(await page.locator('.experience h1').innerText(),TECH_CHAPTERS[i].title);
   const details=page.locator('.tech-details');if(await details.count()){await details.locator('summary').click();assert(await details.evaluate(e=>e.open));}
   assert.equal(await page.locator('.experience').evaluate(e=>e.scrollWidth>e.clientWidth),false);
   const results=await page.evaluate(()=>axe.run(document.querySelector('.experience')));assert.deepEqual(results.violations.filter(x=>['serious','critical'].includes(x.impact)).map(x=>x.id),[]);
   for(const file of TECH_CHAPTERS[i].files)assert(existsSync(file),'Missing source reference '+file);
  }
 }
 assert(await page.locator('[data-tech-next]').isDisabled());await page.locator('[data-tech-back]').click();await page.locator('[data-tech-next]').click();await page.locator('[data-tech-restart]').click();assert.equal(await page.locator('[data-tech-chapter]').inputValue(),'0');
 await page.screenshot({path:'work/technical-guide-mobile.png'});
 await page.locator('[data-user-guide]').click();assert.match(await page.locator('.experience-header strong').innerText(),/Quick Guide/);assert.equal(await page.locator('.experience').count(),1);await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:1000});await page.locator('.build-workbook').click();await page.locator('#builder-next').click();const builder=await page.locator('#builder').innerHTML();await page.locator('#navigation .technical-guide-entry').click();await page.locator('.technical-guide').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#builder').innerHTML(),builder);
 await page.reload();await page.locator('#try-sample').click();await page.locator('#header').waitFor();await page.waitForFunction(()=>!document.querySelector('#screen').hasAttribute('aria-busy'));
 for(let i=0;i<4;i++)await page.locator('#next').click();await page.locator('#generate').click();await page.locator('#open-ai').waitFor({timeout:60000});const report=await page.locator('#screen').innerHTML();
 await page.locator('footer .technical-guide-entry').click();await page.locator('.technical-guide').waitFor();await page.locator('[data-exit]').click();assert.equal(await page.locator('#screen').innerHTML(),report);
 await page.locator('#open-ai').click();await page.locator('#ai-prompt').fill('Keep this draft question');await page.locator('#ai-language').selectOption('Urdu');await page.locator('#navigation .technical-guide-entry').click();await page.locator('.technical-guide').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#ai-prompt').inputValue(),'Keep this draft question');assert.equal(await page.locator('#ai-language').inputValue(),'Urdu');assert.equal(await page.locator('#ai-consent').isChecked(),false);
 assert.deepEqual(posts,[]);assert.deepEqual(errors,[]);console.log('PASS Technical Guide all chapters, source references, mobile/desktop axe, navigation, Quick Guide switch, Builder/report/AI state preservation and no AI uploads.');
}finally{await browser.close();}
