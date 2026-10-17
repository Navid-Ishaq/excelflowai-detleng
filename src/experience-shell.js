// Informational overlays leave all real workflow DOM and controllers alive.
export function experienceShell({label,onClose}) {
 const dialog=document.createElement('dialog');dialog.className='experience';dialog.setAttribute('aria-label',label);
 dialog.innerHTML='<div class="experience-inner"><header class="experience-header"><strong>'+label+'</strong><button data-exit>Back to ExcelFlow AI ×</button></header><div class="experience-body"></div></div>';
 document.body.append(dialog);const previous=document.activeElement,scroll=window.scrollY;
 let closed=false;
 const finish=()=>{if(closed)return;closed=true;document.body.classList.remove('experience-open');dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});window.scrollTo(0,scroll);onClose?.();};
 const close=()=>{dialog.close();finish();};
 dialog.querySelector('[data-exit]').onclick=close;
 dialog.addEventListener('close',finish,{once:true});
 document.body.classList.add('experience-open');dialog.showModal();
 return {dialog,body:dialog.querySelector('.experience-body'),close,focus:()=>{dialog.scrollTop=0;dialog.querySelector('h1,h2')?.focus({preventScroll:true});}};
}
export const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const flow=items=>'<ol class="experience-flow">'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>';
export const buttons=(items,key,active)=>'<div class="experience-options">'+items.map(([id,label])=>'<button data-'+key+'="'+esc(id)+'" aria-pressed="'+(String(id)===String(active))+'">'+esc(label)+'</button>').join('')+'</div>';
