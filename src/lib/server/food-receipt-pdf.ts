/** Compact one- or multi-page PDF receipt. Uses standard PDF fonts, so unsupported
 * glyphs are transliterated to printable Latin equivalents. No external PDF service. */
type PdfLine={name:string;quantity:number;unitPriceCents:number;lineTotalCents:number};
export type EmailPdfOrder={masterReference:string;eventTitle:string;totalCents:number;chefs:{reference:string;name:string;items:PdfLine[]}[]};
const currency=(n:number)=>"NZ$ "+(n/100).toFixed(2);
const translit:Record<string,string>={
 а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
};
function latin(value:string){
 return [...value].map(c=>{
  const lower=c.toLowerCase();if(translit[lower]!==undefined){const v=translit[lower];return c===lower?v:v.charAt(0).toUpperCase()+v.slice(1)}
  return c.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7e]/g,"-");
 }).join("");
}
const literal=(value:string)=>"("+latin(value).replace(/[\\()]/g,c=>"\\"+c)+")";
function pdfPage(order:EmailPdfOrder,sections:string[][],index:number,count:number){
 const commands:string[]=[];
 const text=(x:number,y:number,size:number,value:string,bold=false)=>{
  commands.push("BT",`/F${bold?2:1} ${size} Tf`,`1 0 0 1 ${x} ${y} Tm`,`${literal(value)} Tj`,"ET");
 };
 const line=(y:number)=>commands.push("0.82 0.75 0.70 RG",`48 ${y} m 547 ${y} l S`);
 text(48,782,22,"MATRYOSHKA",true);
 text(48,760,9,"HOMEMADE FOOD  |  FOOD ORDER RECEIPT");
 line(746);
 text(48,725,12,"MASTER FOOD ORDER NUMBER",true);
 text(48,692,27,order.masterReference,true);
 text(48,671,12,order.eventTitle);
 line(655);
 let y=635;
 for(const section of sections[index]){
  if(section.startsWith("# ")){text(48,y,13,section.slice(2),true);y-=22;continue;}
  if(section.startsWith("~ ")){text(62,y,10,section.slice(2));y-=17;continue;}
  text(48,y,10,section);y-=17;
 }
 line(104);
 text(48,82,13,"TOTAL PAID",true);
 text(440,82,13,currency(order.totalCents),true);
 text(48,55,9,"Paid food order confirmation. Keep your master and chef references.");
 text(48,35,8,`Page ${index+1} of ${count}`);
 return commands.join("\n")+"\n";
}
export function generateFoodReceiptPdf(order:EmailPdfOrder):Buffer{
 const rows:string[]=[];
 for(const chef of order.chefs){
  rows.push("# "+chef.reference+" - "+chef.name);
  for(const item of chef.items){
   const n=latin(item.name);const chunks=n.match(/.{1,68}(?:\s|$)|.{1,68}/g)??[n];
   rows.push(`~ ${item.quantity} x ${chunks[0].trim()}`);
   for(const chunk of chunks.slice(1))rows.push("~     "+chunk.trim());
   rows.push(`~     ${currency(item.unitPriceCents)} each     Line total ${currency(item.lineTotalCents)}`);
  }
 }
 const sections:string[][]=[];for(let i=0;i<rows.length;i+=22)sections.push(rows.slice(i,i+22));if(!sections.length)sections.push([]);
 const objects:string[]=[""];
 const push=(o:string)=>{objects.push(o);return objects.length-1};
 const font1=push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
 const font2=push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
 const pages=push("");
 const kids:number[]=[];
 for(let i=0;i<sections.length;i++){
  const content=pdfPage(order,sections,i,sections.length);
  const bytes=Buffer.from(content,"ascii");
  const stream=push(`<< /Length ${bytes.length} >>\nstream\n${content}endstream`);
  const page=push(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${stream} 0 R >>`);
  kids.push(page);
 }
 objects[pages]=`<< /Type /Pages /Kids [${kids.map(n=>n+" 0 R").join(" ")}] /Count ${kids.length} >>`;
 const catalog=push(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
 const chunks:Buffer[]=[Buffer.from("%PDF-1.4\n","ascii")];const offsets:number[]=[0];let pos=chunks[0].length;
 for(let i=1;i<objects.length;i++){offsets[i]=pos;const b=Buffer.from(`${i} 0 obj\n${objects[i]}\nendobj\n`,"ascii");chunks.push(b);pos+=b.length}
 const start=pos;let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
 for(let i=1;i<objects.length;i++)xref+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 xref+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${start}\n%%EOF\n`;
 chunks.push(Buffer.from(xref,"ascii"));
 return Buffer.concat(chunks);
}
