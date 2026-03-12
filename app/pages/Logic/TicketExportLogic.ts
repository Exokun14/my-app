// ─────────────────────────────────────────────────────────────────────────────
// TicketExportLogic.ts  →  app/pages/Logic/TicketExportLogic.ts
//
// Exports : exportTicketCSV · exportTicketJSON · exportTicketXLSX
//           exportTicketPDF · exportTicketPPTX
//           downloadTicketTemplate · importTicketsFromXLSX
// ─────────────────────────────────────────────────────────────────────────────

export interface TicketRecord {
  id:           number | string;
  title?:       string;
  description?: string;
  status:       string;   // "open" | "pending" | "in_progress" | "closed" | "resolved"
  priority?:    string;   // "low" | "normal" | "medium" | "high" | "critical"
  category?:    string;
  created_at?:  string | null;
  updated_at?:  string | null;
}

export interface ImportResult {
  imported: TicketRecord[];
  errors:   { row: number; message: string }[];
  skipped:  number;
}

// ─── Shared utils ─────────────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function timestamp() { return new Date().toISOString().slice(0, 10); }
function ticketTitle(t: TicketRecord) { return t.title ?? `Ticket #${t.id}`; }

async function loadExcelJS() {
  if ((window as any).ExcelJS) return (window as any).ExcelJS;
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js";
    s.onload = () => res();
    s.onerror = () => rej(new Error("Failed to load ExcelJS"));
    document.head.appendChild(s);
  });
  return (window as any).ExcelJS;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV
// ─────────────────────────────────────────────────────────────────────────────
export function exportTicketCSV(data: TicketRecord[]) {
  const headers = ["ID","Title","Status","Priority","Category","Created","Updated"];
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = data.map(r => [
    r.id, esc(ticketTitle(r)), esc(r.status), esc(r.priority ?? ""),
    esc(r.category ?? ""), esc(r.created_at ?? ""), esc(r.updated_at ?? ""),
  ].join(","));
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `tickets-${timestamp()}.csv`);
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON
// ─────────────────────────────────────────────────────────────────────────────
export function exportTicketJSON(data: TicketRecord[]) {
  const open    = data.filter(r => r.status === "open").length;
  const pending = data.filter(r => ["pending","in_progress"].includes(r.status)).length;
  const closed  = data.filter(r => ["closed","resolved"].includes(r.status)).length;
  const high    = data.filter(r => ["high","critical"].includes((r.priority ?? "").toLowerCase())).length;
  const payload = {
    meta: { exported_at: new Date().toISOString(), total_tickets: data.length, open, pending, closed, high_priority: high },
    records: data.map(r => ({
      id: r.id, title: ticketTitle(r), status: r.status,
      priority: r.priority ?? null, category: r.category ?? null,
      created_at: r.created_at ?? null, updated_at: r.updated_at ?? null,
      description: r.description ?? null,
    })),
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `tickets-${timestamp()}.json`);
}

// ─────────────────────────────────────────────────────────────────────────────
// XLSX export
// ─────────────────────────────────────────────────────────────────────────────
export async function exportTicketXLSX(data: TicketRecord[]) {
  const ExcelJS = await loadExcelJS();
  const open    = data.filter(r => r.status === "open").length;
  const pending = data.filter(r => ["pending","in_progress"].includes(r.status)).length;
  const closed  = data.filter(r => ["closed","resolved"].includes(r.status)).length;
  const high    = data.filter(r => ["high","critical"].includes((r.priority ?? "").toLowerCase())).length;
  const dateStr = new Date().toLocaleDateString("en-US", { dateStyle: "long" });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Support Tickets App"; wb.created = new Date();

  function fill(hex: string) { return { type:"pattern", pattern:"solid", fgColor:{ argb:"FF"+hex } } as any; }
  function font(hex: string, size: number, bold = false, italic = false) {
    return { name:"Calibri", size, bold, italic, color:{ argb:"FF"+hex } } as any;
  }
  function border(hex = "C4B5FD") {
    const s = { style:"thin" as const, color:{ argb:"FF"+hex } };
    return { top:s, bottom:s, left:s, right:s };
  }
  function align(h: "left"|"center"|"right" = "left", wrap = false) {
    return { horizontal:h, vertical:"middle" as const, wrapText:wrap };
  }
  function sc(cell: any, opts: { value?: string|number; bold?: boolean; italic?: boolean; sz?: number; color?: string; bg?: string; h?: "left"|"center"|"right"; bdr?: boolean; bdrColor?: string; wrap?: boolean }) {
    if (opts.value !== undefined) cell.value = opts.value;
    if (opts.bg) cell.fill = fill(opts.bg);
    if (opts.color || opts.sz || opts.bold || opts.italic)
      cell.font = font(opts.color ?? "18103A", opts.sz ?? 11, opts.bold ?? false, opts.italic ?? false);
    cell.alignment = align(opts.h ?? "left", opts.wrap ?? false);
    if (opts.bdr) cell.border = border(opts.bdrColor ?? "C4B5FD");
  }

  // Sheet 1 — Summary
  const ws1 = wb.addWorksheet("Summary");
  ws1.columns = Array(6).fill({ width: 20 });
  ws1.getRow(1).height = 44; ws1.mergeCells("A1:F1");
  sc(ws1.getCell("A1"), { value:"SUPPORT TICKET REPORT", bold:true, sz:22, color:"FFFFFF", bg:"4C1D95", h:"center" });
  ws1.getRow(2).height = 20; ws1.mergeCells("A2:F2");
  sc(ws1.getCell("A2"), { value:`Exported ${dateStr}`, italic:true, sz:10, color:"C4B5FD", bg:"2E1065", h:"center" });
  ws1.getRow(3).height = 10;
  ws1.getRow(4).height = 20; ws1.getRow(5).height = 60; ws1.getRow(6).height = 10;

  const cards = [
    { label:"TOTAL TICKETS", val:data.length, bg:"EDE9FE", hbg:"7C3AED", color:"4C1D95", cols:["A","B"] },
    { label:"OPEN",          val:open,         bg:"FEE2E2", hbg:"DC2626", color:"991B1B", cols:["C","D"] },
    { label:"CLOSED",        val:closed,       bg:"DCFCE7", hbg:"16A34A", color:"14532D", cols:["E","F"] },
  ];
  cards.forEach(({ label, val, bg, hbg, color, cols }) => {
    ws1.mergeCells(`${cols[0]}4:${cols[1]}4`);
    sc(ws1.getCell(`${cols[0]}4`), { value:label, bold:true, sz:9, color:"FFFFFF", bg:hbg, h:"center" });
    ws1.mergeCells(`${cols[0]}5:${cols[1]}5`);
    sc(ws1.getCell(`${cols[0]}5`), { value:val, bold:true, sz:36, color, bg, h:"center" });
    ws1.mergeCells(`${cols[0]}6:${cols[1]}6`);
    ws1.getCell(`${cols[0]}6`).fill = fill(bg);
  });

  ws1.getRow(7).height = 10;
  ws1.getRow(8).height = 20; ws1.mergeCells("A8:F8");
  sc(ws1.getCell("A8"), { value:"STATUS BREAKDOWN", bold:true, sz:9, color:"7C3AED", bg:"F5F3FF", h:"center" });

  const breakdown = [
    { status:"🔴  Open",         count:open,    bg:"FEE2E2", color:"991B1B", bdr:"FCA5A5" },
    { status:"🟡  Pending",      count:pending, bg:"FEF3C7", color:"92400E", bdr:"FCD34D" },
    { status:"✅  Closed",       count:closed,  bg:"DCFCE7", color:"14532D", bdr:"86EFAC" },
    { status:"🔥  High Priority", count:high,   bg:"EDE9FE", color:"4C1D95", bdr:"C4B5FD" },
  ];
  breakdown.forEach(({ status, count, bg, color, bdr }, i) => {
    const row = 9 + i; const pct = data.length ? `${Math.round((count/data.length)*100)}%` : "0%";
    ws1.getRow(row).height = 22;
    ws1.mergeCells(`A${row}:B${row}`); sc(ws1.getCell(`A${row}`), { value:status, bold:true, sz:11, color, bg, bdr:true, bdrColor:bdr, h:"left" });
    ws1.mergeCells(`C${row}:D${row}`); sc(ws1.getCell(`C${row}`), { value:count, bold:true, sz:14, color, bg, bdr:true, bdrColor:bdr, h:"center" });
    ws1.mergeCells(`E${row}:F${row}`); sc(ws1.getCell(`E${row}`), { value:pct, sz:11, color, bg, bdr:true, bdrColor:bdr, h:"center" });
  });

  // Sheet 2 — Tickets data
  const ws2 = wb.addWorksheet("Tickets");
  ws2.columns = [{ width:8 },{ width:36 },{ width:14 },{ width:12 },{ width:18 },{ width:16 },{ width:16 }];
  ws2.getRow(1).height = 24;
  ["ID","Title","Status","Priority","Category","Created","Updated"].forEach((h, i) => {
    sc(ws2.getCell(1, i+1), { value:h, bold:true, sz:10, color:"FFFFFF", bg:"4C1D95", h:"center", bdr:true, bdrColor:"7C3AED" });
  });

  const statBg  = (s: string) => ({ open:"FEE2E2", pending:"FEF3C7", in_progress:"FEF3C7", closed:"DCFCE7", resolved:"DCFCE7" }[s.toLowerCase()] ?? "F3F4F6");
  const statCol = (s: string) => ({ open:"991B1B", pending:"92400E", in_progress:"92400E", closed:"14532D", resolved:"14532D" }[s.toLowerCase()] ?? "374151");
  const statBdr = (s: string) => ({ open:"FCA5A5", pending:"FCD34D", in_progress:"FCD34D", closed:"86EFAC", resolved:"86EFAC" }[s.toLowerCase()] ?? "D1D5DB");
  const prioBg  = (p: string) => ({ critical:"F5F3FF", high:"FEE2E2", medium:"FEF3C7", low:"DCFCE7", normal:"F0FDF4" }[p.toLowerCase()] ?? "F3F4F6");
  const prioCol = (p: string) => ({ critical:"4C1D95", high:"991B1B", medium:"92400E", low:"14532D", normal:"14532D" }[p.toLowerCase()] ?? "374151");
  const prioBdr = (p: string) => ({ critical:"C4B5FD", high:"FCA5A5", medium:"FCD34D", low:"86EFAC", normal:"86EFAC" }[p.toLowerCase()] ?? "D1D5DB");

  data.forEach((r, ri) => {
    const row = ri + 2; const rowBg = ri % 2 === 0 ? "F5F3FF" : "FFFFFF";
    const s = r.status.toLowerCase(); const p = (r.priority ?? "").toLowerCase();
    ws2.getRow(row).height = 20;
    sc(ws2.getCell(row,1), { value:r.id, sz:10, bg:rowBg, h:"center", bdr:true });
    sc(ws2.getCell(row,2), { value:ticketTitle(r), sz:10, bg:rowBg, bdr:true, wrap:true });
    sc(ws2.getCell(row,3), { value:r.status, sz:10, bold:true, color:statCol(s), bg:statBg(s), h:"center", bdr:true, bdrColor:statBdr(s) });
    sc(ws2.getCell(row,4), { value:r.priority ?? "—", sz:10, bold:true, color:prioCol(p), bg:prioBg(p), h:"center", bdr:true, bdrColor:prioBdr(p) });
    sc(ws2.getCell(row,5), { value:r.category ?? "—", sz:10, bg:rowBg, bdr:true });
    sc(ws2.getCell(row,6), { value:r.created_at ?? "—", sz:10, color:"6B7280", bg:rowBg, h:"center", bdr:true });
    sc(ws2.getCell(row,7), { value:r.updated_at ?? "—", sz:10, color:"6B7280", bg:rowBg, h:"center", bdr:true });
  });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `tickets-${timestamp()}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────────────
export function exportTicketPDF(data: TicketRecord[]) {
  const pageW=595.28, pageH=841.89, margin=40, tableW=pageW-margin*2;
  const cols = [
    { label:"ID",       w:tableW*0.08 }, { label:"Title",    w:tableW*0.30 },
    { label:"Status",   w:tableW*0.14 }, { label:"Priority", w:tableW*0.12 },
    { label:"Category", w:tableW*0.18 }, { label:"Created",  w:tableW*0.18 },
  ];
  const headerH=22, rowH=18, bannerH=36, statsH=20, topY=pageH-margin;
  const open    = data.filter(r => r.status==="open").length;
  const pending = data.filter(r => ["pending","in_progress"].includes(r.status)).length;
  const closed  = data.filter(r => ["closed","resolved"].includes(r.status)).length;
  const high    = data.filter(r => ["high","critical"].includes((r.priority??"").toLowerCase())).length;

  function safe(s: string) { return s.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)"); }

  function pageOneHeader() {
    const lines: string[] = [];
    const bannerY = topY - bannerH;
    lines.push(`q 0.30 0.11 0.58 rg ${margin} ${bannerY} ${tableW} ${bannerH} re f Q`);
    lines.push(`BT /F1 15 Tf 1 1 1 rg ${margin+8} ${bannerY+13} Td (Support Ticket Report) Tj ET`);
    const dateStr = new Date().toLocaleDateString("en-US",{dateStyle:"long"});
    lines.push(`BT /F2 8 Tf 0.76 0.70 0.95 rg ${margin+8} ${bannerY+3} Td (${safe(dateStr)}) Tj ET`);
    const statsY = bannerY - statsH;
    lines.push(`q 0.97 0.96 0.99 rg ${margin} ${statsY} ${tableW} ${statsH} re f Q`);
    const stats = [`Total: ${data.length}`,`Open: ${open}`,`Pending: ${pending}`,`Closed: ${closed}`,`High: ${high}`];
    const statW = tableW / stats.length;
    stats.forEach((s,i) => lines.push(`BT /F1 7.5 Tf 0.28 0.06 0.42 rg ${margin+6+i*statW} ${statsY+6} Td (${safe(s)}) Tj ET`));
    return lines.join("\n");
  }

  function tableHeader(y: number) {
    const lines: string[] = [];
    lines.push(`q 0.27 0.15 0.55 rg ${margin} ${y} ${tableW} ${headerH} re f Q`);
    let x = margin;
    cols.forEach(({ label, w }) => { lines.push(`BT /F1 8 Tf 1 1 1 rg ${x+5} ${y+7} Td (${safe(label)}) Tj ET`); x += w; });
    return lines.join("\n");
  }

  function statusRGB(s: string): [number,number,number] {
    return ({ open:[0.86,0.13,0.15], pending:[0.85,0.47,0.03], in_progress:[0.85,0.47,0.03], closed:[0.09,0.64,0.29], resolved:[0.09,0.64,0.29] } as any)[s.toLowerCase()] ?? [0.4,0.4,0.4];
  }
  function priorityRGB(p: string): [number,number,number] {
    return ({ critical:[0.42,0.24,0.84], high:[0.86,0.13,0.15], medium:[0.85,0.47,0.03], low:[0.09,0.64,0.29], normal:[0.09,0.64,0.29] } as any)[p.toLowerCase()] ?? [0.4,0.4,0.4];
  }

  function dataRow(r: TicketRecord, ri: number, y: number) {
    const lines: string[] = [];
    if (ri%2===0) lines.push(`q 0.97 0.96 0.99 rg ${margin} ${y} ${tableW} ${rowH} re f Q`);
    lines.push(`q 0.88 0.86 0.93 rg ${margin} ${y} ${tableW} 0.4 re f Q`);
    const cells = [String(r.id), ticketTitle(r).slice(0,38), r.status, r.priority??"—", r.category??"—", r.created_at?r.created_at.slice(0,10):"—"];
    let x = margin;
    cols.forEach(({ w }, ci) => {
      const txt = safe(cells[ci]); const textY = y+5;
      if (ci===2) {
        const [fr,fg,fb] = statusRGB(cells[ci]);
        lines.push(`q ${fr*0.9} ${fg*0.9} ${fb*0.9} rg ${x+3} ${y+3} ${w-6} 12 re f Q`);
        lines.push(`BT /F1 7 Tf 1 1 1 rg ${x+5} ${textY} Td (${txt}) Tj ET`);
      } else if (ci===3) {
        const [fr,fg,fb] = priorityRGB(cells[ci]);
        lines.push(`BT /F1 8 Tf ${fr} ${fg} ${fb} rg ${x+5} ${textY} Td (${txt}) Tj ET`);
      } else {
        lines.push(`BT /F2 7.5 Tf 0.10 0.06 0.23 rg ${x+5} ${textY} Td (${txt}) Tj ET`);
      }
      x += w;
    });
    return lines.join("\n");
  }

  const pageStreams: string[] = [];
  let ri = 0;
  while (ri < data.length || pageStreams.length===0) {
    const isFirst = pageStreams.length===0;
    const lines: string[] = [];
    let tableTopY: number;
    if (isFirst) { lines.push(pageOneHeader()); tableTopY = topY-bannerH-statsH-10; }
    else { tableTopY = pageH-margin-10; }
    lines.push(tableHeader(tableTopY));
    let y = tableTopY - rowH;
    while (y > margin+rowH && ri < data.length) { lines.push(dataRow(data[ri],ri,y)); y -= rowH; ri++; }
    lines.push(`BT /F2 7 Tf 0.60 0.60 0.60 rg ${pageW/2-15} 18 Td (Page ${pageStreams.length+1}) Tj ET`);
    pageStreams.push(lines.join("\n"));
    if (ri >= data.length) break;
  }

  const enc = new TextEncoder();
  function makeObj(idx: number, body: string) { return enc.encode(`${idx} 0 obj\n${body}\nendobj\n`); }
  const n=pageStreams.length, F1id=1, F2id=2, streamStart=3, pageStart=streamStart+n, pagesId=pageStart+n, catalogId=pagesId+1;
  const allObjs = [
    { idx:F1id,  body:`<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>` },
    { idx:F2id,  body:`<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>` },
    ...pageStreams.map((stream,i) => ({ idx:streamStart+i, body:`<</Length ${enc.encode(stream).length}>>\nstream\n${stream}\nendstream` })),
    ...pageStreams.map((_,i) => ({ idx:pageStart+i, body:`<</Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${streamStart+i} 0 R /Resources <</Font <</F1 ${F1id} 0 R /F2 ${F2id} 0 R>>>>>>` })),
    { idx:pagesId,   body:`<</Type /Pages /Kids [${Array.from({length:n},(_,i)=>`${pageStart+i} 0 R`).join(" ")}] /Count ${n}>>` },
    { idx:catalogId, body:`<</Type /Catalog /Pages ${pagesId} 0 R>>` },
  ];
  const header = enc.encode("%PDF-1.5\n%\xE2\xE3\xCF\xD3\n");
  let cursor = header.length;
  const xrefOffsets = new Array(catalogId+1).fill(0);
  const objBytes: Uint8Array[] = [];
  for (const obj of allObjs) { xrefOffsets[obj.idx]=cursor; const buf=makeObj(obj.idx,obj.body); objBytes.push(buf); cursor+=buf.length; }
  const xrefPos = cursor;
  const xrefStr = ["xref",`0 ${catalogId+1}`,"0000000000 65535 f \n",...allObjs.map(({idx})=>`${String(xrefOffsets[idx]).padStart(10,"0")} 00000 n `)].join("\n");
  const trailer = `\ntrailer\n<</Size ${catalogId+1} /Root ${catalogId} 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;
  const parts = [header,...objBytes,enc.encode(xrefStr+trailer)];
  const total = parts.reduce((s,b)=>s+b.length,0);
  const out = new Uint8Array(total); let pos=0;
  for (const p of parts) { out.set(p,pos); pos+=p.length; }
  downloadBlob(new Blob([out],{type:"application/pdf"}), `tickets-${timestamp()}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PPTX
// ─────────────────────────────────────────────────────────────────────────────
export async function exportTicketPPTX(data: TicketRecord[]) {
  if (!(window as any).PptxGenJS) {
    await new Promise<void>((res,rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
      s.onload = ()=>res(); s.onerror = ()=>rej(new Error("Failed to load PptxGenJS"));
      document.head.appendChild(s);
    });
  }
  const pres = new (window as any).PptxGenJS();
  pres.layout = "LAYOUT_16x9"; pres.title = "Support Ticket Report";
  const open    = data.filter(r=>r.status==="open").length;
  const pending = data.filter(r=>["pending","in_progress"].includes(r.status)).length;
  const closed  = data.filter(r=>["closed","resolved"].includes(r.status)).length;
  const high    = data.filter(r=>["high","critical"].includes((r.priority??"").toLowerCase())).length;
  const dateStr = new Date().toLocaleDateString("en-US",{dateStyle:"long"});
  const mkSh    = () => ({ type:"outer" as const, color:"000000", blur:8, offset:3, angle:135, opacity:0.12 });

  // Slide 1 — Title
  const s1 = pres.addSlide(); s1.background={color:"2E1065"};
  s1.addShape(pres.shapes.OVAL,{x:6.8,y:-1.2,w:4.5,h:4.5,fill:{color:"4C1D95",transparency:55},line:{color:"4C1D95",transparency:55}});
  s1.addShape(pres.shapes.OVAL,{x:7.8,y:-0.4,w:2.8,h:2.8,fill:{color:"6D28D9",transparency:65},line:{color:"6D28D9",transparency:65}});
  s1.addShape(pres.shapes.RECTANGLE,{x:0,y:5.125,w:10,h:0.5,fill:{color:"6D28D9"},line:{color:"6D28D9"}});
  s1.addText("SUPPORT TICKET",{x:0.55,y:1.55,w:8,h:0.75,fontSize:52,bold:true,color:"FFFFFF",fontFace:"Calibri",charSpacing:4,margin:0});
  s1.addText("REPORT",{x:0.55,y:2.28,w:8.5,h:0.75,fontSize:52,bold:true,color:"8B5CF6",fontFace:"Calibri",charSpacing:4,margin:0});
  s1.addText(`Prepared ${dateStr}`,{x:0.6,y:3.2,w:6,h:0.35,fontSize:14,color:"C4B5FD",italic:true,fontFace:"Calibri",margin:0});
  [{v:String(data.length),l:"TOTAL",bg:"4C1D95",acc:"8B5CF6"},{v:String(open),l:"OPEN",bg:"991B1B",acc:"FCA5A5"},{v:String(pending),l:"PENDING",bg:"92400E",acc:"FCD34D"},{v:String(closed),l:"CLOSED",bg:"065F46",acc:"34D399"}].forEach(({v,l,bg,acc},i) => {
    const x=0.55+i*2.25;
    s1.addShape(pres.shapes.RECTANGLE,{x,y:3.9,w:2.05,h:1.0,fill:{color:bg},line:{color:acc}});
    s1.addShape(pres.shapes.RECTANGLE,{x,y:3.9,w:2.05,h:0.07,fill:{color:acc},line:{color:acc}});
    s1.addText(v,{x,y:3.97,w:2.05,h:0.55,fontSize:28,bold:true,color:"FFFFFF",fontFace:"Calibri",align:"center",valign:"middle",margin:0});
    s1.addText(l,{x,y:4.54,w:2.05,h:0.28,fontSize:7.5,bold:true,color:"FFFFFF",fontFace:"Calibri",align:"center",charSpacing:1.5,margin:0});
  });

  // Slide 2 — Summary
  const s2 = pres.addSlide(); s2.background={color:"F8F7FF"};
  s2.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:10,h:1.05,fill:{color:"4C1D95"},line:{color:"4C1D95"}});
  s2.addText("EXECUTIVE SUMMARY",{x:0.55,y:0,w:7.5,h:1.05,fontSize:26,bold:true,color:"FFFFFF",fontFace:"Calibri",valign:"middle",charSpacing:3,margin:0});
  s2.addText(dateStr,{x:7.6,y:0,w:2.2,h:1.05,fontSize:11,color:"C4B5FD",italic:true,fontFace:"Calibri",align:"right",valign:"middle",margin:0});
  [{v:String(data.length),l:"TOTAL",bg:"4C1D95",acc:"8B5CF6"},{v:String(open),l:"OPEN",bg:"DC2626",acc:"FCA5A5"},{v:String(pending),l:"PENDING",bg:"D97706",acc:"FCD34D"},{v:String(closed),l:"CLOSED",bg:"059669",acc:"34D399"}].forEach(({v,l,bg,acc},i) => {
    const cx=0.35+i*2.35;
    s2.addShape(pres.shapes.RECTANGLE,{x:cx,y:1.2,w:2.2,h:1.65,fill:{color:bg},shadow:mkSh(),line:{color:bg}});
    s2.addShape(pres.shapes.RECTANGLE,{x:cx,y:1.2,w:2.2,h:0.08,fill:{color:acc},line:{color:acc}});
    s2.addText(v,{x:cx,y:1.28,w:2.2,h:0.85,fontSize:46,bold:true,color:"FFFFFF",fontFace:"Calibri",align:"center",valign:"middle",margin:0});
    s2.addText(l,{x:cx,y:2.15,w:2.2,h:0.28,fontSize:9,bold:true,color:"FFFFFF",fontFace:"Calibri",align:"center",charSpacing:2,margin:0});
  });
  [{l:"Open",c:open,p:Math.round(open/data.length*100),bg:"FEE2E2",col:"991B1B"},{l:"Pending",c:pending,p:Math.round(pending/data.length*100),bg:"FEF3C7",col:"92400E"},{l:"Closed",c:closed,p:Math.round(closed/data.length*100),bg:"DCFCE7",col:"14532D"},{l:"High Pri",c:high,p:Math.round(high/data.length*100),bg:"EDE9FE",col:"4C1D95"}].forEach(({l,c,p,bg,col},i)=>{
    const px=0.35+i*2.35;
    s2.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:px,y:3.1,w:2.2,h:0.85,fill:{color:bg},line:{color:bg},rectRadius:0.08});
    s2.addText([{text:String(c),options:{fontSize:22,bold:true,color:col}},{text:`  ${l}`,options:{fontSize:12,bold:false,color:col}}],{x:px+0.1,y:3.12,w:2.0,h:0.44,valign:"middle",fontFace:"Calibri",margin:0});
    s2.addText(`${p}% of total`,{x:px+0.1,y:3.58,w:2.0,h:0.3,fontSize:10,color:col,italic:true,fontFace:"Calibri",margin:0});
  });
  s2.addShape(pres.shapes.RECTANGLE,{x:0.35,y:4.15,w:9.3,h:0.9,fill:{color:"EDE9FE"},line:{color:"C4B5FD"}});
  s2.addShape(pres.shapes.RECTANGLE,{x:0.35,y:4.15,w:0.07,h:0.9,fill:{color:"7C3AED"},line:{color:"7C3AED"}});
  s2.addText(`🔥  ${high} high-priority / critical ticket${high!==1?"s":""} require immediate attention.`,{x:0.55,y:4.15,w:9.0,h:0.9,fontSize:12,bold:true,color:"4C1D95",fontFace:"Calibri",valign:"middle",margin:0});

  // Slide 3 — Charts
  const s3 = pres.addSlide(); s3.background={color:"2E1065"};
  s3.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:10,h:1.0,fill:{color:"4C1D95"},line:{color:"4C1D95"}});
  s3.addText("TICKET BREAKDOWN",{x:0.55,y:0,w:8,h:1.0,fontSize:26,bold:true,color:"FFFFFF",fontFace:"Calibri",valign:"middle",charSpacing:3,margin:0});
  s3.addChart(pres.charts.DOUGHNUT,[{name:"Status",labels:["Open","Pending","Closed"],values:[open,pending,closed]}],{x:0.3,y:1.1,w:4.6,h:3.9,chartColors:["DC2626","D97706","059669"],holeSize:60,showPercent:true,dataLabelColor:"FFFFFF",dataLabelFontSize:13,dataLabelFontBold:true,showLegend:true,legendPos:"b",legendColor:"FFFFFF",legendFontSize:11,chartArea:{fill:{color:"2E1065"}}});
  const prioGroups = ["critical","high","medium","low","normal"].map(p=>({ label:p.charAt(0).toUpperCase()+p.slice(1), count:data.filter(r=>(r.priority??"normal").toLowerCase()===p).length })).filter(g=>g.count>0);
  if (prioGroups.length>0) {
    s3.addChart(pres.charts.BAR,[{name:"Count",labels:prioGroups.map(g=>g.label),values:prioGroups.map(g=>g.count)}],{x:5.1,y:1.1,w:4.6,h:3.9,barDir:"bar",chartColors:prioGroups.map(g=>({Critical:"7C3AED",High:"DC2626",Medium:"D97706",Low:"059669",Normal:"94A3B8"}[g.label]??"94A3B8"),),chartArea:{fill:{color:"2E1065"}},catAxisLabelColor:"C4B5FD",valAxisLabelColor:"C4B5FD",valGridLine:{color:"3B1D8A",size:0.5},catGridLine:{style:"none"},showValue:true,dataLabelColor:"FFFFFF",dataLabelFontSize:9,showLegend:false});
  }

  // Slide 4 — Detail table
  const s4 = pres.addSlide(); s4.background={color:"F8F7FF"};
  s4.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:10,h:1.0,fill:{color:"2E1065"},line:{color:"2E1065"}});
  s4.addText("TICKET DETAIL",{x:0.55,y:0,w:7,h:1.0,fontSize:26,bold:true,color:"FFFFFF",fontFace:"Calibri",valign:"middle",charSpacing:3,margin:0});
  const colW4=[0.55,3.1,1.55,1.3,1.8,1.5]; const hdrY=1.05; const rowH4=0.36;
  s4.addShape(pres.shapes.RECTANGLE,{x:0.25,y:hdrY,w:9.5,h:0.4,fill:{color:"4C1D95"},line:{color:"4C1D95"}});
  ["ID","Title","Status","Priority","Category","Created"].reduce((hx,label,i)=>{
    s4.addText(label,{x:hx+0.06,y:hdrY,w:colW4[i]-0.06,h:0.4,fontSize:9,bold:true,color:"FFFFFF",fontFace:"Calibri",valign:"middle",margin:0}); return hx+colW4[i];
  },0.25);
  const sBg4  = (s:string) => ({open:"FEE2E2",pending:"FEF3C7",in_progress:"FEF3C7",closed:"DCFCE7",resolved:"DCFCE7"}[s]??"F3F4F6");
  const sCol4 = (s:string) => ({open:"991B1B",pending:"92400E",in_progress:"92400E",closed:"14532D",resolved:"14532D"}[s]??"374151");
  const pBg4  = (p:string) => ({critical:"F5F3FF",high:"FEE2E2",medium:"FEF3C7",low:"DCFCE7",normal:"F0FDF4"}[p]??"F3F4F6");
  const pCol4 = (p:string) => ({critical:"4C1D95",high:"991B1B",medium:"92400E",low:"14532D",normal:"14532D"}[p]??"374151");
  let ty4=hdrY+0.4;
  data.slice(0,12).forEach((r,ri)=>{
    const rowBg=ri%2===0?"F5F3FF":"FFFFFF"; const s=r.status.toLowerCase(); const p=(r.priority??"normal").toLowerCase();
    s4.addShape(pres.shapes.RECTANGLE,{x:0.25,y:ty4,w:9.5,h:rowH4,fill:{color:rowBg},line:{color:"E5E7EB"}});
    let cx4=0.25;
    s4.addText(String(r.id),{x:cx4+0.04,y:ty4,w:colW4[0]-0.04,h:rowH4,fontSize:8,color:"6D28D9",bold:true,fontFace:"Calibri",valign:"middle",align:"center",margin:0}); cx4+=colW4[0];
    s4.addText(ticketTitle(r),{x:cx4+0.06,y:ty4,w:colW4[1]-0.1,h:rowH4,fontSize:8.5,color:"1E1B4B",fontFace:"Calibri",valign:"middle",margin:0}); cx4+=colW4[1];
    const sph=rowH4-0.1; s4.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:cx4+0.04,y:ty4+0.05,w:colW4[2]-0.1,h:sph,fill:{color:sBg4(s)},line:{color:sBg4(s)},rectRadius:0.04}); s4.addText(r.status,{x:cx4+0.04,y:ty4+0.05,w:colW4[2]-0.1,h:sph,fontSize:7.5,bold:true,color:sCol4(s),fontFace:"Calibri",align:"center",valign:"middle",margin:0}); cx4+=colW4[2];
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:cx4+0.04,y:ty4+0.05,w:colW4[3]-0.1,h:sph,fill:{color:pBg4(p)},line:{color:pBg4(p)},rectRadius:0.04}); s4.addText(r.priority??"—",{x:cx4+0.04,y:ty4+0.05,w:colW4[3]-0.1,h:sph,fontSize:7.5,bold:true,color:pCol4(p),fontFace:"Calibri",align:"center",valign:"middle",margin:0}); cx4+=colW4[3];
    s4.addText(r.category??"—",{x:cx4+0.06,y:ty4,w:colW4[4]-0.1,h:rowH4,fontSize:8,color:"475569",fontFace:"Calibri",valign:"middle",margin:0}); cx4+=colW4[4];
    s4.addText(r.created_at?r.created_at.slice(0,10):"—",{x:cx4+0.04,y:ty4,w:colW4[5]-0.04,h:rowH4,fontSize:7.5,color:"6B7280",fontFace:"Calibri",valign:"middle",align:"center",margin:0});
    ty4+=rowH4;
  });
  if (data.length>12) s4.addText(`+ ${data.length-12} more tickets — see full CSV/XLSX export`,{x:0.25,y:ty4+0.05,w:9.5,h:0.3,fontSize:9,color:"8B5CF6",italic:true,fontFace:"Calibri",align:"center",margin:0});

  // Slide 5 — Closing
  const s5 = pres.addSlide(); s5.background={color:"2E1065"};
  s5.addShape(pres.shapes.OVAL,{x:-0.8,y:2.5,w:3.5,h:3.5,fill:{color:"4C1D95",transparency:60},line:{color:"4C1D95",transparency:60}});
  s5.addShape(pres.shapes.OVAL,{x:8.2,y:-0.8,w:3.0,h:3.0,fill:{color:"6D28D9",transparency:65},line:{color:"6D28D9",transparency:65}});
  s5.addText("TICKET SUMMARY",{x:1,y:1.4,w:8,h:0.7,fontSize:44,bold:true,color:"FFFFFF",fontFace:"Calibri",align:"center",charSpacing:3,margin:0});
  s5.addText(`${closed} of ${data.length} tickets resolved — ${open} still open.`,{x:1.5,y:2.15,w:7,h:0.4,fontSize:15,color:"C4B5FD",italic:true,fontFace:"Calibri",align:"center",margin:0});
  [{title:`${open} Open`,sub:"Require immediate action",bg:"991B1B"},{title:`${closed} Closed`,sub:`${Math.round(closed/data.length*100)}% resolution rate`,bg:"065F46"},{title:`${high} Urgent`,sub:"High or critical priority",bg:"6D28D9"}].forEach(({title,sub,bg},i)=>{
    const ax=0.55+i*2.98;
    s5.addShape(pres.shapes.RECTANGLE,{x:ax,y:2.75,w:2.75,h:1.7,fill:{color:bg},shadow:mkSh(),line:{color:bg}});
    s5.addShape(pres.shapes.RECTANGLE,{x:ax,y:2.75,w:2.75,h:0.07,fill:{color:"FFFFFF",transparency:40},line:{color:"FFFFFF",transparency:40}});
    s5.addText(title,{x:ax,y:3.0,w:2.75,h:0.42,fontSize:18,bold:true,color:"FFFFFF",fontFace:"Calibri",align:"center",margin:0});
    s5.addText(sub,{x:ax+0.1,y:3.45,w:2.55,h:0.42,fontSize:9,color:"FFFFFF",italic:true,fontFace:"Calibri",align:"center",margin:0});
  });
  s5.addShape(pres.shapes.RECTANGLE,{x:0,y:5.12,w:10,h:0.5,fill:{color:"6D28D9"},line:{color:"6D28D9"}});
  s5.addText(`Support Ticket Report  ·  ${dateStr}  ·  F&B Support`,{x:0,y:5.12,w:10,h:0.5,fontSize:9,color:"FFFFFF",italic:true,fontFace:"Calibri",align:"center",valign:"middle",margin:0});
  const blob = await pres.write({outputType:"blob"}) as Blob;
  downloadBlob(blob, `tickets-${timestamp()}.pptx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE DOWNLOAD
// Styled XLSX the user fills in then re-uploads to update tickets.
// Sheet 1 = "Tickets" (editable data with locked header + dropdowns)
// Sheet 2 = "Reference" (valid values for Status / Priority / Category)
// ─────────────────────────────────────────────────────────────────────────────
export async function downloadTicketTemplate() {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Support Tickets App"; wb.created = new Date();

  function fill(hex: string) { return { type:"pattern", pattern:"solid", fgColor:{ argb:"FF"+hex } } as any; }
  function font(hex: string, size: number, bold = false, italic = false) {
    return { name:"Calibri", size, bold, italic, color:{ argb:"FF"+hex } } as any;
  }
  function thinBorder(hex = "C4B5FD") {
    const s = { style:"thin" as const, color:{ argb:"FF"+hex } };
    return { top:s, bottom:s, left:s, right:s };
  }

  // ── Sheet 1: Tickets ──────────────────────────────────────────────────────
  const ws = wb.addWorksheet("Tickets");

  // Banner
  ws.mergeCells("A1:F1");
  const banner = ws.getCell("A1");
  banner.value = "🎫  TICKET IMPORT TEMPLATE  —  Fill in the rows below and re-upload to update tickets";
  banner.fill  = fill("4C1D95"); banner.font = font("FFFFFF",11,true);
  banner.alignment = { horizontal:"center", vertical:"middle" };
  ws.getRow(1).height = 26;

  // Sub-banner hint
  ws.mergeCells("A2:F2");
  const hint = ws.getCell("A2");
  hint.value = "⚠  Do NOT change column headers (Row 3).  ID = existing ticket ID to update.  See 'Reference' sheet for valid Status / Priority values.";
  hint.fill = fill("EDE9FE"); hint.font = font("4C1D95",9,false,true);
  hint.alignment = { horizontal:"center", vertical:"middle" };
  ws.getRow(2).height = 20;

  // Set column widths AFTER merges so ExcelJS doesn't reset them
  ws.getColumn(1).width = 8;   // ID
  ws.getColumn(2).width = 36;  // Title
  ws.getColumn(3).width = 44;  // Description
  ws.getColumn(4).width = 15;  // Status
  ws.getColumn(5).width = 13;  // Priority
  ws.getColumn(6).width = 22;  // Category

  // Column headers
  const HEADERS = ["ID","Title","Description","Status","Priority","Category"];
  const hdrRow = ws.getRow(3);
  HEADERS.forEach((h, i) => {
    const cell = hdrRow.getCell(i+1);
    cell.value = h;
    cell.fill  = fill("4C1D95");
    cell.font  = font("FFFFFF",10,true);
    cell.alignment = { horizontal:"center", vertical:"middle" };
    cell.border = thinBorder("9F67F5");
  });
  hdrRow.height = 22;

  // 20 blank editable rows — all cells truly empty, no default values
  for (let ri = 0; ri < 20; ri++) {
    const row = ws.getRow(ri + 4);
    const rowBg = ri % 2 === 0 ? "F5F3FF" : "FFFFFF";
    [1,2,3,4,5,6].forEach(ci => {
      const cell = row.getCell(ci);
      cell.value = null;
      cell.fill  = fill(ci === 1 ? "EDE9FE" : rowBg);
      cell.font  = font(ci === 1 ? "6D28D9" : "18103A", 10, ci === 1);
      cell.alignment = { vertical:"middle", horizontal: ci === 1 ? "center" : "left" };
      cell.border = thinBorder("DDD6FE");
    });
    row.height = 20;
  }

  // ── Sheet 2: Reference ────────────────────────────────────────────────────
  const ref = wb.addWorksheet("Reference");
  ref.columns = [{ width:18 },{ width:18 },{ width:22 }];

  ref.mergeCells("A1:C1");
  const refTitle = ref.getCell("A1");
  refTitle.value = "Valid Values Reference";
  refTitle.fill = fill("2E1065"); refTitle.font = font("FFFFFF",13,true);
  refTitle.alignment = { horizontal:"center", vertical:"middle" };
  ref.getRow(1).height = 28;

  // Status section
  ref.getCell("A3").value = "STATUS"; ref.getCell("A3").font = font("FFFFFF",9,true); ref.getCell("A3").fill = fill("7C3AED"); ref.getCell("A3").alignment = { horizontal:"center" };
  ref.getCell("B3").value = "COLOR MEANING"; ref.getCell("B3").font = font("FFFFFF",9,true); ref.getCell("B3").fill = fill("7C3AED"); ref.getCell("B3").alignment = { horizontal:"center" };
  const statusInfo = [
    { val:"open",        meaning:"Newly raised, not yet assigned",  bg:"FEE2E2", fg:"991B1B" },
    { val:"pending",     meaning:"Awaiting response / info",        bg:"FEF3C7", fg:"92400E" },
    { val:"in_progress", meaning:"Actively being worked on",        bg:"FEF3C7", fg:"92400E" },
    { val:"closed",      meaning:"Resolved and closed",             bg:"DCFCE7", fg:"14532D" },
    { val:"resolved",    meaning:"Marked resolved by agent",        bg:"DCFCE7", fg:"14532D" },
  ];
  statusInfo.forEach(({ val, meaning, bg, fg }, i) => {
    const row = ref.getRow(4+i);
    const a = row.getCell(1); a.value = val; a.fill = fill(bg); a.font = font(fg,10,true); a.alignment = { horizontal:"center", vertical:"middle" }; a.border = thinBorder(bg);
    const b = row.getCell(2); b.value = meaning; b.font = font("374151",10); b.alignment = { vertical:"middle" }; b.border = thinBorder("E5E7EB");
    row.height = 20;
  });

  // Priority section
  ref.getCell("A10").value = "PRIORITY"; ref.getCell("A10").font = font("FFFFFF",9,true); ref.getCell("A10").fill = fill("7C3AED"); ref.getCell("A10").alignment = { horizontal:"center" };
  ref.getCell("B10").value = "COLOR MEANING"; ref.getCell("B10").font = font("FFFFFF",9,true); ref.getCell("B10").fill = fill("7C3AED"); ref.getCell("B10").alignment = { horizontal:"center" };
  const prioInfo = [
    { val:"critical", meaning:"Immediate action required",    bg:"F5F3FF", fg:"4C1D95" },
    { val:"high",     meaning:"Urgent — resolve within 4h",  bg:"FEE2E2", fg:"991B1B" },
    { val:"medium",   meaning:"Important but not urgent",     bg:"FEF3C7", fg:"92400E" },
    { val:"low",      meaning:"Minor issue / low impact",     bg:"DCFCE7", fg:"14532D" },
    { val:"normal",   meaning:"Standard priority",            bg:"F0FDF4", fg:"14532D" },
  ];
  prioInfo.forEach(({ val, meaning, bg, fg }, i) => {
    const row = ref.getRow(11+i);
    const a = row.getCell(1); a.value = val; a.fill = fill(bg); a.font = font(fg,10,true); a.alignment = { horizontal:"center", vertical:"middle" }; a.border = thinBorder(bg);
    const b = row.getCell(2); b.value = meaning; b.font = font("374151",10); b.alignment = { vertical:"middle" }; b.border = thinBorder("E5E7EB");
    row.height = 20;
  });

  // Category examples
  ref.getCell("A17").value = "CATEGORY EXAMPLES"; ref.getCell("A17").font = font("FFFFFF",9,true); ref.getCell("A17").fill = fill("0D9488"); ref.getCell("A17").alignment = { horizontal:"center" };
  ["POS Hardware","Network Issue","Software Bug","Printer","Payment Terminal","Other"].forEach((cat, i) => {
    const c = ref.getRow(18+i).getCell(1);
    c.value = cat; c.font = font("18103A",10); c.alignment = { vertical:"middle" }; c.border = thinBorder("E5E7EB");
    ref.getRow(18+i).height = 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `ticket-import-template-${timestamp()}.xlsx`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT — parse an uploaded XLSX and return structured results + errors
// ─────────────────────────────────────────────────────────────────────────────
export async function importTicketsFromXLSX(file: File): Promise<ImportResult> {
  const ExcelJS = await loadExcelJS();
  const wb      = new ExcelJS.Workbook();
  const buf     = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  // Try "Tickets" sheet first, fall back to first sheet
  const ws = wb.getWorksheet("Tickets") ?? wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found in the uploaded file.");

  const VALID_STATUS   = new Set(["open","pending","in_progress","closed","resolved"]);
  const VALID_PRIORITY = new Set(["low","normal","medium","high","critical",""]);

  const imported: TicketRecord[] = [];
  const errors: { row: number; message: string }[] = [];
  let skipped = 0;

  // Find header row (row 3 in template, but scan first 5 rows to be safe)
  let dataStartRow = 4; // default: template starts data at row 4
  for (let r = 1; r <= 5; r++) {
    const firstCell = ws.getRow(r).getCell(1).value?.toString().trim().toLowerCase();
    if (firstCell === "id") { dataStartRow = r + 1; break; }
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber < dataStartRow) return;

    const get = (col: number): string =>
      String(row.getCell(col).value ?? "").trim();

    const id          = get(1);
    const title       = get(2);
    const description = get(3);
    const status      = get(4).toLowerCase();
    const priority    = get(5).toLowerCase();
    const category    = get(6);

    // Skip completely blank rows
    if (!id && !title && !status) { skipped++; return; }

    const rowErrors: string[] = [];
    if (!id)    rowErrors.push("ID is required");
    if (!title) rowErrors.push("Title is required");
    if (status && !VALID_STATUS.has(status))   rowErrors.push(`Invalid status "${status}"`);
    if (priority && !VALID_PRIORITY.has(priority)) rowErrors.push(`Invalid priority "${priority}"`);

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join("; ") });
      return;
    }

    imported.push({
      id:          isNaN(Number(id)) ? id : Number(id),
      title:       title || undefined,
      description: description || undefined,
      status:      status || "open",
      priority:    priority || undefined,
      category:    category || undefined,
      updated_at:  new Date().toISOString(),
    });
  });

  return { imported, errors, skipped };
}
