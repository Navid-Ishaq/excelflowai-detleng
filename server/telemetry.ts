import {Observability,MastraPlatformExporter} from '@mastra/observability';
import {noopLogger} from '@mastra/core/logger';
import type {AnyExportedSpan} from '@mastra/core/observability';
// Whitelist structural trace fields. Never spread an exported span containing user payloads.
export function safeSpan(span:AnyExportedSpan):AnyExportedSpan{return {id:span.id,traceId:span.traceId,parentSpanId:span.parentSpanId,name:`ExcelFlow AI ${span.type}`,type:span.type,startTime:span.startTime,endTime:span.endTime,isEvent:span.isEvent,entityType:span.entityType,entityId:'excelflow-ai-analyst',entityName:'ExcelFlow AI Analyst',attributes:{},metadata:{},tags:['excelflow-ai'],...(span.errorInfo?{errorInfo:{message:'Investigation step failed'}}:{})} as AnyExportedSpan;}
class PrivatePlatformExporter extends MastraPlatformExporter{
 async onLogEvent(){}async onMetricEvent(){}async onScoreEvent(){}async onFeedbackEvent(){}
}
let telemetry:Observability|undefined;
export function getTelemetry(){
 if(!process.env.MASTRA_PLATFORM_ACCESS_TOKEN||!process.env.MASTRA_PROJECT_ID)return undefined;
 return telemetry??=new Observability({default:{enabled:false},configs:{default:{serviceName:'excelflow-ai-analyst',exporters:[new PrivatePlatformExporter({accessToken:process.env.MASTRA_PLATFORM_ACCESS_TOKEN,projectId:process.env.MASTRA_PROJECT_ID,logger:noopLogger,customSpanFormatter:safeSpan,maxBatchWaitMs:1000})],logging:{enabled:false}}}});
}
