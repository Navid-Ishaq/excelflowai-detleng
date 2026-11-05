import './experience.css';
import './how-to-build.css';
import {experienceShell,esc} from './experience-shell.js';
import {renderJourneyMarkdown} from './how-to-build-markdown.js';
import journey from '../docs/development-journey/DEVELOPMENT_JOURNEY.md?raw';

const sourceURL='https://github.com/Navid-Ishaq/excelflowai-detleng/blob/main/docs/development-journey/DEVELOPMENT_JOURNEY.md';
export function openGuide(_actions,onClose) {
  const {title,subtitle,chapters,html}=renderJourneyMarkdown(journey);
  const shell=experienceShell({label:'ExcelFlow AI · How to Build',onClose});
  shell.dialog.classList.add('journey-dialog');
  shell.body.innerHTML=`
    <div class="journey-hero">
      <span class="journey-eyebrow">THE DEVELOPMENT JOURNEY · HUMAN + AI COLLABORATION</span>
      <h1 tabindex="-1">${esc(title)}</h1>
      <p>${esc(subtitle)}</p>
      <div class="journey-tags"><span>Original need → working product</span><span>Real challenges and fixes</span><span>Source-backed milestones</span></div>
    </div>
    <div class="journey-layout">
      <aside class="journey-sidebar" aria-label="Document navigation">
        <div class="journey-sidebar-inner">
          <div class="journey-sidebar-title">On this page <span>${chapters.length} chapters</span></div>
          <label class="journey-search-label" for="journey-search">Find a chapter</label>
          <input id="journey-search" type="search" placeholder="Search chapter titles…" autocomplete="off">
          <nav class="journey-chapters" aria-label="Jump to a chapter">
            ${chapters.map((c,i)=>`<a href="#${c.id}" data-chapter="${c.id}"><span>${String(i+1).padStart(2,'0')}</span>${esc(c.label.replace(/^\d+\.\s*/,''))}</a>`).join('')}
          </nav>
          <p class="journey-empty" hidden>No chapter titles match. Try another word.</p>
          <a class="journey-source" href="${sourceURL}" target="_blank" rel="noopener noreferrer">Read original Markdown on GitHub ↗</a>
        </div>
      </aside>
      <div class="journey-main">
        <label class="journey-mobile-jump" for="journey-jump">Jump to a chapter
          <select id="journey-jump">${chapters.map((c,i)=>`<option value="${c.id}">${i+1}. ${esc(c.label.replace(/^\d+\.\s*/,''))}</option>`).join('')}</select>
        </label>
        <div class="journey-reading"><span>DOCUMENTATION · LIVE FROM THE REPOSITORY BUILD</span><span id="journey-progress-text" aria-live="off">0% read</span></div>
        <div class="journey-progress"><div id="journey-progress-bar"></div></div>
        <article class="journey-article">${html}</article>
        <div class="journey-finish"><strong>You have reached the end of the development journey.</strong><p>Updates appear here when the Markdown file is revised and the website is rebuilt.</p><button type="button" id="journey-top">↑ Back to top</button></div>
      </div>
    </div>`;
  const dialog=shell.dialog;
  const root=shell.body;
  const toc=[...root.querySelectorAll('.journey-chapters a')];
  const find=root.querySelector('#journey-search');
  const jump=root.querySelector('#journey-jump');
  function goTo(id) {
    const target=root.querySelector(`#${CSS.escape(id)}`);
    if(!target)return;
    const top=target.getBoundingClientRect().top-dialog.getBoundingClientRect().top+dialog.scrollTop-95;
    dialog.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    history.replaceState(null,'',`#how-to-build`);
  }
  toc.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();goTo(a.dataset.chapter);}));
  jump.onchange=()=>goTo(jump.value);
  find.addEventListener('input',()=>{
    const query=find.value.trim().toLocaleLowerCase();let count=0;
    toc.forEach(a=>{const visible=a.textContent.toLocaleLowerCase().includes(query);a.hidden=!visible;if(visible)count++;});
    root.querySelector('.journey-empty').hidden=count!==0;
  });
  root.querySelector('#journey-top').onclick=()=>dialog.scrollTo({top:0,behavior:'smooth'});
  let scheduled=false;
  const update=()=>{
    scheduled=false;
    const max=dialog.scrollHeight-dialog.clientHeight;
    const pct=max>0?Math.min(100,Math.max(0,Math.round(dialog.scrollTop/max*100))):100;
    root.querySelector('#journey-progress-bar').style.width=`${pct}%`;
    root.querySelector('#journey-progress-text').textContent=`${pct}% read`;
    let active='';
    for(const c of chapters){const element=root.querySelector(`#${CSS.escape(c.id)}`);if(element?.getBoundingClientRect().top<dialog.getBoundingClientRect().top+160)active=c.id;}
    toc.forEach(a=>{if(a.dataset.chapter===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    if(active)jump.value=active;
  };
  dialog.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});
  update();
  shell.focus();
  return shell;
}
