import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIDEO_ID,VIDEO_URL,EMBED_URL,VIDEO_CHAPTERS} from '../src/video-guide-content.js';

test('official video uses the requested ID and no autoplay',()=>{
 assert.equal(VIDEO_ID,'FRDNB3NRUoQ');
 assert.equal(new URL(VIDEO_URL).searchParams.get('v'),VIDEO_ID);
 const embed=new URL(EMBED_URL);
 assert.equal(embed.hostname,'www.youtube-nocookie.com');
 assert.equal(embed.pathname,`/embed/${VIDEO_ID}`);
 assert.equal(embed.searchParams.get('autoplay'),'0');
});
test('manual contains complete maintained workflow chapters',()=>{
 assert.equal(VIDEO_CHAPTERS.length,15);
 assert.equal(new Set(VIDEO_CHAPTERS.map(c=>c.title)).size,15);
 for(const chapter of VIDEO_CHAPTERS)assert.ok(chapter.html.length>100,chapter.title);
 const text=VIDEO_CHAPTERS.map(c=>c.html).join(' ');
 for(const phrase of ['Header row','Generate Business Report','Open Live Analytics','Connect &amp; run deep investigation','Save all answers as PDF','AI Findings','temporary backend'])assert.ok(text.includes(phrase),phrase);
});
test('landing page has local poster and shared modal entry points, no eager iframe',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('info-entry video-guide-entry'));
 assert.ok(html.includes('video-guide-entry video-guide-poster'));
 assert.ok(html.includes('video-guide-entry video-guide-cta'));
 assert.ok(!html.includes('Demo video coming soon'));
 assert.ok(!html.includes('<iframe'));
 assert.ok(readFileSync(new URL('../public/video-guide-poster.jpg',import.meta.url)).length>1000);
});
