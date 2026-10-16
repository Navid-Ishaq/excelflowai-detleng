import JSZip from "jszip";
type ChartSpec = {
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
    zip.file(
      `xl/charts/chart${id}.xml`,
      `<?xml version="1.0" encoding="UTF-8"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${esc(s.title)}</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Net Flow</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="4F46E5"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>${esc(ref)}$${col(s.labelCol)}$${s.start}:$${col(s.labelCol)}$${end}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${esc(ref)}$${col(s.valueCol)}$${s.start}:$${col(s.valueCol)}$${end}</c:f></c:numRef></c:val></c:ser><c:axId val="100"/><c:axId val="200"/></c:barChart><c:catAx><c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="200"/></c:catAx><c:valAx><c:axId val="200"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="#,##0.00" sourceLinked="0"/><c:crossAx val="100"/></c:valAx></c:plotArea><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`,
    );
    const row = 4 + Math.floor(i / 2) * 22,
      column = (i % 2) * 9;
    anchors += `<xdr:twoCellAnchor><xdr:from><xdr:col>${column}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${column + 9}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 21}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="Chart ${id}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${id}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
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
