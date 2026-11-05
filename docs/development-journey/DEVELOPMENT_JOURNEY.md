# Building ExcelFlow AI
## From a recurring Excel task to an evidence-based AI Business Analyst

**Project:** ExcelFlow AI by DeTLeng  
**Development journey:** 7–18 October 2026  
**Report prepared:** 5 November 2026  
**Project website:** https://excelflowai.detleng.com  
**Source repository:** https://github.com/Navid-Ishaq/excelflowai-detleng

> A practical business problem became a working software product through repeated collaboration. The project owner described the work, set the requirements, tested results and requested changes. OpenAI Codex helped implement and refine the application. The central idea was simple: let dependable software calculate the numbers, let AI investigate the evidence, and let people review the results.

## 1. What this development journey records

This report explains how ExcelFlow AI developed, including the choices that worked, the early version that needed reconsideration, the smaller spreadsheet problems, and the changes made after testing. It is a development story, not a copy of a marketing article.

It draws on the Codex-written development reconstruction supplied by the project owner, the public repository, its commit history, source code, technical notes and recorded test results. The complete transcript of every earlier prompt and terminal error is not available. Specific events are included where the development account or repository records support them; missing conversations are not recreated.

**Collaboration and authorship.** The project owner supplied the business context, product direction, reviews and acceptance feedback. Codex assisted with software engineering, fixes, implementation and technical checks. This report was prepared by ChatGPT (OpenAI) from those records. It does not present AI-assisted coding as independently handwritten software development.

## 2. The original need: preparing Excel information for an accountant

The starting point was a family-run educational business in Barcelona. Roughly every three months, bank transactions had to be downloaded, checked, separated into incoming and outgoing amounts, totalled and prepared for the accountant. The work was repetitive, and the original spreadsheets were not always arranged in a way that made reporting easy.

The first aim was not to build a chatbot. It was to make a reliable browser-based tool that could turn transaction files into readable reports. The user needed control over dates, amount columns, descriptions, periods and groupings, while keeping the original figures understandable.

The next question changed the project's direction: once a report existed, could the owner ask a natural-language question about the actual figures? That question eventually led to the AI analyst. But the reporting engine remained the foundation.

## 3. The sequence of development

| When | What changed | Evidence |
| --- | --- | --- |
| 7–8 October | Earlier reporting foundation, Live Analytics and Workbook Builder were developed and tested. | Codex development reconstruction and retained technical notes |
| 16 October | An independent ExcelFlow AI repository and an initial React/TypeScript version were established, with a Pages build workflow. | Initial repository commits |
| 17 October, morning | Header handling, reporting parity, charts and homepage demo placement were improved. | Commit `6071c114e` |
| 17 October, evening | The team restored the fuller, already-tested reporting foundation rather than keeping a reduced rewrite. | Commit `9d563306c` |
| 17 October, later | Mastra analyst, nine investigation tools, temporary data sessions and AI Findings export were added. | Commit `cc7f47071` |
| 18 October | Multilingual PDF options, response controls, Quick Guide, Technical Guide and fictional sample access were refined. | Commits `ad2801134`, `9d09cf641`, `e31b12ec2`, `652e47a63`, `dc344d731` |

These are development milestones, not a claim that every discussion happened at the exact commit time.

## 4. The first important setback: the new version lost useful reporting depth

The separate ExcelFlow AI application began with a modern frontend and the structure for future AI features. However, an important problem became visible during comparison: the newer implementation did not match the full behaviour of the existing reporting application. Some detailed report controls, Builder paths and analytics features had become simplified.

The first correction restored missing reporting behaviour. Work included stronger header recognition, preservation of manual field selections, more complete KPI presentation, Excel chart checks and moving the demo to a more visible position on the homepage.

A second, more important decision followed. Instead of rebuilding every proven calculation inside the newer architecture, Codex restored the established reporting foundation and applied the ExcelFlow AI branding and experience around it. The development reconstruction records a comparison of 29 JavaScript modules and preservation of the earlier tested code. A backup of the simplified stage was kept outside the repository.

**What we learned:** a new AI layer should not weaken the part of the product that already solves the user's problem. Preserving working functionality was more useful than insisting on a complete rewrite.

## 5. Real spreadsheets needed more care than a simple upload button

**Headers were not always on row one.** Business files could contain titles, merged heading bands, blank space and introductory notes. In a recorded sample, the true headers were on row five. If the wrong row was selected, the system could misread Date, Amount and Currency. Header detection was refined, and the owner retained the final choice. The development account records a 94-record verification: 52 inflows and 42 outflows.

**The Back button could lose a decision.** If someone manually selected an Amount or Date role, then returned to the previous step, those assignments had to remain in place. The workflow was changed to preserve deliberate choices and clear actions across navigation.

**Business headings were multilingual.** Columns such as Fecha, Importe, Beschreibung and Currency needed helpful suggestions without pretending that every heading was unambiguous. The role-suggestion logic combined known labels with sampled values, and it asked the user to decide when multiple Amount or Date interpretations were plausible.

**Numbers and dates had tricky edges.** Negative outflows could not be sorted as ordinary text. Zero amounts were different from missing or invalid amounts. Reporting periods had to include both boundary dates, and regional Excel date/number formats needed explicit handling.

**Different currencies could not be combined into one total.** EUR and USD values were kept in separate summaries. Invalid amounts stayed visible for quality review but were excluded from monetary sums. These decisions made the tool more trustworthy for ordinary business users.

## 6. From raw rows to an Excel report that could be handed over

The reporting flow became a guided sequence: upload, select the source sheet, confirm columns, map field roles, choose reports and periods, then generate the workbook.

The resulting Excel output could include Report Data, Inflows, Outflows, Analysis summaries, time comparisons and group sheets. The engineering requirement was not to export pictures of charts; it was to preserve native Excel chart parts that would reopen as part of the workbook.

Recorded checks covered the 12 KPI cards in the Analysis Summary, net-flow trends, inflow/outflow comparisons, flow-mix charts, chart data caches, worksheet navigation and readable formatting. A smaller but important rule placed AutoFilter on Report Data rather than applying it indiscriminately to every sheet. Negative outflows were also handled correctly when charting their magnitude.

The output had to be useful after download, not just attractive while displayed in the browser.

## 7. Live Analytics introduced another set of real-world problems

After generating a report, the owner wanted to explore the same figures without creating a new Excel workbook for every question. Live Analytics added interactive period filters, group selection, rankings, trends, transactions and an Explorer.

**A performance concern:** rendering every record and every chart point at once could slow a browser. Workbook operations were moved into Web Workers, and visible tables and charts were bounded while calculations continued to use the full matching dataset. Showing 20 transactions on a page did not mean that only 20 records contributed to the totals.

**A consistency concern:** reopening a generated file should give the same analytical results as the original session. A hidden `_EF_Metadata` worksheet preserved field identities, role mappings, report period and parsing conventions. On reopening, the system recalculated from Report Data rather than trusting possibly edited or outdated summary cells.

**A state concern:** changing date and category filters should not silently rewrite the original report. The dashboard used temporary filter state over a shared normalized dataset.

The Codex development record describes a supplied 2,000-record workbook tested across 20 filter/time states. Repository tests also cover larger synthetic datasets and mathematical parity after reopening.

## 8. The Workbook Builder solved the empty-start problem

A new visitor might not have a compatible file ready. Asking that visitor to upload an unknown workbook was a weak first experience.

The Builder created a more useful starting point. Users could choose a business template, add or rename fields, select types and roles, and produce either a **blank workbook** or a **fictional sample workbook**. Supported templates covered sales, products, customers, suppliers, transactions, combined records and custom layouts.

Smaller design problems mattered here too. The sample generator needed consistent customers and products rather than unrelated random values. Quantities, unit prices, discounts and tax rates had to reconcile. Purchases, fees and refunds needed the correct transaction signs. A blank workbook had to remain genuinely blank while retaining formats and validation.

The Builder reused the same reporting engine instead of introducing a second calculation system. Development tests included 5,000-row workbook generation and return-to-report checks.

## 9. The major upgrade: an AI analyst that investigates, rather than guesses

On 17 October, the repository introduced the Mastra agent and its data tools. The product now had two clearly separated responsibilities: deterministic JavaScript engines computed the figures, while OpenAI helped interpret questions and explain supported results.

The Mastra agent received nine read-only investigation tools:

| Tool | What it contributes |
| --- | --- |
| `catalog` | Lists available worksheets, columns and mappings |
| `overview` | Calculates business summaries and key movements |
| `records` | Finds and sorts individual transactions with row references |
| `cell` | Reads a particular original cell value |
| `aggregate` | Groups the entire matching dataset by date or another field |
| `compare` | Compares two defined periods |
| `anomalies` | Flags statistical outlier candidates |
| `quality` | Reports invalid, missing or duplicate-looking data |
| `reconcile` | Describes source/report coverage and selection differences |

This separation addressed a familiar failure risk: a fluent AI answer can sound convincing even if its numbers were invented. The tools supplied calculations and data evidence first. The model's job was to explain what the evidence supported.

One especially useful distinction was between the **largest individual receipt** and the **highest total receipts on a day**. They require different calculations. The tool design and question guidance explicitly recognised that difference.

## 10. Making AI findings reviewable

The agent was required to use the data tools before giving a substantive answer. Tool results received evidence IDs such as `e1` and `e2`. Findings had to refer to IDs actually created during that investigation; unsupported references could cause the backend to reject the answer.

The interface offered **Inspect evidence and tool calculations**, allowing the owner to look beyond an AI-written paragraph. Findings, recommendations and limitations were kept separate. The agent was instructed not to merge currencies, invent missing facts or treat cash flow as accounting profit.

This was an important improvement, but not a magical guarantee. A valid evidence reference identifies a real tool result; people should still review whether the interpretation makes sense. The product was designed to support that review.

The Codex account also records a practical AI question: *“I want to purchase this business. Give me your take only in 2 paragraphs.”* The example tested both evidence-based reasoning and respect for the requested response length. The recorded answer noted that a short transaction history could not, by itself, justify a business valuation.

## 11. An original workbook and a processed report are not interchangeable

Another problem emerged from normal reporting choices. Suppose the source workbook has 20 columns, but only eight are selected for the generated report. A later AI question might depend on one of the omitted columns.

The solution was to give the AI session access to the processed data and, with separate user consent, the complete supplied original workbook. The agent tools could then inspect raw worksheets and physical row/cell references rather than pretending the missing column existed in the report.

The backend also recalculated authoritative numeric and date values instead of blindly trusting normalized values supplied by the browser. If someone reopened a saved report without its original source, the interface explained that omitted original fields could not be recovered automatically.

This made the boundaries of an answer clearer and reduced the chance of confident conclusions from incomplete inputs.

## 12. Privacy, temporary sessions and recoverable failures

Excel reporting, workbook generation and Live Analytics were designed to run locally in the browser. The user did not need to send a workbook to OpenAI just to obtain standard reports.

AI investigation was an explicit, optional step. Before connection, the interface asked for permission to send the supplied raw workbook and processed report to a temporary backend. Relevant tool results could then be provided to OpenAI for the answer. The OpenAI API key remained on the backend.

A session used a random bearer token, in-memory storage and a 20-minute inactivity limit. If the backend restarted or a token expired, the active browser could reconnect the already-authorised dataset and retry. A full page refresh was not described as permanent cloud recovery.

The API also included payload limits, concurrent-request limits, tool budgets, timeouts and process-level quotas. The Mastra observability path was designed to export structural trace details without workbook content. These were deliberate demo-service safeguards, not a claim of permanent account authentication or unlimited public scale.

## 13. Deployment needed its own user experience

The frontend was built for GitHub Pages. A separate Node/TypeScript API was configured for Render, and the Mastra framework orchestrated the OpenAI investigation. Mastra Platform, when configured, was an observability destination rather than a second place where the application ran.

Several small operational details had real consequences. The frontend needed the correct public `VITE_AI_URL`, while the backend needed private API credentials and an allowed website origin. A missing backend URL had to produce a clear message instead of silently attempting localhost or inventing an AI response. Free-tier hosting could also delay the first request, so the interface began explaining response timing.

A Pages deployment and successful local AI tests did not automatically configure the Render service. The product's setup guide therefore separated build, secrets, backend activation, provider testing and observability checks.

## 14. Making the AI conversation comfortable for a real user

A technical answer is less useful if the interface feels stuck or difficult to navigate. On 18 October, the AI workspace received targeted refinements.

When requests took time, the page showed elapsed seconds, progress feedback, cancellation and a patient first-request message. After a long answer, **Ask another question** returned focus to the input instead of forcing the user to scroll manually.

The project added searchable example questions and freeform follow-ups. Users could request a brief answer or one paragraph while keeping detailed evidence available in a separate, collapsible section.

Language support expanded to ten presets—English, Spanish, German, French, Portuguese, Arabic, Urdu, Hindi, Bengali and Chinese—with a custom language field for requests such as Roman Urdu. Each answer retained its selected language. Model quality in every language remained a matter for real-provider testing, rather than an automatic guarantee.

## 15. Saving useful results: PDFs and Excel Findings

The owner needed to take results out of the application. Three PDF choices were introduced: save one AI answer, save the successful conversation, or save a calculated business overview without any AI connection. These actions used the browser's print-to-PDF workflow, so saving a PDF did not require another model call.

Multilingual layouts added another difficulty. Urdu and Arabic needed right-to-left shaping; Hindi, Bengali and Chinese also needed readable text and sensible pagination. The test record describes three PDF layout fixtures—one, five and two pages—rendered and visually inspected.

A separate challenge concerned the Excel download. Adding an **AI Findings** worksheet through a complete workbook rewrite risked changing existing chart structures. The implementation instead patched the XLSX ZIP/OOXML package: it added the new worksheet and relationships while preserving existing worksheet/chart entries. Tests checked those original entries byte for byte.

This was a small-looking feature with a thoughtful technical solution behind it.

## 16. Helping a newcomer understand the product

Even after the features were working, a first-time user might not know how to begin. The Quick Guide grew into 14 chapters covering workbook creation, uploads, field mapping, reporting, Live Analytics, AI permission, questions, languages, downloads and troubleshooting.

An 11-chapter Technical Guide then explained the architecture, tools, evidence, deployment and boundaries for more technical readers. Both guides were tested for navigation, mobile layout, keyboard use and preservation of an unfinished workflow.

The homepage also gained **Try with Sample Data** and a download link for the original fictional workbook. This mattered because users could reproduce the example, check the figures and experience the workflow without providing private financial information.

The public sample contains 60 fictional transactions. Its documented expected totals are **EUR 6,806 inflows, EUR −1,965 outflows and EUR 4,841 net**, plus a separate **USD −79 net**. One invalid Amount remains available for quality review rather than being silently included in the sum.

## 17. What the testing actually covered

Testing grew with the product rather than appearing only at the end.

| Area | Recorded checks and findings |
| --- | --- |
| Spreadsheet foundation | 49 passing tests in the final documented suite; numbers, dates, report generation, currencies, metadata and Builder paths |
| AI functionality | 11 passing AI tests recorded by 18 October; evidence, sessions, source access, workbook preservation and PDF behaviour |
| Browser journeys | Local Playwright tests for upload/consent, AI UI, reopening, navigation, mobile layouts and accessibility checks |
| Data scale | Recorded 2,000-row/20-state workbook journey, 5,000-row Builder tests and 50,000-record calculation tests |
| Provider behaviour | Controlled browser responses and deterministic tests; real-provider answer quality was a separate acceptance concern |
| GitHub automation | Successful build, foundation tests, AI tests, server type-check and Pages deployment on 18 October 2026 |

The repository's `TEST_REPORT.md` distinguishes automated tests from live model behaviour. The latest verified GitHub Actions run, on commit `dc344d731`, independently confirms that the configured CI stages passed. The browser suites were documented separately, not part of that particular CI job.

This combination is useful evidence of quality work: not because any single green result proves everything, but because it shows the problems the team chose to test.

## 18. The development decisions that mattered most

**We kept a real business task at the centre.** The point was always to make Excel preparation and review easier, not to add AI simply because AI was available.

**We changed direction when a rewrite lost functionality.** The fuller tested foundation was restored and reused instead of accepting a weaker new version.

**We separated calculation from explanation.** The browser engines and read-only tools performed arithmetic; the AI agent explained results and limitations.

**We treated user confusion as product feedback.** Mapping persistence, visible response progress, beginner guidance, sample access and shorter-answer controls came from making the workflow easier to use.

**We kept the data boundary visible.** Local reporting did not require uploading financial records; AI access required explicit permission and was session-scoped.

**We tested the final files, not only the screen.** Reports had to reopen with consistent figures, and adding AI Findings could not damage native Excel charts.

These are the reasons ExcelFlow AI is best understood as an iteratively developed business application with an integrated AI analyst, rather than as a one-prompt chatbot demo.

## 19. The final product and the shared contribution

By the last recorded October update, ExcelFlow AI combined workbook creation, original XLSX upload, guided report generation, Live Analytics, a Mastra/OpenAI investigation workspace, evidence inspection, multilingual conversation, PDF outputs and updated Excel workbooks with AI Findings.

The most important work was collaborative. The owner understood the recurring reporting task, described what ordinary users needed, reviewed results and requested improvements. Codex converted those requirements into code, engineering changes and tests. The project progressed through repeated cycles of trying a version, noticing something that did not work well, fixing it and checking again.

**Professional summary:** ExcelFlow AI demonstrates practical product direction, AI-assisted software delivery, thoughtful use of deterministic analytics with language models, and an ongoing effort to make technical capabilities useful to non-technical business users.

## Repository milestones and supporting sources

| Commit | Date | Main change |
| --- | --- | --- |
| [`8f4fba439`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/8f4fba439) | 16 Oct 2026 | Initial reporting and analytics application |
| [`ed614c0b0`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/ed614c0b0) | 16 Oct 2026 | Compiled frontend and GitHub Pages workflow |
| [`6071c114e`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/6071c114e) | 17 Oct 2026 | Reporting parity fixes and homepage demo |
| [`9d563306c`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/9d563306c) | 17 Oct 2026 | Full reporting foundation restored |
| [`cc7f47071`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/cc7f47071) | 17 Oct 2026 | Mastra agent, tools and AI Findings |
| [`ad2801134`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/ad2801134) | 18 Oct 2026 | Multilingual PDFs and AI conversation refinements |
| [`9d09cf641`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/9d09cf641) | 18 Oct 2026 | Quick Guide and sample workflow |
| [`e31b12ec2`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/e31b12ec2) | 18 Oct 2026 | Technical Guide |
| [`652e47a63`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/652e47a63) | 18 Oct 2026 | Original sample workbook download |
| [`dc344d731`](https://github.com/Navid-Ishaq/excelflowai-detleng/commit/dc344d731) | 18 Oct 2026 | Response-time guidance; successful CI and Pages deployment |

**Project records:** `README.md`, `ARCHITECTURE.md`, `BUILDER.md`, `LIVE_ANALYTICS.md`, `AI_SETUP.md`, `TECHNICAL_GUIDE.md`, `TEST_REPORT.md`, the repository test suites, and the Codex-written development reconstruction provided by the project owner.

**Verification note:** The report records implementation, documented tests and the available deployment evidence. It is not a formal security certification or a new comprehensive live-provider test. The source and project history remain available for readers who want to examine the work directly.

## Development update — 5 November 2026: How to Build on the website

**What changed:** The ExcelFlow AI website gained a **How to Build** navigation entry so visitors can read this development journey in a dedicated, responsive documentation reader. The top navigation entries for LFDS and DeTLeng Network were replaced by How to Build and **Discuss at Automation Desk ↗**, which opens the Automation Desk in a separate browser tab. The older ecosystem links remain available in the footer.

**How it works:** This Markdown file is stored at `docs/development-journey/DEVELOPMENT_JOURNEY.md` and imported as plain text by the Vite frontend at build time. The reader provides chapter navigation, title search, reading progress, accessible headings and scrollable tables. Content is escaped before Markdown formatting so the document does not become an arbitrary HTML input.

**Future maintenance:** Replace or edit only this Markdown file, follow `MAINTENANCE_GUIDE.txt` in the same folder, and push the change. The existing GitHub Actions build includes the current document automatically. No separate database, CMS, server endpoint or manual JavaScript edit is needed for a normal content update.

**Scope:** This documentation change does not modify workbook calculations, reporting, Live Analytics, the Mastra agent or the AI backend. The update is source-level work; deployment and live acceptance are completed when the owner pushes and checks the public website.

## Development update — 5 November 2026, 02:28 CET: Persistent chapter navigation

**User feedback:** While reading the How to Build documentation, the chapter list on the left moved out of view as the main document scrolled. This made it hard to see the current chapter or jump to another section without returning to the top. The owner requested a persistent left navigation panel, with the chapter being read highlighted automatically.

**What changed:** The desktop chapter sidebar now stays visible while the document scrolls. Its title and chapter search remain in place, while the list of chapters scrolls independently inside the sidebar. As the reader moves through the right-hand document, the corresponding chapter is highlighted and, when necessary, brought into view **inside the left chapter list only**. Clicking a chapter still moves the document to that section. On narrow mobile screens, the existing compact chapter selector remains available.

**Files changed:** `src/how-to-build.css` (sticky layout and independent chapter-list scrolling), `src/how-to-build-view.js` (active-chapter tracking and sidebar-only auto-scroll), `tests/how-to-build.test.js` (navigation regression checks), and this Markdown development log. The maintenance guide in this folder also explains the intended behaviour.

**Verification:** JavaScript syntax and Markdown reader checks were run against the updated files. This note records the source update, not a claim that the owner's Windows folder or deployed website has already been modified. The owner can place the patch in the repository, run the project build and push it to publish the change.
