export const HELP={amount:'Positive values become inflows. Negative values become outflows. Zero stays in Report Data only.',group:'Choose the field you want to compare. Analyze all values, one value, or selected values.',live:'Explore KPIs, trends, groups and transactions interactively.'};
export const SCENES={
 welcome:['Welcome to ExcelFlow AI','Understand the whole workflow in under 3 minutes.'],
 build:['No workbook yet? Start here.','Choose a workbook type, columns and settings. Then choose your beginning.'],
 create:['Your columns. Your meaning.','Upload Excel, choose the useful records, and tell ExcelFlow AI what the important columns mean.'],
 report:['A workbook you can understand.','Click a sheet to see what it contains. Only your selected reports are generated.'],
 live:['Ask a question. See the picture change.','Try these fictional filters. This is an illustrative sample, separate from your business data.'],
 return:['Welcome back to your report.','A downloaded ExcelFlow AI workbook can return to the same Live Analytics experience.'],
 privacy:['Your workbook stays on your device.','Processing happens locally in your browser. Your original file remains untouched.'],
 ready:['Build. Create. Analyze. Explore.','Business data in. Clear understanding out.']
};
export const JOURNEYS={all:['welcome','build','create','report','live','return','privacy','ready'],build:['build','create','report','live','return','privacy','ready'],create:['create','report','live','return','privacy','ready'],explore:['return','live','privacy','ready']};
export const SHEETS={
 'Report Data':'Your selected detailed records, including zero amounts.',
 'Inflows':'Transactions where Amount is greater than zero.',
 'Outflows':'Transactions where Amount is less than zero.',
 'Analysis - Summary':'Executive KPIs, time summaries and business comparisons.',
 'Analysis - Charts':'The visual story of your flow, on its own sheet.',
 'Group Analysis':'Compare Customer, Product, Category or any available source field. Multiple group analyses can create multiple sheets.'
};
// Static pedagogical scenarios, not another analytics engine.
export const DEMO={all:[12500,-8300,4200,94],q1:[5500,-3800,1700,40],q2:[7000,-4500,2500,54],one:[2400,-900,1500,18],selected:[6100,-3700,2400,45]};
