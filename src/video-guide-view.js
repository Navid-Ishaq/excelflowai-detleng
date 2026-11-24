import './video-guide.css';
import {experienceShell,esc} from './experience-shell.js';
import {VIDEO_URL,EMBED_URL,VIDEO_CHAPTERS} from './video-guide-content.js';

export function openGuide(_actions,onClose){
 const shell=experienceShell({label:'ExcelFlow AI · Video & User Guide',onClose});
 shell.dialog.classList.add('video-guide-dialog');
 shell.body.innerHTML=`<section class="video-guide-intro">
 <p class="eyebrow">ExcelFlow AI by DeTLeng</p><h1>Your Data. Your Insights.</h1>
 <p>Build · Create · Explore · Understand</p>
 <div class="video-guide-player"><iframe title="ExcelFlow AI official video" src="${EMBED_URL}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
 <p><a href="${VIDEO_URL}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></p>
 <p class="video-guide-privacy">The embedded player is provided by YouTube. Opening this guide does not upload your Excel data. If playback is unavailable, use the YouTube link above.</p>
 </section><section class="video-guide-manual" aria-labelledby="video-manual-title">
 <h2 id="video-manual-title">Complete ExcelFlow AI User Guide</h2>
 <p>Follow the complete workflow from your first workbook to reports, Live Analytics, AI investigation and downloads. Open any chapter below.</p>
 <div class="video-guide-tools"><button type="button" data-video-expand>Expand all chapters</button><button type="button" data-video-collapse>Collapse all chapters</button></div>
 ${VIDEO_CHAPTERS.map(({title,html},i)=>`<details class="video-guide-chapter" ${i===0?'open':''}><summary><span>${String(i+1).padStart(2,'0')} · ${esc(title)}</span></summary><div class="video-guide-chapter-body">${html}</div></details>`).join('')}
 </section>`;
 const chapters=shell.body.querySelectorAll('.video-guide-chapter');
 shell.body.querySelector('[data-video-expand]').onclick=()=>chapters.forEach(chapter=>chapter.open=true);
 shell.body.querySelector('[data-video-collapse]').onclick=()=>chapters.forEach(chapter=>chapter.open=false);
 // The shared shell removes the entire dialog (and iframe) on Close or Escape.
 // Stop playback immediately on cancel/close, before restoring the workspace.
 const stop=()=>shell.body.querySelector('iframe')?.remove();
 shell.dialog.addEventListener('cancel',stop);
 shell.dialog.querySelector('[data-exit]').addEventListener('click',stop,{capture:true});
 shell.dialog.querySelector('[data-exit]').textContent='Close ×';
}
