// ─────────────────────────────────────────────────────────────────────────────
// ProgressExportLogic.ts  →  app/pages/Logic/ProgressExportLogic.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { ProgressRecord } from "../../Data/types";

// ─── Shared util ─────────────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function timestamp() {
  return new Date().toISOString().slice(0, 10);
}

// ─── CSV — UTF-8 BOM so Excel opens it correctly ─────────────────────────────
export function exportCSV(data: ProgressRecord[]) {
  const headers = ["Course", "Progress (%)", "Status", "Started", "Completed"];
  const escape  = (v: string | number) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const rows = data.map(r => [
    escape(r.course),
    r.progress,
    escape(r.status),
    escape(r.started   ?? ""),
    escape(r.completed ?? ""),
  ].join(","));

  // \uFEFF = UTF-8 BOM so Excel auto-detects encoding
  const csv  = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `progress-${timestamp()}.csv`
  );
}

// ─── JSON ─────────────────────────────────────────────────────────────────────
export function exportJSON(data: ProgressRecord[]) {
  const completed  = data.filter(r => r.status === "Completed").length;
  const inProgress = data.filter(r => r.status === "In Progress").length;
  const avg        = data.length
    ? Math.round(data.reduce((s, r) => s + r.progress, 0) / data.length)
    : 0;

  const payload = {
    meta: {
      exported_at:   new Date().toISOString(),
      total_courses: data.length,
      completed,
      in_progress:   inProgress,
      not_started:   data.length - completed - inProgress,
      avg_progress:  `${avg}%`,
    },
    records: data.map(r => ({
      course:    r.course,
      progress:  r.progress,
      status:    r.status,
      started:   r.started   ?? null,
      completed: r.completed ?? null,
    })),
  };

  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `progress-${timestamp()}.json`
  );
}

// ─── XLSX — uses ExcelJS from CDN (full styling: fills, fonts, borders) ───────
export async function exportXLSX(data: ProgressRecord[]) {
  // Load ExcelJS from CDN if not already present
  if (!(window as any).ExcelJS) {
    await new Promise<void>((resolve, reject) => {
      const s   = document.createElement("script");
      s.src     = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js";
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error("Failed to load ExcelJS"));
      document.head.appendChild(s);
    });
  }

  const ExcelJS   = (window as any).ExcelJS;
  const completed  = data.filter(r => r.status === "Completed").length;
  const inProgress = data.filter(r => r.status === "In Progress").length;
  const notStarted = data.length - completed - inProgress;
  const avg        = data.length
    ? Math.round(data.reduce((s, r) => s + r.progress, 0) / data.length) : 0;
  const dateStr    = new Date().toLocaleDateString("en-US", { dateStyle: "long" });

  const wb = new ExcelJS.Workbook();
  wb.creator  = "My Learning App";
  wb.created  = new Date();

  // ── Style helpers ────────────────────────────────────────────────────────
  function fill(hex: string) {
    return { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + hex } } as any;
  }
  function font(hex: string, size: number, bold = false, italic = false) {
    return { name: "Calibri", size, bold, italic, color: { argb: "FF" + hex } } as any;
  }
  function border(hex = "C4B5FD") {
    const s = { style: "thin" as const, color: { argb: "FF" + hex } };
    return { top: s, bottom: s, left: s, right: s };
  }
  function align(h: "left"|"center"|"right" = "left", wrap = false) {
    return { horizontal: h, vertical: "middle" as const, wrapText: wrap };
  }

  function styleCell(
    cell: any,
    opts: {
      value?:   string | number;
      bold?:    boolean;
      italic?:  boolean;
      sz?:      number;
      color?:   string;
      bg?:      string;
      h?:       "left" | "center" | "right";
      bdr?:     boolean;
      bdrColor?:string;
      wrap?:    boolean;
    }
  ) {
    if (opts.value !== undefined) cell.value = opts.value;
    if (opts.bg)    cell.fill  = fill(opts.bg);
    if (opts.color || opts.sz || opts.bold || opts.italic)
      cell.font  = font(opts.color ?? "18103A", opts.sz ?? 11, opts.bold ?? false, opts.italic ?? false);
    cell.alignment = align(opts.h ?? "left", opts.wrap ?? false);
    if (opts.bdr)   cell.border = border(opts.bdrColor ?? "C4B5FD");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1 — SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet("Summary");
  ws1.columns = Array(6).fill({ width: 20 });

  // ── Row 1: Title banner ──────────────────────────────────────────────────
  ws1.getRow(1).height = 44;
  ws1.mergeCells("A1:F1");
  styleCell(ws1.getCell("A1"), { value: "MY LEARNING PROGRESS", bold: true, sz: 22, color: "FFFFFF", bg: "4C1D95", h: "center" });

  // ── Row 2: Subtitle ──────────────────────────────────────────────────────
  ws1.getRow(2).height = 20;
  ws1.mergeCells("A2:F2");
  styleCell(ws1.getCell("A2"), { value: `Exported ${dateStr}`, italic: true, sz: 10, color: "C4B5FD", bg: "2E1065", h: "center" });

  // ── Row 3: Spacer ────────────────────────────────────────────────────────
  ws1.getRow(3).height = 10;

  // ── Rows 4–6: Stat cards ─────────────────────────────────────────────────
  ws1.getRow(4).height = 20;
  ws1.getRow(5).height = 60;
  ws1.getRow(6).height = 10;

  const cards = [
    { label: "TOTAL COURSES", val: data.length, bg: "EDE9FE", hbg: "7C3AED", color: "4C1D95", cols: ["A","B"] },
    { label: "COMPLETED",     val: completed,   bg: "D1FAE5", hbg: "059669", color: "065F46", cols: ["C","D"] },
    { label: "IN PROGRESS",   val: inProgress,  bg: "FEF3C7", hbg: "D97706", color: "92400E", cols: ["E","F"] },
  ];

  cards.forEach(({ label, val, bg, hbg, color, cols }) => {
    ws1.mergeCells(`${cols[0]}4:${cols[1]}4`);
    styleCell(ws1.getCell(`${cols[0]}4`), { value: label, bold: true, sz: 9, color: "FFFFFF", bg: hbg, h: "center" });

    ws1.mergeCells(`${cols[0]}5:${cols[1]}5`);
    styleCell(ws1.getCell(`${cols[0]}5`), { value: val, bold: true, sz: 36, color, bg, h: "center" });

    ws1.mergeCells(`${cols[0]}6:${cols[1]}6`);
    ws1.getCell(`${cols[0]}6`).fill = fill(bg);
  });

  // ── Row 7: Spacer ────────────────────────────────────────────────────────
  ws1.getRow(7).height = 10;

  // ── Row 8: Avg header ────────────────────────────────────────────────────
  ws1.getRow(8).height = 20;
  ws1.mergeCells("A8:F8");
  styleCell(ws1.getCell("A8"), { value: "AVERAGE COMPLETION PROGRESS", bold: true, sz: 9, color: "7C3AED", bg: "F5F3FF", h: "center" });

  // ── Row 9: Big % ─────────────────────────────────────────────────────────
  ws1.getRow(9).height = 64;
  ws1.mergeCells("A9:F9");
  styleCell(ws1.getCell("A9"), { value: `${avg}%`, bold: true, sz: 48, color: "6D28D9", bg: "FDFCFF", h: "center" });

  // ── Row 10: Visual progress bar ──────────────────────────────────────────
  ws1.getRow(10).height = 14;
  const filled = Math.round((avg / 100) * 6);
  ["A","B","C","D","E","F"].forEach((col, i) => {
    ws1.getCell(`${col}10`).fill = fill(i < filled ? "7C3AED" : "DDD6FE");
  });

  // ── Row 11: Bar label ────────────────────────────────────────────────────
  ws1.getRow(11).height = 18;
  ws1.mergeCells("A11:F11");
  styleCell(ws1.getCell("A11"), { value: `${completed} of ${data.length} courses completed`, italic: true, sz: 10, color: "8B5CF6", h: "center" });

  // ── Row 12: Spacer ───────────────────────────────────────────────────────
  ws1.getRow(12).height = 10;

  // ── Row 13: Breakdown table header ───────────────────────────────────────
  ws1.getRow(13).height = 20;
  ws1.mergeCells("A13:B13");
  styleCell(ws1.getCell("A13"), { value: "STATUS",     bold: true, sz: 9, color: "FFFFFF", bg: "4C1D95", h: "center", bdr: true });
  ws1.mergeCells("C13:D13");
  styleCell(ws1.getCell("C13"), { value: "COUNT",      bold: true, sz: 9, color: "FFFFFF", bg: "4C1D95", h: "center", bdr: true });
  ws1.mergeCells("E13:F13");
  styleCell(ws1.getCell("E13"), { value: "% OF TOTAL", bold: true, sz: 9, color: "FFFFFF", bg: "4C1D95", h: "center", bdr: true });

  // ── Rows 14–16: Breakdown rows ───────────────────────────────────────────
  [
    { status: "✅  Completed",   count: completed,  bg: "D1FAE5", color: "065F46", bdr: "A7F3D0" },
    { status: "🔄  In Progress", count: inProgress, bg: "EDE9FE", color: "4C1D95", bdr: "C4B5FD" },
    { status: "⬜  Not Started", count: notStarted, bg: "F3F4F6", color: "374151", bdr: "D1D5DB" },
  ].forEach(({ status, count, bg, color, bdr }, i) => {
    const row = 14 + i;
    const pct = data.length ? `${Math.round((count / data.length) * 100)}%` : "0%";
    ws1.getRow(row).height = 22;

    ws1.mergeCells(`A${row}:B${row}`);
    styleCell(ws1.getCell(`A${row}`), { value: status, bold: true, sz: 11, color, bg, bdr: true, bdrColor: bdr, h: "left" });

    ws1.mergeCells(`C${row}:D${row}`);
    styleCell(ws1.getCell(`C${row}`), { value: count,  bold: true, sz: 14, color, bg, bdr: true, bdrColor: bdr, h: "center" });

    ws1.mergeCells(`E${row}:F${row}`);
    styleCell(ws1.getCell(`E${row}`), { value: pct,    bold: false,sz: 11, color, bg, bdr: true, bdrColor: bdr, h: "center" });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2 — PROGRESS DATA
  // ══════════════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet("Progress");
  ws2.columns = [
    { width: 42 }, { width: 14 }, { width: 18 }, { width: 16 }, { width: 16 },
  ];

  // Header row
  ws2.getRow(1).height = 24;
  ["Course", "Progress (%)", "Status", "Started", "Completed"].forEach((h, i) => {
    styleCell(ws2.getCell(1, i + 1), { value: h, bold: true, sz: 10, color: "FFFFFF", bg: "4C1D95", h: "center", bdr: true, bdrColor: "7C3AED" });
  });

  // Data rows
  data.forEach((r, ri) => {
    const row    = ri + 2;
    const rowBg  = ri % 2 === 0 ? "F5F3FF" : "FFFFFF";
    const sBg    = r.status === "Completed"   ? "D1FAE5"
                 : r.status === "In Progress" ? "EDE9FE" : "F3F4F6";
    const sColor = r.status === "Completed"   ? "065F46"
                 : r.status === "In Progress" ? "4C1D95" : "374151";
    const sBdr   = r.status === "Completed"   ? "A7F3D0"
                 : r.status === "In Progress" ? "C4B5FD" : "D1D5DB";

    ws2.getRow(row).height = 20;
    styleCell(ws2.getCell(row, 1), { value: r.course,           sz: 10, bg: rowBg, bdr: true, wrap: true });
    styleCell(ws2.getCell(row, 2), { value: r.progress,         sz: 11, bold: true, color: "6D28D9", bg: rowBg, h: "center", bdr: true });
    styleCell(ws2.getCell(row, 3), { value: r.status,           sz: 10, bold: true, color: sColor, bg: sBg, h: "center", bdr: true, bdrColor: sBdr });
    styleCell(ws2.getCell(row, 4), { value: r.started   ?? "—", sz: 10, color: "6B7280", bg: rowBg, h: "center", bdr: true });
    styleCell(ws2.getCell(row, 5), { value: r.completed ?? "—", sz: 10, color: "6B7280", bg: rowBg, h: "center", bdr: true });
  });

  // ── Write & download ──────────────────────────────────────────────────────
  const buf  = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `progress-${timestamp()}.xlsx`
  );
}



// ─── PDF — proper multi-page with accurate xref offsets ──────────────────────
export function exportPDF(data: ProgressRecord[]) {
  const pageW  = 595.28;
  const pageH  = 841.89;
  const margin = 40;
  const tableW = pageW - margin * 2;

  const cols: { label: string; w: number }[] = [
    { label: "Course",     w: tableW * 0.36 },
    { label: "Progress",   w: tableW * 0.12 },
    { label: "Status",     w: tableW * 0.18 },
    { label: "Started",    w: tableW * 0.17 },
    { label: "Completed",  w: tableW * 0.17 },
  ];

  const headerH   = 22;
  const rowH      = 18;
  const bannerH   = 36;
  const statsH    = 20;
  const titleTopY = pageH - margin;

  // Stats
  const completed  = data.filter(r => r.status === "Completed").length;
  const inProgress = data.filter(r => r.status === "In Progress").length;
  const avg        = data.length
    ? Math.round(data.reduce((s, r) => s + r.progress, 0) / data.length)
    : 0;

  function safe(s: string) {
    return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  // ── First-page header block ───────────────────────────────────────────────
  function pageOneHeader(): string {
    const lines: string[] = [];
    const bannerY = titleTopY - bannerH;

    // Purple banner
    lines.push(`q 0.42 0.24 0.84 rg ${margin} ${bannerY} ${tableW} ${bannerH} re f Q`);
    // Title
    lines.push(`BT /F1 15 Tf 1 1 1 rg ${margin + 8} ${bannerY + 13} Td (My Learning Progress) Tj ET`);
    // Date
    const dateStr = new Date().toLocaleDateString("en-US", { dateStyle: "long" });
    lines.push(`BT /F2 8 Tf 0.76 0.70 0.95 rg ${margin + 8} ${bannerY + 3} Td (${safe(dateStr)}) Tj ET`);

    // Stats bar
    const statsY = bannerY - statsH;
    lines.push(`q 0.95 0.93 0.99 rg ${margin} ${statsY} ${tableW} ${statsH} re f Q`);
    const stats = [
      `Total: ${data.length}`,
      `Completed: ${completed}`,
      `In Progress: ${inProgress}`,
      `Avg Progress: ${avg}%`,
    ];
    const statW = tableW / stats.length;
    stats.forEach((s, i) => {
      lines.push(`BT /F1 7.5 Tf 0.28 0.06 0.42 rg ${margin + 6 + i * statW} ${statsY + 6} Td (${safe(s)}) Tj ET`);
    });

    return lines.join("\n");
  }

  // ── Table header row ──────────────────────────────────────────────────────
  function tableHeader(y: number): string {
    const lines: string[] = [];
    lines.push(`q 0.27 0.15 0.55 rg ${margin} ${y} ${tableW} ${headerH} re f Q`);
    let x = margin;
    cols.forEach(({ label, w }) => {
      lines.push(`BT /F1 8 Tf 1 1 1 rg ${x + 5} ${y + 7} Td (${safe(label)}) Tj ET`);
      x += w;
    });
    return lines.join("\n");
  }

  // ── Data row ──────────────────────────────────────────────────────────────
  function dataRow(r: ProgressRecord, ri: number, y: number): string {
    const lines: string[] = [];

    // Zebra
    if (ri % 2 === 0) {
      lines.push(`q 0.97 0.96 0.99 rg ${margin} ${y} ${tableW} ${rowH} re f Q`);
    }
    // Bottom border
    lines.push(`q 0.88 0.86 0.93 rg ${margin} ${y} ${tableW} 0.4 re f Q`);

    const cells = [
      r.course.slice(0, 42),
      `${r.progress}%`,
      r.status,
      r.started   ?? "\u2014",
      r.completed ?? "\u2014",
    ];

    let x = margin;
    cols.forEach(({ w }, ci) => {
      const txt  = safe(cells[ci]);
      const textY = y + 5;

      if (ci === 1) {
        // Progress — purple bold
        lines.push(`BT /F1 8 Tf 0.42 0.24 0.84 rg ${x + 5} ${textY} Td (${txt}) Tj ET`);
      } else if (ci === 2) {
        // Status pill
        const bgR = r.status === "Completed"   ? [0.82, 0.97, 0.89] :
                    r.status === "In Progress"  ? [0.93, 0.91, 0.99] :
                                                  [0.94, 0.94, 0.95];
        const fgR = r.status === "Completed"   ? [0.04, 0.37, 0.25] :
                    r.status === "In Progress"  ? [0.30, 0.11, 0.60] :
                                                  [0.30, 0.30, 0.35];
        lines.push(`q ${bgR.join(" ")} rg ${x + 4} ${y + 3} ${w - 8} 12 re f Q`);
        lines.push(`BT /F1 7 Tf ${fgR.join(" ")} rg ${x + 7} ${textY} Td (${txt}) Tj ET`);
      } else {
        lines.push(`BT /F2 7.5 Tf 0.10 0.06 0.23 rg ${x + 5} ${textY} Td (${txt}) Tj ET`);
      }
      x += w;
    });

    return lines.join("\n");
  }

  // ── Paginate ──────────────────────────────────────────────────────────────
  const pageStreams: string[] = [];
  let   ri = 0;

  while (ri < data.length || pageStreams.length === 0) {
    const isFirst  = pageStreams.length === 0;
    const lines: string[] = [];

    let tableTopY: number;
    if (isFirst) {
      lines.push(pageOneHeader());
      tableTopY = titleTopY - bannerH - statsH - 10;
    } else {
      tableTopY = pageH - margin - 10;
    }

    lines.push(tableHeader(tableTopY));
    let y = tableTopY - rowH;

    while (y > margin + rowH && ri < data.length) {
      lines.push(dataRow(data[ri], ri, y));
      y -= rowH;
      ri++;
    }

    // Page number footer
    const pageNum = pageStreams.length + 1;
    lines.push(`BT /F2 7 Tf 0.60 0.60 0.60 rg ${pageW / 2 - 15} 18 Td (Page ${pageNum}) Tj ET`);

    pageStreams.push(lines.join("\n"));
    if (ri >= data.length) break;
  }

  // ── PDF object assembly ───────────────────────────────────────────────────
  const enc       = new TextEncoder();
  const objBufs:  Uint8Array[] = [];
  const byteOffs: number[]     = [];
  let   cursor = 0;

  // Header
  const header    = enc.encode("%PDF-1.5\n%\xE2\xE3\xCF\xD3\n");
  cursor         += header.length;

  function makeObj(idx: number, body: string): Uint8Array {
    return enc.encode(`${idx} 0 obj\n${body}\nendobj\n`);
  }

  // Objects: 1=F1 font, 2=F2 font, 3..N+2=streams, N+3..2N+2=pages, 2N+3=pages, 2N+4=catalog
  const n      = pageStreams.length;
  const F1id   = 1;
  const F2id   = 2;
  const streamStart = 3;
  const pageStart   = streamStart + n;
  const pagesId     = pageStart + n;
  const catalogId   = pagesId + 1;

  const allObjs: { idx: number; body: string }[] = [
    { idx: F1id,    body: `<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>` },
    { idx: F2id,    body: `<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>` },
    ...pageStreams.map((stream, i) => ({
      idx:  streamStart + i,
      body: `<</Length ${enc.encode(stream).length}>>\nstream\n${stream}\nendstream`,
    })),
    ...pageStreams.map((_, i) => ({
      idx:  pageStart + i,
      body: `<</Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${streamStart + i} 0 R /Resources <</Font <</F1 ${F1id} 0 R /F2 ${F2id} 0 R>>>>>>`,
    })),
    {
      idx:  pagesId,
      body: `<</Type /Pages /Kids [${Array.from({ length: n }, (_, i) => `${pageStart + i} 0 R`).join(" ")}] /Count ${n}>>`,
    },
    {
      idx:  catalogId,
      body: `<</Type /Catalog /Pages ${pagesId} 0 R>>`,
    },
  ];

  const objBytes: Uint8Array[] = [];
  const xrefOffsets: number[]  = new Array(catalogId + 1).fill(0);

  for (const obj of allObjs) {
    xrefOffsets[obj.idx] = cursor;
    const buf = makeObj(obj.idx, obj.body);
    objBytes.push(buf);
    cursor += buf.length;
  }

  // xref table
  const xrefPos = cursor;
  const xrefLines = [
    "xref",
    `0 ${catalogId + 1}`,
    "0000000000 65535 f \n",
    ...allObjs.map(({ idx }) =>
      `${String(xrefOffsets[idx]).padStart(10, "0")} 00000 n `
    ),
  ];
  const xrefStr = xrefLines.join("\n");

  const trailer = `\ntrailer\n<</Size ${catalogId + 1} /Root ${catalogId} 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;

  // Assemble
  const parts = [header, ...objBytes, enc.encode(xrefStr + trailer)];
  const total = parts.reduce((s, b) => s + b.length, 0);
  const out   = new Uint8Array(total);
  let   pos   = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }

  downloadBlob(
    new Blob([out], { type: "application/pdf" }),
    `progress-${timestamp()}.pdf`
  );
}


// ─── PPTX — loads PptxGenJS from CDN, builds a 6-slide deck ─────────────────
export async function exportPPTX(data: ProgressRecord[]) {
  if (!(window as any).PptxGenJS) {
    await new Promise<void>((resolve, reject) => {
      const s   = document.createElement("script");
      s.src     = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error("Failed to load PptxGenJS"));
      document.head.appendChild(s);
    });
  }

  const pres = new (window as any).PptxGenJS();
  pres.layout = "LAYOUT_16x9"; // 10" × 5.625"
  pres.title  = "My Learning Progress Report";

  const completed  = data.filter(r => r.status === "Completed").length;
  const inProgress = data.filter(r => r.status === "In Progress").length;
  const notStarted = data.length - completed - inProgress;
  const avg        = data.length ? Math.round(data.reduce((s, r) => s + r.progress, 0) / data.length) : 0;
  const dateStr    = new Date().toLocaleDateString("en-US", { dateStyle: "long" });
  const mkSh       = () => ({ type: "outer" as const, color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.12 });

  // ════════════════════════════════════════════════════════
  // SLIDE 1 — TITLE
  // ════════════════════════════════════════════════════════
  const s1 = pres.addSlide();
  s1.background = { color: "2E1065" };

  // Decorative circles
  s1.addShape(pres.shapes.OVAL, { x:6.8, y:-1.2, w:4.5, h:4.5, fill:{ color:"4C1D95", transparency:55 }, line:{ color:"4C1D95", transparency:55 } });
  s1.addShape(pres.shapes.OVAL, { x:7.8, y:-0.4, w:2.8, h:2.8, fill:{ color:"6D28D9", transparency:65 }, line:{ color:"6D28D9", transparency:65 } });

  // Bottom strip
  s1.addShape(pres.shapes.RECTANGLE, { x:0, y:5.125, w:10, h:0.5, fill:{ color:"6D28D9" }, line:{ color:"6D28D9" } });

  // Title
  s1.addText("MY LEARNING",     { x:0.55, y:1.55, w:7, h:0.75, fontSize:52, bold:true, color:"FFFFFF", fontFace:"Calibri", charSpacing:4, margin:0 });
  s1.addText("PROGRESS REPORT", { x:0.55, y:2.28, w:8.5, h:0.75, fontSize:52, bold:true, color:"8B5CF6", fontFace:"Calibri", charSpacing:4, margin:0 });
  s1.addText(`Prepared ${dateStr}`, { x:0.6, y:3.2, w:6, h:0.35, fontSize:14, color:"C4B5FD", italic:true, fontFace:"Calibri", margin:0 });

  // Stat boxes — solid distinct fills, no transparency
  const s1stats = [
    { v: String(data.length), l:"TOTAL COURSES", bg:"4C1D95", acc:"8B5CF6" },
    { v: `${avg}%`,           l:"AVG PROGRESS",  bg:"6D28D9", acc:"A78BFA" },
    { v: String(completed),   l:"COMPLETED",     bg:"065F46", acc:"34D399" },
    { v: String(inProgress),  l:"IN PROGRESS",   bg:"92400E", acc:"FCD34D" },
  ];
  s1stats.forEach(({ v, l, bg, acc }, i) => {
    const x = 0.55 + i * 2.25;
    s1.addShape(pres.shapes.RECTANGLE, { x, y:3.9, w:2.05, h:1.0, fill:{ color:bg }, line:{ color:acc } });
    s1.addShape(pres.shapes.RECTANGLE, { x, y:3.9, w:2.05, h:0.07, fill:{ color:acc }, line:{ color:acc } });
    s1.addText(v, { x, y:3.97, w:2.05, h:0.55, fontSize:28, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
    s1.addText(l, { x, y:4.54, w:2.05, h:0.28, fontSize:7.5, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", charSpacing:1.5, margin:0 });
  });

  // ════════════════════════════════════════════════════════
  // SLIDE 2 — EXECUTIVE SUMMARY
  // ════════════════════════════════════════════════════════
  const s2 = pres.addSlide();
  s2.background = { color: "F8F7FF" };

  // Header bar
  s2.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:1.05, fill:{ color:"4C1D95" }, line:{ color:"4C1D95" } });
  s2.addText("EXECUTIVE SUMMARY", { x:0.55, y:0, w:7.5, h:1.05, fontSize:26, bold:true, color:"FFFFFF", fontFace:"Calibri", valign:"middle", charSpacing:3, margin:0 });
  s2.addText(dateStr, { x:7.6, y:0, w:2.2, h:1.05, fontSize:11, color:"C4B5FD", italic:true, fontFace:"Calibri", align:"right", valign:"middle", margin:0 });

  // KPI cards — full solid colours, no accent line (already distinct)
  const s2cards = [
    { v:String(data.length), l:"TOTAL COURSES",  bg:"4C1D95", acc:"8B5CF6" },
    { v:`${avg}%`,           l:"AVG COMPLETION", bg:"6D28D9", acc:"A78BFA" },
    { v:String(completed),   l:"COMPLETED",      bg:"059669", acc:"34D399" },
    { v:String(inProgress),  l:"IN PROGRESS",    bg:"D97706", acc:"FCD34D" },
  ];
  s2cards.forEach(({ v, l, bg, acc }, i) => {
    const cx = 0.35 + i * 2.35;
    s2.addShape(pres.shapes.RECTANGLE, { x:cx, y:1.2,  w:2.2,  h:1.65, fill:{ color:bg }, shadow:mkSh(), line:{ color:bg } });
    s2.addShape(pres.shapes.RECTANGLE, { x:cx, y:1.2,  w:2.2,  h:0.08, fill:{ color:acc }, line:{ color:acc } });
    s2.addText(v, { x:cx, y:1.28, w:2.2, h:0.85, fontSize:46, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
    s2.addText(l, { x:cx, y:2.15, w:2.2, h:0.28, fontSize:9,  bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", charSpacing:2, margin:0 });
  });

  // Overall progress bar
  s2.addText("OVERALL PROGRESS", { x:0.4, y:3.1, w:4, h:0.3, fontSize:11, bold:true, color:"4C1D95", fontFace:"Calibri", charSpacing:2, margin:0 });
  s2.addShape(pres.shapes.RECTANGLE, { x:0.4, y:3.45, w:9.2, h:0.42, fill:{ color:"EDE9FE" }, line:{ color:"DDD6FE" } });
  const fw2 = 9.2 * (avg / 100);
  if (fw2 > 0) s2.addShape(pres.shapes.RECTANGLE, { x:0.4, y:3.45, w:fw2, h:0.42, fill:{ color:"6D28D9" }, line:{ color:"6D28D9" } });
  s2.addText(`${avg}%`, { x:0.4, y:3.45, w:fw2 > 0.6 ? fw2 : 0.6, h:0.42, fontSize:13, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"right", valign:"middle", margin:6 });

  // Status pills
  const s2pills = [
    { l:"Completed",   c:completed,  p:Math.round(completed/data.length*100),  bg:"D1FAE5", col:"065F46" },
    { l:"In Progress", c:inProgress, p:Math.round(inProgress/data.length*100), bg:"EDE9FE", col:"4C1D95" },
    { l:"Not Started", c:notStarted, p:Math.round(notStarted/data.length*100), bg:"F3F4F6", col:"374151" },
  ];
  s2pills.forEach(({ l, c, p, bg, col }, i) => {
    const px = 0.4 + i * 3.1;
    s2.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:px, y:4.05, w:2.9, h:0.88, fill:{ color:bg }, line:{ color:bg }, rectRadius:0.08 });
    s2.addText([
      { text: String(c), options: { fontSize:22, bold:true,  color:col } },
      { text: `  ${l}`,  options: { fontSize:12, bold:false, color:col } },
    ], { x:px+0.12, y:4.08, w:2.66, h:0.44, valign:"middle", fontFace:"Calibri", margin:0 });
    s2.addText(`${p}% of total`, { x:px+0.12, y:4.54, w:2.66, h:0.3, fontSize:10, color:col, italic:true, fontFace:"Calibri", margin:0 });
  });

  // ════════════════════════════════════════════════════════
  // SLIDE 3 — CHARTS
  // ════════════════════════════════════════════════════════
  const s3 = pres.addSlide();
  s3.background = { color: "2E1065" };
  s3.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:1.0, fill:{ color:"4C1D95" }, line:{ color:"4C1D95" } });
  s3.addText("COMPLETION BREAKDOWN", { x:0.55, y:0, w:8, h:1.0, fontSize:26, bold:true, color:"FFFFFF", fontFace:"Calibri", valign:"middle", charSpacing:3, margin:0 });

  s3.addChart(pres.charts.DOUGHNUT, [{
    name: "Status", labels: ["Completed","In Progress","Not Started"], values: [completed, inProgress, notStarted],
  }], {
    x:0.3, y:1.1, w:4.6, h:3.9,
    chartColors:["059669","6D28D9","94A3B8"], holeSize:60,
    showPercent:true, dataLabelColor:"FFFFFF", dataLabelFontSize:13, dataLabelFontBold:true,
    showLegend:true, legendPos:"b", legendColor:"FFFFFF", legendFontSize:11,
    chartArea:{ fill:{ color:"2E1065" } },
  });

  const topCourses = data.slice(0, 8);
  s3.addChart(pres.charts.BAR, [{
    name:"Progress",
    labels: topCourses.map(c => c.course.length > 22 ? c.course.slice(0,22)+"…" : c.course),
    values: topCourses.map(c => c.progress),
  }], {
    x:5.1, y:1.1, w:4.6, h:3.9, barDir:"bar",
    chartColors: topCourses.map(c => c.status==="Completed" ? "059669" : c.status==="In Progress" ? "6D28D9" : "94A3B8"),
    chartArea:{ fill:{ color:"2E1065" } },
    catAxisLabelColor:"C4B5FD", valAxisLabelColor:"C4B5FD",
    valGridLine:{ color:"3B1D8A", size:0.5 }, catGridLine:{ style:"none" },
    showValue:true, dataLabelColor:"FFFFFF", dataLabelFontSize:9,
    showLegend:false, valAxisMaxVal:100,
  });

  // ════════════════════════════════════════════════════════
  // SLIDE 4 — COURSE DETAIL TABLE
  // ════════════════════════════════════════════════════════
  const s4 = pres.addSlide();
  s4.background = { color: "F8F7FF" };
  s4.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:1.0, fill:{ color:"2E1065" }, line:{ color:"2E1065" } });
  s4.addText("COURSE DETAIL", { x:0.55, y:0, w:7, h:1.0, fontSize:26, bold:true, color:"FFFFFF", fontFace:"Calibri", valign:"middle", charSpacing:3, margin:0 });

  // Column widths: total usable = 9.4" (0.3 left margin)
  const colW4 = [3.6, 1.5, 2.1, 1.2]; // course | progress | status | result  — sum=8.4 + margins
  const hdrY  = 1.05;
  const rowH4 = 0.375;

  // Header row
  s4.addShape(pres.shapes.RECTANGLE, { x:0.3, y:hdrY, w:9.4, h:0.4, fill:{ color:"4C1D95" }, line:{ color:"4C1D95" } });
  ["Course Name","Progress","Status","Result"].reduce((hx, label, i) => {
    s4.addText(label, { x:hx+0.1, y:hdrY, w:colW4[i]-0.1, h:0.4, fontSize:10, bold:true, color:"FFFFFF", fontFace:"Calibri", valign:"middle", margin:0 });
    return hx + colW4[i];
  }, 0.3);

  // Data rows
  let ty4 = hdrY + 0.4;
  data.forEach((r, ri) => {
    const rowBg = ri % 2 === 0 ? "F5F3FF" : "FFFFFF";
    const sBg   = r.status==="Completed" ? "D1FAE5" : r.status==="In Progress" ? "EDE9FE" : "F3F4F6";
    const sCol  = r.status==="Completed" ? "065F46" : r.status==="In Progress" ? "4C1D95" : "6B7280";
    const barFill = r.status==="Completed" ? "059669" : r.status==="In Progress" ? "6D28D9" : "94A3B8";

    s4.addShape(pres.shapes.RECTANGLE, { x:0.3, y:ty4, w:9.4, h:rowH4, fill:{ color:rowBg }, line:{ color:"E5E7EB" } });

    let cx4 = 0.3;

    // Col A: Course name
    s4.addText(r.course, { x:cx4+0.1, y:ty4, w:colW4[0]-0.15, h:rowH4, fontSize:9.5, color:"1E1B4B", fontFace:"Calibri", valign:"middle", margin:0 });
    cx4 += colW4[0];

    // Col B: Progress bar + % label INSIDE bar
    const barX = cx4 + 0.08;
    const barY = ty4 + 0.10;
    const barW = colW4[1] - 0.18;
    const barH = 0.16;
    // Track
    s4.addShape(pres.shapes.RECTANGLE, { x:barX, y:barY, w:barW, h:barH, fill:{ color:"DDD6FE" }, line:{ color:"DDD6FE" } });
    // Fill
    if (r.progress > 0) {
      s4.addShape(pres.shapes.RECTANGLE, { x:barX, y:barY, w:barW*(r.progress/100), h:barH, fill:{ color:barFill }, line:{ color:barFill } });
    }
    // % text CENTERED over bar — same y/h as bar so it sits inside
    s4.addText(`${r.progress}%`, { x:barX, y:barY, w:barW, h:barH, fontSize:7, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
    cx4 += colW4[1];

    // Col C: Status pill — make pill fill full column width minus small padding
    const pillX = cx4 + 0.06;
    const pillY = ty4 + 0.08;
    const pillW = colW4[2] - 0.14;
    const pillH = rowH4 - 0.16;
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:pillX, y:pillY, w:pillW, h:pillH, fill:{ color:sBg }, line:{ color:sBg }, rectRadius:0.04 });
    s4.addText(r.status, { x:pillX, y:pillY, w:pillW, h:pillH, fontSize:8, bold:true, color:sCol, fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
    cx4 += colW4[2];

    // Col D: PASS badge — shape FIRST then text on top
    if (r.status === "Completed") {
      const badgeX = cx4 + 0.08;
      const badgeY = ty4 + 0.08;
      const badgeW = 0.9;
      const badgeH = rowH4 - 0.16;
      s4.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:badgeX, y:badgeY, w:badgeW, h:badgeH, fill:{ color:"D1FAE5" }, line:{ color:"A7F3D0" }, rectRadius:0.04 });
      s4.addText("PASS", { x:badgeX, y:badgeY, w:badgeW, h:badgeH, fontSize:8, bold:true, color:"065F46", fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
    }

    ty4 += rowH4;
  });

  // ════════════════════════════════════════════════════════
  // SLIDE 5 — IN-PROGRESS SPOTLIGHT
  // ════════════════════════════════════════════════════════
  const s5 = pres.addSlide();
  s5.background = { color: "F8F7FF" };

  // Purple sidebar
  s5.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:3.3, h:5.625, fill:{ color:"4C1D95" }, line:{ color:"4C1D95" } });
  s5.addText("IN PROGRESS", { x:0.1, y:1.4,  w:3.1, h:0.45, fontSize:20, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", charSpacing:2, margin:0 });
  s5.addText("COURSES",     { x:0.1, y:1.82, w:3.1, h:0.45, fontSize:20, bold:true, color:"8B5CF6", fontFace:"Calibri", align:"center", charSpacing:2, margin:0 });

  // Stat box on sidebar
  s5.addShape(pres.shapes.RECTANGLE, { x:0.35, y:2.5, w:2.6, h:1.1, fill:{ color:"6D28D9" }, line:{ color:"8B5CF6" } });
  s5.addText(String(inProgress), { x:0.35, y:2.52, w:2.6, h:0.64, fontSize:42, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
  s5.addText("courses active",   { x:0.35, y:3.18, w:2.6, h:0.3,  fontSize:10, color:"C4B5FD", italic:true, fontFace:"Calibri", align:"center", margin:0 });

  // Course cards — 5 cards, each 0.95h with 0.1 gap = 5 × 1.05 = 5.25" — fits in 5.625"
  const inProgCourses = data.filter(r => r.status === "In Progress");
  const cardH5 = 0.95;
  const cardGap = 0.09;
  inProgCourses.forEach((r, i) => {
    const cy = 0.12 + i * (cardH5 + cardGap);
    // Card background
    s5.addShape(pres.shapes.RECTANGLE, { x:3.45, y:cy, w:6.25, h:cardH5, fill:{ color:"FFFFFF" }, shadow:mkSh(), line:{ color:"E5E7EB" } });
    // Left accent
    s5.addShape(pres.shapes.RECTANGLE, { x:3.45, y:cy, w:0.07, h:cardH5, fill:{ color:"6D28D9" }, line:{ color:"6D28D9" } });
    // Course name
    s5.addText(r.course, { x:3.62, y:cy+0.06, w:5.5, h:0.3, fontSize:11, bold:true, color:"1E1B4B", fontFace:"Calibri", margin:0 });
    // Progress bar track
    const barX5 = 3.62;
    const barY5 = cy + 0.43;
    const barW5 = 4.9;
    const barH5 = 0.14;
    s5.addShape(pres.shapes.RECTANGLE, { x:barX5, y:barY5, w:barW5, h:barH5, fill:{ color:"EDE9FE" }, line:{ color:"DDD6FE" } });
    if (r.progress > 0) s5.addShape(pres.shapes.RECTANGLE, { x:barX5, y:barY5, w:barW5*(r.progress/100), h:barH5, fill:{ color:"6D28D9" }, line:{ color:"6D28D9" } });
    // % label
    s5.addText(`${r.progress}% complete`, { x:barX5, y:cy+0.6, w:4.0, h:0.24, fontSize:9, color:"475569", italic:true, fontFace:"Calibri", margin:0 });
    // % badge
    s5.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:8.96, y:cy+0.06, w:0.68, h:0.3, fill:{ color:"EDE9FE" }, line:{ color:"C4B5FD" }, rectRadius:0.05 });
    s5.addText(`${r.progress}%`, { x:8.96, y:cy+0.06, w:0.68, h:0.3, fontSize:9, bold:true, color:"6D28D9", fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
  });

  // ════════════════════════════════════════════════════════
  // SLIDE 6 — CLOSING
  // ════════════════════════════════════════════════════════
  const s6 = pres.addSlide();
  s6.background = { color: "2E1065" };
  s6.addShape(pres.shapes.OVAL, { x:-0.8, y:2.5,  w:3.5, h:3.5, fill:{ color:"4C1D95", transparency:60 }, line:{ color:"4C1D95", transparency:60 } });
  s6.addShape(pres.shapes.OVAL, { x:8.2,  y:-0.8, w:3.0, h:3.0, fill:{ color:"6D28D9", transparency:65 }, line:{ color:"6D28D9", transparency:65 } });

  s6.addText("GREAT PROGRESS!",
    { x:1, y:1.4, w:8, h:0.7, fontSize:44, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", charSpacing:3, margin:0 });
  s6.addText(`You've completed ${completed} out of ${data.length} courses — keep it up!`,
    { x:1.5, y:2.15, w:7, h:0.4, fontSize:15, color:"C4B5FD", italic:true, fontFace:"Calibri", align:"center", margin:0 });

  const s6cards = [
    { title:`${completed} Completed`,  sub:`${Math.round(completed/data.length*100)}% of courses done`, bg:"059669" },
    { title:`${inProgress} Active`,    sub:"Courses currently in progress",                              bg:"6D28D9" },
    { title:`${avg}% Avg Progress`,    sub:"Average across all courses",                                 bg:"D97706" },
  ];
  s6cards.forEach(({ title, sub, bg }, i) => {
    const ax = 0.55 + i * 2.98;
    s6.addShape(pres.shapes.RECTANGLE, { x:ax, y:2.75, w:2.75, h:1.7, fill:{ color:bg }, shadow:mkSh(), line:{ color:bg } });
    s6.addShape(pres.shapes.RECTANGLE, { x:ax, y:2.75, w:2.75, h:0.07, fill:{ color:"FFFFFF", transparency:40 }, line:{ color:"FFFFFF", transparency:40 } });
    s6.addText(title, { x:ax,      y:3.0,  w:2.75, h:0.42, fontSize:18, bold:true, color:"FFFFFF", fontFace:"Calibri", align:"center", margin:0 });
    s6.addText(sub,   { x:ax+0.1,  y:3.45, w:2.55, h:0.42, fontSize:9,  color:"FFFFFF", italic:true, fontFace:"Calibri", align:"center", margin:0 });
  });

  s6.addShape(pres.shapes.RECTANGLE, { x:0, y:5.12, w:10, h:0.5, fill:{ color:"6D28D9" }, line:{ color:"6D28D9" } });
  s6.addText(`Learning Progress Report  ·  ${dateStr}  ·  LMS`,
    { x:0, y:5.12, w:10, h:0.5, fontSize:9, color:"FFFFFF", italic:true, fontFace:"Calibri", align:"center", valign:"middle", margin:0 });

  // ── Write & download ──────────────────────────────────────────────────
  const blob = await pres.write({ outputType: "blob" }) as Blob;
  downloadBlob(blob, `progress-${timestamp()}.pptx`);
}
