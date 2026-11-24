// Run against the local Vite server: node tests/video-guide-browser.mjs
// The external player is mocked to isolate application behavior; actual playback is a manual check.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath=process.env.EF_CHROME_PATH||(existsSync(chrome)?chrome:undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<html><body>Mock video player</body></html>'}));
 await page.goto(process.env.EF_BASE_URL||'http://127.0.0.1:5180');
 const modal=page.locator('.video-guide-dialog');
 assert.equal(await page.locator('iframe').count(),0);
 assert(!requests.some(url=>url.includes('youtube-nocookie.com')));
 await page.locator('#navigation .video-guide-entry').click();
 await modal.waitFor({state:'visible'});
 assert.equal(await modal.locator('iframe').count(),1);
 assert.match(await modal.locator('iframe').getAttribute('src'),/FRDNB3NRUoQ/);
 assert.equal(await modal.locator('.video-guide-chapter').count(),15);
 await modal.locator('[data-video-expand]').click();
 assert.equal(await modal.locator('.video-guide-chapter[open]').count(),15);
 await modal.locator('[data-video-collapse]').click();
 assert.equal(await modal.locator('.video-guide-chapter[open]').count(),0);
 await page.keyboard.press('Escape');
 await modal.waitFor({state:'detached'});
 assert.equal(await page.locator('iframe').count(),0);
 await page.locator('.video-guide-poster').click();
 await modal.waitFor({state:'visible'});
 await modal.locator('[data-exit]').click();
 await modal.waitFor({state:'detached'});
 // Preserve active builder workspace; video entry is a button, not a landing anchor.
 await page.locator('.build-workbook').click();
 await page.locator('#builder').waitFor({state:'visible'});
 const before=await page.locator('#builder').innerHTML();
 await page.locator('#navigation .video-guide-entry').click();
 await modal.waitFor({state:'visible'});
 await modal.locator('[data-exit]').click();
 await modal.waitFor({state:'detached'});
 assert.equal(await page.locator('#builder').innerHTML(),before);
 assert(await page.locator('#builder').isVisible());
 await page.setViewportSize({width:390,height:844});
 await page.locator('#menu').click();
 await page.locator('#navigation .video-guide-entry').click();
 await modal.waitFor({state:'visible'});
 await modal.locator('[data-video-expand]').click();
 assert.equal(await modal.evaluate(el=>el.scrollWidth>el.clientWidth),false);
 await modal.locator('[data-exit]').click();
 await modal.waitFor({state:'detached'});
 assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'false');
 assert.deepEqual(errors,[]);
 assert(!requests.some(url=>/\/api\/(ask|session)/.test(url)));
 console.log('PASS video guide modal, navigation, chapters, workspace preservation and mobile layout (mock player).');
}finally{await browser.close();}
