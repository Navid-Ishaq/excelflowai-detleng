// Small, dependency-free Markdown reader for the versioned development-journey file.
// Every untrusted text fragment is escaped; only a limited Markdown subset becomes HTML.
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const allowedURL = url => /^(https?:\/\/[^\s<>"']+|\.\/(?:[a-zA-Z0-9_./-]|%[0-9A-Fa-f]{2})+)$/i.test(url);

export function inlineMarkdown(value) {
  let text = escapeHTML(value);
  // Process images and links before emphasis. No arbitrary Markdown HTML is interpreted.
  text = text.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (full, label, url) =>
    allowedURL(url) ? `<img src="${escapeHTML(url)}" alt="${label}" loading="lazy">` : full);
  text = text.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (full, label, url) =>
    allowedURL(url) ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : full);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  return text;
}

const heading = line => /^(#{1,6})\s+(.+?)\s*$/.exec(line);
const tableLine = line => /^\s*\|.*\|\s*$/.test(line);
const tableDivider = line => /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
const listLine = line => /^\s*(?:[-*+] |\d+[.)] )/.test(line);
const breakLine = line => !line.trim() || !!heading(line) || tableLine(line) || listLine(line) || /^\s*>\s?/.test(line) || /^\s*```/.test(line) || /^\s*(?:-{3,}|\*{3,})\s*$/.test(line);
const cells = line => line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());

export function renderJourneyMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g,'\n').split('\n');
  let index = 0;
  const title = /^#\s+(.+)$/.exec(lines[0] || '')?.[1] || 'Building ExcelFlow AI';
  if (/^#\s+/.test(lines[0] || '')) index++;
  const subtitle = /^##\s+(.+)$/.exec(lines[index] || '')?.[1] || '';
  if (subtitle) index++;
  const chapters = [], used = new Map(), fragments = [];
  const idFor = text => {
    const base = text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'') || 'section';
    const n = (used.get(base) || 0) + 1; used.set(base,n);
    return `journey-${base}${n > 1 ? `-${n}` : ''}`;
  };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {index++;continue;}
    if (/^\s*```/.test(line)) {
      const lang = line.trim().slice(3).trim(), content=[];index++;
      while (index < lines.length && !/^\s*```/.test(lines[index])) content.push(lines[index++]);
      if (index < lines.length) index++;
      fragments.push(`<pre class="journey-code"><code${/^[a-z0-9-]{1,20}$/i.test(lang)?` data-language="${lang}"`:''}>${escapeHTML(content.join('\n'))}</code></pre>`);continue;
    }
    const h=heading(line);
    if (h) {
      const level = Math.min(4,h[1].length), label=h[2], id=idFor(label);
      if (level===2)chapters.push({id,label});
      fragments.push(`<h${level} id="${id}">${inlineMarkdown(label)}</h${level}>`);index++;continue;
    }
    if (tableLine(line) && tableDivider(lines[index+1] || '')) {
      const columns=cells(line);index+=2;const rows=[];
      while (index < lines.length && tableLine(lines[index])) {rows.push(cells(lines[index]));index++;}
      fragments.push(`<div class="journey-table-wrap" role="region" aria-label="${escapeHTML(columns.join(', '))}" tabindex="0"><table><thead><tr>${columns.map(c=>`<th scope="col">${inlineMarkdown(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map((_,i)=>`<td>${inlineMarkdown(row[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const parts=[];
      while (index<lines.length && /^\s*>\s?/.test(lines[index]))parts.push(lines[index++].replace(/^\s*>\s?/,''));
      fragments.push(`<blockquote><p>${parts.map(inlineMarkdown).join(' ')}</p></blockquote>`);continue;
    }
    if (listLine(line)) {
      const ordered=/^\s*\d+[.)] /.test(line), parts=[];
      while(index<lines.length && listLine(lines[index]) === true && /^\s*\d+[.)] /.test(lines[index])===ordered)parts.push(lines[index++].replace(/^\s*(?:[-*+] |\d+[.)] )/,''));
      fragments.push(`<${ordered?'ol':'ul'}>${parts.map(part=>`<li>${inlineMarkdown(part)}</li>`).join('')}</${ordered?'ol':'ul'}>`);continue;
    }
    if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) {fragments.push('<hr>');index++;continue;}
    const parts=[line];index++;
    while(index<lines.length && !breakLine(lines[index]))parts.push(lines[index++]);
    const body=parts.map(part=>inlineMarkdown(part.trimEnd())+(/ {2}$/.test(part)?'<br>':'')).join(' ');
    fragments.push(`<p>${body}</p>`);
  }
  return {title,subtitle,chapters,html:fragments.join('\n')};
}
