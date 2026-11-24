import {GUIDE_DETAILS} from './guide-details.js';
import {SHEETS,HELP} from './guide-content.js';

export const VIDEO_ID='FRDNB3NRUoQ';
export const VIDEO_URL=`https://www.youtube.com/watch?v=${VIDEO_ID}`;
export const EMBED_URL=`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=0&rel=0`;

// Reuse the maintained Quick Guide instructions rather than duplicate them.
// All HTML below is trusted, repository-authored documentation, never user input.
const chapters=[
 ['Getting started: choose your path', '<p>ExcelFlow AI is free to use and requires no sign-up. Use Build Your Workbook if you need a new spreadsheet, Upload Source Excel if you already have records, or Explore Existing Report if you previously saved an ExcelFlow AI report. Reporting and Live Analytics work without connecting AI.</p>'],
 ['Practice with fictional sample data',GUIDE_DETAILS.sample],
 ['Build a blank or sample workbook',GUIDE_DETAILS.build],
 ['Create a report from your source Excel workbook',GUIDE_DETAILS.create],
 ['Understand the report sheets and calculations',GUIDE_DETAILS.report+'<dl class="video-sheet-list">'+Object.entries(SHEETS).map(([name,description])=>`<dt>${name}</dt><dd>${description}</dd>`).join('')+'</dl><p>'+HELP.amount+' For example, +400 and −250 in the same currency give net flow +150. Net flow is not necessarily accounting profit. Keep different currencies separate.</p>'],
 ['Explore Live Analytics: filters, KPIs and records',GUIDE_DETAILS.live.replace(' The example below is fictional and separate from your data.','')],
 ['Reopen an existing ExcelFlow AI report',GUIDE_DETAILS.return],
 ['Connect the AI Analyst: OpenAI and Mastra',GUIDE_DETAILS.ai],
 ['Ask questions, investigate and inspect evidence',GUIDE_DETAILS.questions+'<p>Evidence IDs link findings to tool results; inspect the supporting records and calculations. They establish provenance, not a guarantee that every interpretation is correct.</p>'],
 ['Choose your answer language',GUIDE_DETAILS.languages],
 ['Download Excel, AI Findings and PDFs',GUIDE_DETAILS.downloads],
 ['Privacy, authorization and temporary sessions','<p>Excel reporting and Live Analytics run locally in your browser. Connecting AI requires your authorization and sends the supplied original workbook (when available) and processed report to a temporary backend session. Relevant tool results go to OpenAI. The original file remains untouched.</p><p>Sessions are held in memory, expire after inactivity and are not automatically restored after refresh. A reopened report does not reconstruct the original source. Save the Excel reports and PDF results you wish to retain before leaving.</p><p>The video player is a separate YouTube service: opening this guide loads an external player, which may process network and playback information. It does not send your workbook or report to YouTube.</p>'],
 ['Technical architecture: how it all fits together','<p>The browser builds workbooks, recognizes source data, processes reports, exports native Excel charts and runs Live Analytics. After authorization, a Node API hosted on Render creates an isolated temporary data session. A Mastra agent calls bounded data tools for records, aggregates, comparisons, anomalies and reconciliation; relevant results go to OpenAI. The OpenAI API key stays on the server. GitHub Pages hosts the frontend. Mastra Platform receives structural monitoring data, not a second copy of the application backend.</p><p>The separate Technical Guide and How to Build explain architecture, implementation and verification in more detail.</p>'],
 ['Troubleshooting and frequently asked questions',GUIDE_DETAILS.help],
 ['Continue exploring','<p>Start with the sample workbook or your own records. The Quick Guide provides interactive lessons; the Technical Guide explains the architecture and How to Build documents the development journey. Close this guide to return to your current workspace.</p><ul><li><a href="https://github.com/Navid-Ishaq/excelflowai-detleng" target="_blank" rel="noopener noreferrer">GitHub repository</a></li><li><a href="https://automation.detleng.com/#desk" target="_blank" rel="noopener noreferrer">Automation Desk</a></li><li><a href="https://lfds.detleng.com/" target="_blank" rel="noopener noreferrer">LFDS</a></li><li><a href="https://network.detleng.com/" target="_blank" rel="noopener noreferrer">DeTLeng Network</a></li></ul>']
];
export const VIDEO_CHAPTERS=Object.freeze(chapters.map(([title,html])=>Object.freeze({title,html})));
