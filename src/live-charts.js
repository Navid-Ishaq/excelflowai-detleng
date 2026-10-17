import Chart from 'chart.js/auto';
const instances=new Set();
export function clearCharts(){for(const chart of instances)chart.destroy();instances.clear();}
export function chartSnapshot(canvas){const chart=Chart.getChart(canvas);return chart?{type:chart.config.type,labels:[...chart.data.labels],series:chart.data.datasets.map(s=>({label:s.label,values:[...s.data]}))}:null;}
export function drawChart(canvas,{type='bar',labels,series,horizontal=false,onPick}){
  const doughnut=type==='doughnut';
  if(!labels.length||!series.some(s=>s.values.some(v=>v!==0&&v!=null)))return;
  const chart=new Chart(canvas,{type:type==='line'&&labels.length===1?'bar':type,data:{labels,datasets:series.map((s,i)=>({label:s.label,data:s.values,backgroundColor:doughnut?['#087f74','#ad593b','#3d6da8','#80704e','#976786','#607f50']:s.color||['#087f74','#ad593b','#3d6da8'][i%3],borderColor:s.color||'#087f74',borderWidth:type==='line'?2:0,pointRadius:labels.length>80?0:3,tension:0}))},options:{responsive:true,maintainAspectRatio:false,animation:false,normalized:true,indexAxis:horizontal?'y':'x',plugins:{legend:{display:series.length>1||doughnut,position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.label} — ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString(undefined,{maximumFractionDigits:2})}`}}},scales:doughnut?{}:{x:{beginAtZero:horizontal,ticks:{maxTicksLimit:12,maxRotation:0,autoSkip:true}},y:{beginAtZero:!horizontal,ticks:horizontal?{autoSkip:false,font:{size:11},callback:function(value){const label=String(this.getLabelForValue(value));const limit=this.chart.width<450?22:38;return label.length>limit?label.slice(0,limit-1)+'…':label;}}:{maxTicksLimit:6}}},onClick:(event,items)=>{if(items.length&&onPick)onPick(items[0].index);}}});instances.add(chart);return chart;
}
