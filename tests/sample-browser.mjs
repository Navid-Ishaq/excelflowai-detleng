import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();const errors=[],uploads=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')uploads.push(r.url());});
 await page.goto(process.env.EF_BASE_URL||'http://127.0.0.1:5194');
 await page.route('**/examples/fictional-side-hustle.xlsx',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.locator('#try-sample').click();await page.locator('#sample-status').filter({hasText:'could not be loaded'}).waitFor();assert(await page.locator('#try-sample').isEnabled());assert(await page.locator('#landing').isVisible());
 await page.unroute('**/examples/fictional-side-hustle.xlsx');
 await page.locator('#try-sample').click();await page.locator('#sheet').waitFor();await page.waitForFunction(()=>document.querySelector('#header')?.value==='1'&&!document.querySelector('#screen').hasAttribute('aria-busy'));
 assert.equal(await page.locator('#sheet').inputValue(),'Movimientos');assert.match(await page.locator('#screen').innerText(),/fictional-side-hustle.xlsx/);
 await page.locator('#next').click();assert.match(await page.locator('#screen').innerText(),/Fecha/);await page.locator('#next').click();
 assert.equal(await page.locator('#role-0').inputValue(),'Date');assert.equal(await page.locator('#role-2').inputValue(),'Amount');assert.equal(await page.locator('#role-4').inputValue(),'Currency');
 await page.locator('#next').click();await page.locator('#next').click();assert.match(await page.locator('#count').innerText(),/60 records/);await page.locator('#generate').click();await page.locator('#open-ai').waitFor({timeout:60000});assert(await page.locator('#download').isVisible());
 await page.locator('#open-ai').click();await page.locator('#ai-consent').waitFor();assert.equal(await page.locator('#ai-consent').isChecked(),false);assert.match(await page.locator('#ai-raw-name').innerText(),/fictional-side-hustle.xlsx/);assert.deepEqual(uploads,[]);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});await page.reload();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert(await page.locator('#try-sample').isVisible());
 console.log('PASS sample failure/retry, direct load, worksheet/header/roles, full report, raw AI source and authorization, mobile.');
}finally{await browser.close();}
