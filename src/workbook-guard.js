// Inspect the ZIP central directory before inflating XLSX contents. This guard
// limits resource use; no workbook formulas, macros or external links execute.
export function guardWorkbook(buffer){
  const view=new DataView(buffer),size=view.byteLength;let end=-1;
  for(let i=size-22;i>=Math.max(0,size-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw Error('Workbook could not be read. Use an unencrypted .xlsx file.');
  const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true);let position=offset,total=0;
  if(count>10000||offset>=size)throw Error('Workbook is too complex. Choose a smaller report.');
  for(let i=0;i<count;i++){
    if(position+46>size||view.getUint32(position,true)!==0x02014b50)throw Error('Workbook ZIP structure is unreadable. Save a fresh .xlsx copy in Excel.');
    if(view.getUint16(position+8,true)&1)throw Error('Encrypted workbooks are unsupported. Save an unprotected copy in Excel.');
    const unpacked=view.getUint32(position+24,true);if(unpacked===0xffffffff)throw Error('This workbook uses an unsupported large-file format. Choose a smaller report.');total+=unpacked;
    if(total>150*1024*1024)throw Error('Workbook contents exceed the 150 MB expanded limit. Choose a smaller report.');
    position+=46+view.getUint16(position+28,true)+view.getUint16(position+30,true)+view.getUint16(position+32,true);
  }
  return total;
}
