import JSZip from "jszip";
export type ChartSpec = {
  labels?: string[];
  values?: number[][];
  type?: "bar" | "line" | "doughnut";
  horizontal?: boolean;
  series?: { name: string; column: number; color: string }[];
  sheet: string;
  start: number;
  count: number;
  labelCol: number;
  valueCol: number;
  title: string;
};
const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const col = (n: number) => {
  let s = "";
  while (n) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};
export async function attachCharts(bytes: ArrayBuffer, specs: ChartSpec[]) {
  if (!specs.length) return bytes;
  const zip = await JSZip.loadAsync(bytes),
    wb = await zip.file("xl/workbook.xml")!.async("string");
  const sheets = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({
    name: m[0].match(/name="([^"]+)"/)?.[1],
  }));
  const target = sheets.find((s) => s.name === "Analysis - Charts");
  if (!target) return bytes;
  const index = sheets.indexOf(target) + 1;
  const path = `xl/worksheets/sheet${index}.xml`;
  let sheet = await zip.file(path)!.async("string");
  sheet = sheet.replace(
    "</worksheet>",
    '<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdCharts"/></worksheet>',
  );
  zip.file(path, sheet);
  const relPath = `xl/worksheets/_rels/sheet${index}.xml.rels`;
  const oldRels =
    (await zip.file(relPath)?.async("string")) ||
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  zip.file(
    relPath,
    oldRels.replace(
      "</Relationships>",
      '<Relationship Id="rIdCharts" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>',
    ),
  );
  let anchors = "",
    rels = "",
    types = "";
  for (const [i, s] of specs.entries()) {
    const id = i + 1,
      ref = `'${s.sheet.replaceAll("'", "''")}'!`,
      end = s.start + s.count - 1;
    const labels = s.labels || [];
    const definition = s.series || [
      {
        name:
          s.type === "line"
            ? "Net Flow"
            : s.type === "doughnut"
              ? "Flow Mix"
              : "Net Flow",
        column: s.valueCol,
        color: "08796E",
      },
    ];
    const series = definition
      .map((series, j) => {
        const values = s.values?.[j] || [];
        const points =
          s.type === "doughnut" || (!s.series && s.count === 2)
            ? values
                .map(
                  (_, i) =>
                    `<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${i % 2 ? "BD694E" : "08796E"}"/></a:solidFill></c:spPr></c:dPt>`,
                )
                .join("")
            : "";
        return `<c:ser><c:idx val="${j}"/><c:order val="${j}"/><c:tx><c:v>${esc(series.name)}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill><a:ln w="28575"><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill></a:ln></c:spPr>${s.type === "line" ? '<c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>' : ""}${points}<c:cat><c:strRef><c:f>${esc(ref)}$${col(s.labelCol)}$${s.start}:$${col(s.labelCol)}$${end}</c:f><c:strCache><c:ptCount val="${labels.length}"/>${labels.map((label, i) => `<c:pt idx="${i}"><c:v>${esc(label)}</c:v></c:pt>`).join("")}</c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>${esc(ref)}$${col(series.column)}$${s.start}:$${col(series.column)}$${end}</c:f><c:numCache><c:formatCode>#,##0.00</c:formatCode><c:ptCount val="${values.length}"/>${values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join("")}</c:numCache></c:numRef></c:val></c:ser>`;
      })
      .join("");
    const kind = s.type || "bar";
    const plot =
      kind === "doughnut"
        ? `<c:doughnutChart><c:varyColors val="1"/>${series}<c:firstSliceAng val="270"/><c:holeSize val="60"/></c:doughnutChart>`
        : kind === "line"
          ? `<c:lineChart><c:grouping val="standard"/>${series}<c:axId val="100"/><c:axId val="200"/></c:lineChart>`
          : `<c:barChart><c:barDir val="${s.horizontal ? "bar" : "col"}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:gapWidth val="90"/><c:overlap val="0"/><c:axId val="100"/><c:axId val="200"/></c:barChart>`;
    const axes =
      kind === "doughnut"
        ? ""
        : `<c:catAx><c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${s.horizontal ? "l" : "b"}"/><c:tickLblPos val="nextTo"/><c:crossAx val="200"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/></c:catAx><c:valAx><c:axId val="200"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${s.horizontal ? "b" : "l"}"/><c:majorGridlines/><c:numFmt formatCode="#,##0.00" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="100"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
    zip.file(
      `xl/charts/chart${id}.xml`,
      `<?xml version="1.0" encoding="UTF-8"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:lang val="en-US"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1400" b="1"/><a:t>${esc(s.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:plotArea><c:layout/>${plot}${axes}</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`,
    );
    const row = 6 + i * 24,
      column = 0;
    anchors += `<xdr:twoCellAnchor><xdr:from><xdr:col>${column}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${column + 12}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 20}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="Chart ${id}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${id}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
    rels += `<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${id}.xml"/>`;
    types += `<Override PartName="/xl/charts/chart${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;
  }
  zip.file(
    "xl/drawings/drawing1.xml",
    `<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`,
  );
  zip.file(
    "xl/drawings/_rels/drawing1.xml.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`,
  );
  const ct = await zip.file("[Content_Types].xml")!.async("string");
  zip.file(
    "[Content_Types].xml",
    ct.replace(
      "</Types>",
      `${types}<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`,
    ),
  );
  return zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
