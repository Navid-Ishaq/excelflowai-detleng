# ExcelFlow AI product guide and origin story

The Quick Guide explains **how** to use ExcelFlow AI. Behind ExcelFlow AI explains **why** it exists and how the product evolved. They remain separate, optional experiences.

## Quick Guide

The homepage assistance banner and navigation open a full-screen guide. Owners can choose Build, Create, Explore, or a complete tour, switch journeys, move backward/forward, restart, or exit. The guide remembers its position only in this page's memory.

Interactive scenes cover blank/sample workbook paths, Amount signs including zero, period choices, the actual generated sheet names, fictional dashboard scenarios, group selection, Analytics Explorer, saved-report return, local processing and the 20-row report preview rule. Final actions call the existing workflows.

The guide uses static fictional teaching scenarios. It does not read uploaded workbooks, modify production filters, or implement a second business analytics engine. Mini trend and group graphics are illustrative; real report totals still come from the shared production engines.

## Behind ExcelFlow AI

Navigation, About and footer entries open the separate origin story. The opening describes the family-run teaching academy's recurring transaction preparation for its accountant and the July–September 2026 turning point. A fictional spreadsheet can be cleaned and separated, seven milestones reveal their questions/answers/changes, a saved sample report returns, and Human Experience / AI Collaboration / Codex Engineering explain their contributions.

The closing returns to the original task and invites visitors into the product or Quick Guide. There are no invented development dates, customers, financial records, achievements or tax-compliance claims.

## Shared architecture and state safety

- `experience-shell.js` owns the native modal dialog, inert background, Escape, focus restoration, scroll restoration and synchronous close/cleanup. This also permits immediate guide/story cross-links.
- `experience.css` owns common editorial layout, paths, cards, controls, sample charts, mobile adaptations and reduced-motion behavior.
- `guide-content.js` and `story-content.js` keep content separate from the respective views. Amount / grouping / Live Analytics help strings can be reused without scattering inconsistent explanations.
- Each view owns only its instructional selections; real Builder/Create/Explore/Live controllers and DOM remain mounted underneath it.
- Modules load on demand; CSS is available immediately so the homepage guide invitation is styled before the first opening. No packages, tracking, persistence, network data processing or media dependencies were added.

## Verification

Run the existing unit, browser, live, Builder and performance suites. `npm run test:experiences` verifies the two feature journeys, routing, keyboard/Escape/focus, responsive layouts, accessibility and workflow state. `node tests/experience-quality.mjs` checks every scene on mobile, 320px overflow, chart switches and all three real workflow actions. Set `EF_BASE_URL=http://127.0.0.1:4173` to run feature checks against a built preview.

Automated accessibility checks supplement visual and keyboard inspection; they do not replace independent screen-reader or first-time-owner testing. The intended 2–3 minute guide / 2–4 minute story durations are reading targets, not measured user-study results.
