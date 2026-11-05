import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inlineMarkdown,renderJourneyMarkdown} from '../src/how-to-build-markdown.js';

const markdown=readFileSync(new URL('../docs/development-journey/DEVELOPMENT_JOURNEY.md',import.meta.url),'utf8');
test('real journey retains all chapters, commits, links, data tables and latest update',()=>{
  const view=renderJourneyMarkdown(markdown);
  assert.equal(view.title,'Building ExcelFlow AI');
  assert.ok(view.chapters.length>=21);
  assert.match(view.html,/Mastra/);
  assert.match(view.html,/<table>/);
  assert.match(view.html,/cc7f47071/);
  assert.match(view.html,/Development update — 5 November 2026/);
  assert.match(view.html,/rel="noopener noreferrer"/);
  assert.equal(new Set(view.chapters.map(c=>c.id)).size,view.chapters.length);
});
test('Markdown does not turn raw markup or unsafe URLs into executable HTML',()=>{
  const rendered=renderJourneyMarkdown('# Demo\n## Guide\n<script>alert(1)</script>\n\n[X](javascript:alert)\n\n[good](https://example.com)\n\n![x](javascript:alert)');
  assert.ok(!rendered.html.includes('<script>'));
  assert.ok(rendered.html.includes('&lt;script&gt;'));
  assert.ok(!rendered.html.includes('href="javascript:'));
  assert.ok(!rendered.html.includes('src="javascript:'));
  assert.ok(rendered.html.includes('href="https://example.com"'));
});
test('tables, lists, headings and emphasis work with replacement content',()=>{
  const sample='# New title\n## Modern description\n\n## Chapter one\n\n- First\n- Second\n\n| Name | Value |\n| --- | --- |\n| Total | **12** |\n\n> A helpful note\n\n### Detail\n\n`test`';
  const result=renderJourneyMarkdown(sample);
  assert.equal(result.title,'New title');assert.equal(result.subtitle,'Modern description');
  assert.deepEqual(result.chapters.map(c=>c.label),['Chapter one']);
  for(const s of ['<ul>','<table>','<strong>12</strong>','<blockquote>','<h3','<code>test</code>'])assert.ok(result.html.includes(s),s);
  assert.equal(inlineMarkdown('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});


test('desktop sidebar stays sticky while the chapter links scroll independently',()=>{
  const css=readFileSync(new URL('../src/how-to-build.css',import.meta.url),'utf8');
  const view=readFileSync(new URL('../src/how-to-build-view.js',import.meta.url),'utf8');
  assert.match(css,/\.journey-sidebar\{position:sticky;top:/);
  assert.match(css,/\.journey-sidebar-inner\{[^}]*display:flex;flex-direction:column/);
  assert.match(css,/\.journey-chapters\{[^}]*overflow-y:auto/);
  assert.match(css,/\.journey-chapters a\[aria-current="location"\]/);
  assert.match(css,/@media\(max-width:720px\)\{\.journey-sidebar\{position:static\}/);
  assert.match(view,/chapterNav\.scrollTop\+=/);
  assert.match(view,/active!==currentChapter/);
  assert.match(view,/dialog\.addEventListener\('scroll'/);
  assert.match(markdown,/Persistent chapter navigation/);
});
