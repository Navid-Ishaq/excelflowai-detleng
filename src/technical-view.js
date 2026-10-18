import './experience.css';
import {experienceShell,esc} from './experience-shell.js';
import {TECH_CHAPTERS} from './technical-content.js';
let chapter=0;
const sourceRoot='https://github.com/Navid-Ishaq/excelflowai-detleng/';
export function openGuide(actions,onClose){
 const shell=experienceShell({label:'ExcelFlow AI Technical Guide',onClose});
 shell.dialog.classList.add('technical-guide');
 function draw(){
  const c=TECH_CHAPTERS[chapter];
  shell.body.innerHTML=`<div class="experience-toolbar"><span role="status">Chapter ${chapter+1} of ${TECH_CHAPTERS.length}</span><button data-tech-restart>Restart Guide</button><button data-user-guide>Open Quick Guide →</button></div><progress value="${chapter+1}" max="${TECH_CHAPTERS.length}" aria-label="Technical Guide progress"></progress><label class="guide-jump">Jump to a topic<select data-tech-chapter>${TECH_CHAPTERS.map((item,i)=>`<option value="${i}" ${i===chapter?'selected':''}>${i+1}. ${esc(item.title)}</option>`).join('')}</select></label><section class="experience-scene"><p class="eyebrow">How ExcelFlow AI Works · For developers and reviewers</p><h1 tabindex="-1">${esc(c.title)}</h1><p class="experience-lead">${esc(c.lead)}</p><div class="technical-copy">${c.body}</div>${c.details?`<details class="tech-details"><summary>Implementation details and limits</summary><p>${esc(c.details)}</p></details>`:''}<aside class="guide-note tech-sources"><strong>Inspect the implementation</strong><p>${c.files.map(file=>`<a href="${sourceRoot}${file==='tests'?'tree':'blob'}/main/${encodeURI(file)}" target="_blank" rel="noopener noreferrer">${esc(file)}</a>`).join(' · ')}</p><p><a href="${sourceRoot}blob/main/TECHNICAL_GUIDE.md" target="_blank" rel="noopener noreferrer">Read the repository Technical Guide ↗</a></p></aside></section><div class="experience-controls"><button data-tech-back ${chapter===0?'disabled':''}>← Back</button><button class="primary" data-tech-next ${chapter===TECH_CHAPTERS.length-1?'disabled':''}>Next →</button></div>`;
  shell.body.querySelector('[data-tech-chapter]').onchange=e=>{chapter=Number(e.target.value);draw();};
  shell.body.querySelector('[data-tech-restart]').onclick=()=>{chapter=0;draw();};
  shell.body.querySelector('[data-tech-back]').onclick=()=>{chapter--;draw();};
  shell.body.querySelector('[data-tech-next]').onclick=()=>{chapter++;draw();};
  shell.body.querySelector('[data-user-guide]').onclick=()=>{shell.close();actions.guide();};
  shell.focus();
 }
 draw();return shell;
}
