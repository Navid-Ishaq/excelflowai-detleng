export const QUESTIONS=[
 ['Overview','Investigate this dataset in depth','Perform a deep investigation: executive overview, quality, trends, concentration, unusual transactions, and raw/processed coverage. Separate evidence from recommendations.'],
 ['Overview','Explain the business flow','Summarize inflows, outflows, net flow and transaction activity, separately for each currency.'],
 ['Quality','Check data quality','Investigate missing/invalid amounts and dates, duplicate-looking rows, coverage and limitations. Do not delete records.'],
 ['Quality','Compare source and report','Compare supplied original source and processed report using equivalent mappings and filters. Explain intentional report exclusions.'],
 ['Trends','Find strongest and weakest days','Which days have the highest and lowest total inflows and net flow? Separate currencies and distinguish daily totals from individual transactions.'],
 ['Trends','Explain changes over time','Analyze time trends, transaction volumes and cumulative net flow. Explain observed changes without inventing causes.'],
 ['Transactions','Largest and smallest receipts on a date','On {date}, which individual positive receipts were smallest and largest? Show original row evidence, amounts and currencies.'],
 ['Transactions','Investigate unusual amounts','Identify unusually large or small transactions compared with this dataset. Explain the method and do not label records as fraud.'],
 ['Groups','Compare a column','Group by column {column}, compare totals, transaction counts and concentration. Separate currencies.'],
 ['Groups','Where does spending concentrate?','Find the biggest outflow groups using a suitable category, supplier or description column. Show concentration and evidence.'],
 ['Source','Inspect available worksheets','Describe all supplied raw worksheets and the processed report, their original column names, mapped roles and data coverage.'],
 ['Source','What cannot this dataset answer?','Explain missing context, unmapped columns, uncertain labels and questions this dataset cannot support.']
];
export function questionsFor(columns){return [...QUESTIONS,...columns.filter(c=>!['Amount','Date'].includes(c.label)).slice(0,12).map(c=>['Your columns',`Explore ${c.label}`,`Investigate column ${c.id} (${c.label}). Explain its values, distribution and relationship with amounts if appropriate. Preserve original labels.`])];}
