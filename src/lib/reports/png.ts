// FWMS — مولّد PNG للتقارير (SPEC §4.4.1: «لقطة بدقة مناسبة للهاتف — للقسيمة والملخصات القصيرة فقط»)
// المسار: SVG (نص direction:rtl مع text-anchor=start للحواف اليمنى) → sharp → PNG
// الخطوط من مجلد المشروع عبر FONTCONFIG_FILE (بلا خطوط نظام) — تشكيل العربية مثبت بصريًا
// يدعم الأنواع القصيرة فقط: payslip | platform_summary (البقية pdf/docx حصرًا)
import type { AnyReportData, ReportLanguage, ReportOptions } from "./types";
import { ensureFontconfig } from "./fonts";
import { reportDict, tr, docMoney, docHours, monthLabel } from "./i18n";
import type { ReportDict } from "./i18n";
import { qrPngBuffer } from "./qr";
import { LINE_KIND_MAP } from "./line-kinds";

export type PngRenderMeta = {
  refNumber: string;
  contentHash: string;
  verifyUrl: string;
  generatedAt: string;
  generatedBy: string;
};

type Ctx = {
  lang: ReportLanguage;
  dict: ReportDict;
  rtl: boolean;
  options: ReportOptions;
  meta: PngRenderMeta;
};

const W = 860; // عرض أساس — density 144 يعطي دقة مشاركة جيدة بالهاتف
const BRAND = "#1e3a5f";
const INK = "#1a2433";
const MUTED = "#5b6b7f";
const LINE_C = "#d7dee8";
const HEAD_BG = "#eef2f7";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** سطر عنوان/قيمة بمحاذاة الحافة الصحيحة — rtl: الحافة اليمنى (anchor=start + direction=rtl) */
function line(x: number, y: number, text: string, o?: { size?: number; bold?: boolean; color?: string; align?: "start" | "middle" | "end"; latin?: boolean }): string {
  const font = o?.latin ? "Noto Sans" : "Noto Naskh Arabic";
  const align = o?.align ?? "start";
  // latin: اتجاه ltr ومحاذاة نهاية (يمين الصفحة في مستند rtl)
  const dirAttr = o?.latin ? 'direction="ltr"' : ctxDirection();
  const anchorAttr = o?.latin ? `text-anchor="${align === "start" ? "end" : align}"` : `text-anchor="${align}"`;
  return `<text x="${x}" y="${y}" ${anchorAttr} ${dirAttr} font-family="${font}" font-size="${o?.size ?? 15}" ${o?.bold ? 'font-weight="700"' : ""} fill="${o?.color ?? INK}">${esc(text)}</text>`;
}

let currentRtl = true;
function ctxDirection(): string {
  return currentRtl ? 'direction="rtl"' : 'direction="ltr"';
}

function lineKindLabel(dict: ReportDict, kind: string): string {
  const key = LINE_KIND_MAP[kind] ?? "payroll.lineUnknown";
  const val = tr(dict, key);
  return val === key ? kind : val;
}

function dictOr(dict: ReportDict, key: string, fallback: string): string {
  const val = tr(dict, key);
  return val === key ? fallback : val;
}

// ─── بطاقة القسيمة ───────────────────────────────────────────

function payslipSvg(ctx: Ctx, data: Extract<AnyReportData, { kind: "payslip" }>, qrB64: string): string {
  const L = (k: string) => tr(ctx.dict, k);
  const money = (c: number) => docMoney(c, ctx.lang);
  const showEmployer = ctx.options.includeEmployerShare === true;
  const [y, m] = data.periodLabel.split("-");
  const periodLabel = monthLabel(ctx.dict, Number(y), Number(m));
  const lines = data.lines.filter((l) => showEmployer || !l.kind.startsWith("employer_"));

  const RIGHT = W - 50;
  const LEFT = 50;
  let cursor = 0;
  const body: string[] = [];

  // رأس
  body.push(`<rect x="0" y="0" width="${W}" height="92" fill="${BRAND}"/>`);
  body.push(line(W / 2, 38, L("reports.doc.payslipTitle"), { size: 26, bold: true, color: "#ffffff", align: "middle" }));
  body.push(line(W / 2, 66, data.company.tradeName || data.company.legalName, { size: 14, color: "#c9d6e8", align: "middle" }));

  cursor = 124;
  // العامل والفترة
  body.push(line(RIGHT, cursor, `${L("reports.doc.worker")}: ${data.worker.fullName}`, { size: 16, bold: true }));
  body.push(line(LEFT, cursor, `${L("reports.doc.period")}: ${periodLabel}`, { size: 13, color: MUTED, align: "end", latin: true }));
  cursor += 24;
  const metaBits = [data.worker.cin ? `${L("reports.doc.cin")}: ${data.worker.cin}` : null, data.worker.cnssNumber ? `CNSS: ${data.worker.cnssNumber}` : null].filter(Boolean);
  if (metaBits.length > 0) body.push(line(RIGHT, cursor, metaBits.join("  •  "), { size: 12, color: MUTED }));
  if (metaBits.length > 0) cursor += 20;

  // الساعات
  cursor += 8;
  body.push(line(RIGHT, cursor, `${L("reports.doc.workedMinutes")}: ${docHours(data.totals.workedMinutes)}`, { size: 14 }));
  body.push(line(LEFT, cursor, `${L("reports.doc.workedDays")}: ${data.totals.workedDays}`, { size: 14, color: MUTED, align: "end", latin: true }));
  if (data.totals.overtimeMinutes > 0) {
    cursor += 22;
    body.push(line(RIGHT, cursor, `${L("reports.doc.overtimeMinutes")}: ${docHours(data.totals.overtimeMinutes)}`, { size: 14 }));
  }

  // جدول البنود
  cursor += 26;
  const rowH = 30;
  const tableTop = cursor;
  body.push(`<rect x="${LEFT}" y="${tableTop}" width="${W - 100}" height="${rowH}" fill="${HEAD_BG}"/>`);
  const colItem = ctx.rtl ? W - 60 : LEFT + 10; // عمود البند: يمين في rtl
  const colAmountX = ctx.rtl ? LEFT + 10 : W - 60;
  const headAnchorItem = ctx.rtl ? "start" : "start";
  body.push(`<text x="${colItem}" y="${tableTop + 20}" text-anchor="${headAnchorItem}" ${ctxDirection()} font-family="Noto Naskh Arabic" font-size="13" font-weight="700" fill="${BRAND}">${esc(L("reports.doc.colItem"))}</text>`);
  body.push(`<text x="${colAmountX}" y="${tableTop + 20}" text-anchor="${ctx.rtl ? "start" : "end"}" direction="ltr" font-family="Noto Sans" font-size="13" font-weight="700" fill="${BRAND}">${esc(L("reports.doc.colAmount"))}</text>`);
  cursor += rowH;

  const maxLines = 12;
  for (const l of lines.slice(0, maxLines)) {
    body.push(`<line x1="${LEFT}" y1="${cursor}" x2="${W - LEFT}" y2="${cursor}" stroke="${LINE_C}" stroke-width="1"/>`);
    body.push(`<text x="${colItem}" y="${cursor + 20}" text-anchor="start" ${ctxDirection()} font-family="Noto Naskh Arabic" font-size="13" fill="${INK}">${esc(l.label || lineKindLabel(ctx.dict, l.kind))}</text>`);
    body.push(`<text x="${colAmountX}" y="${cursor + 20}" text-anchor="${ctx.rtl ? "start" : "end"}" direction="ltr" font-family="Noto Sans" font-size="13" fill="${l.amountCents < 0 ? "#b91c1c" : INK}">${esc(money(l.amountCents))}</text>`);
    cursor += rowH;
  }
  if (lines.length > maxLines) {
    body.push(`<text x="${colItem}" y="${cursor + 20}" text-anchor="start" ${ctxDirection()} font-family="Noto Naskh Arabic" font-size="12" fill="${MUTED}">${esc(L("reports.doc.moreLines").replace("{n}", String(lines.length - maxLines)))}</text>`);
    cursor += rowH;
  }

  // الإجماليات
  cursor += 12;
  const totals: [string, string][] = [
    [L("reports.doc.gross"), money(data.totals.grossCents)],
    [L("reports.doc.cnss"), money(-data.totals.cnssEmployeeCents)],
    [L("reports.doc.amo"), money(-data.totals.amoEmployeeCents)],
    [L("reports.doc.ir"), money(-data.totals.irNetCents)],
  ];
  if (showEmployer) totals.push([L("reports.doc.totalCost"), money(data.totals.totalCostCents)]);
  for (const [label, value] of totals) {
    body.push(`<text x="${colItem}" y="${cursor}" text-anchor="start" ${ctxDirection()} font-family="Noto Naskh Arabic" font-size="13" fill="${MUTED}">${esc(label)}</text>`);
    body.push(`<text x="${colAmountX}" y="${cursor}" text-anchor="${ctx.rtl ? "start" : "end"}" direction="ltr" font-family="Noto Sans" font-size="13" fill="${INK}">${esc(value)}</text>`);
    cursor += 24;
  }

  // الصافي
  cursor += 6;
  body.push(`<rect x="${LEFT}" y="${cursor}" width="${W - 100}" height="52" fill="${BRAND}"/>`);
  body.push(`<text x="${colItem}" y="${cursor + 33}" text-anchor="start" ${ctxDirection()} font-family="Noto Naskh Arabic" font-size="18" font-weight="700" fill="#ffffff">${esc(L("reports.doc.net"))}</text>`);
  body.push(`<text x="${colAmountX}" y="${cursor + 33}" text-anchor="${ctx.rtl ? "start" : "end"}" direction="ltr" font-family="Noto Sans" font-size="20" font-weight="700" fill="#ffffff">${esc(money(data.totals.netCents))}</text>`);
  cursor += 78;

  const height = Math.max(cursor + 150, 640);

  // QR + المرجع
  const qrX = ctx.rtl ? LEFT + 6 : W - LEFT - 96;
  body.push(`<image href="data:image/png;base64,${qrB64}" x="${qrX}" y="${height - 130}" width="92" height="92"/>`);
  const refX = ctx.rtl ? W - LEFT - 6 : LEFT + 6;
  const refAnchor = ctx.rtl ? "start" : "start";
  body.push(`<text x="${refX}" y="${height - 92}" text-anchor="${refAnchor}" direction="ltr" font-family="Noto Sans" font-size="12" fill="${INK}">${esc(data.refNumber)}</text>`);
  body.push(`<text x="${refX}" y="${height - 72}" text-anchor="${refAnchor}" direction="ltr" font-family="Noto Sans" font-size="10" fill="${MUTED}">${esc(ctx.meta.contentHash.slice(0, 24))}</text>`);
  body.push(`<text x="${refX}" y="${height - 54}" text-anchor="${refAnchor}" ${ctxDirection()} font-family="Noto Naskh Arabic" font-size="10" fill="${MUTED}">${esc(L("reports.doc.qrCaption"))}</text>`);
  body.push(`<text x="${W / 2}" y="${height - 20}" text-anchor="middle" direction="ltr" font-family="Noto Sans" font-size="9" fill="${MUTED}">FWMS — ${esc(ctx.meta.refNumber)}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
  <rect width="${W}" height="${height}" fill="#ffffff"/>
  ${body.join("\n")}
</svg>`;
}

// ─── بطاقة ملخص المنصة ────────────────────────────────────────

function platformSvg(ctx: Ctx, data: Extract<AnyReportData, { kind: "platform_summary" }>, qrB64: string): string {
  const L = (k: string) => tr(ctx.dict, k);
  const money = (c: number) => docMoney(c, ctx.lang);

  const RIGHT = W - 50;
  const LEFT = 50;
  const body: string[] = [];

  body.push(`<rect x="0" y="0" width="${W}" height="92" fill="${BRAND}"/>`);
  body.push(line(W / 2, 38, L("reports.doc.platformTitle"), { size: 24, bold: true, color: "#ffffff", align: "middle" }));
  body.push(line(W / 2, 66, `${L("reports.doc.companiesCount")}: ${data.companiesCount}`, { size: 13, color: "#c9d6e8", align: "middle" }));

  let cursor = 130;
  const rowH = 34;
  const colName = ctx.rtl ? W - 60 : LEFT + 10;
  const colNet = ctx.rtl ? LEFT + 10 : W - 60;

  body.push(`<rect x="${LEFT}" y="${cursor - 22}" width="${W - 100}" height="${rowH}" fill="${HEAD_BG}"/>`);
  body.push(`<text x="${colName}" y="${cursor}" text-anchor="start" ${ctxDirection()} font-family="Noto Naskh Arabic" font-size="13" font-weight="700" fill="${BRAND}">${esc(L("reports.doc.company"))}</text>`);
  body.push(`<text x="${colNet}" y="${cursor}" text-anchor="${ctx.rtl ? "start" : "end"}" direction="ltr" font-family="Noto Sans" font-size="13" font-weight="700" fill="${BRAND}">${esc(L("reports.doc.net"))}</text>`);
  cursor += rowH;

  for (const r of data.rows.slice(0, 8)) {
    body.push(`<line x1="${LEFT}" y1="${cursor - 24}" x2="${W - LEFT}" y2="${cursor - 24}" stroke="${LINE_C}" stroke-width="1"/>`);
    body.push(`<text x="${colName}" y="${cursor}" text-anchor="start" ${ctxDirection()} font-family="Noto Naskh Arabic" font-size="13" fill="${INK}">${esc(r.legalName)}</text>`);
    body.push(`<text x="${colNet}" y="${cursor}" text-anchor="${ctx.rtl ? "start" : "end"}" direction="ltr" font-family="Noto Sans" font-size="13" fill="${INK}">${esc(money(r.netCents))}</text>`);
    cursor += rowH;
  }

  const height = Math.max(cursor + 60, 420);
  const qrX = ctx.rtl ? LEFT + 6 : W - LEFT - 80;
  body.push(`<image href="data:image/png;base64,${qrB64}" x="${qrX}" y="${height - 100}" width="80" height="80"/>`);
  body.push(`<text x="${W / 2}" y="${height - 20}" text-anchor="middle" direction="ltr" font-family="Noto Sans" font-size="9" fill="${MUTED}">FWMS — ${esc(ctx.meta.refNumber)}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
  <rect width="${W}" height="${height}" fill="#ffffff"/>
  ${body.join("\n")}
</svg>`;
}

// ─── نقطة الدخول ─────────────────────────────────────────────

export async function renderReportPng(
  data: AnyReportData,
  language: ReportLanguage,
  options: ReportOptions,
  meta: PngRenderMeta
): Promise<Uint8Array> {
  if (data.kind !== "payslip" && data.kind !== "platform_summary") {
    throw new Error(`png_not_supported:${data.kind}`);
  }
  const ok = await ensureFontconfig();
  if (!ok) throw new Error("png_fontconfig_unavailable");
  const { default: sharp } = await import("sharp");

  currentRtl = language === "ar";
  const ctx: Ctx = { lang: language, dict: reportDict(language), rtl: currentRtl, options, meta };
  const qrBuf = await qrPngBuffer(meta.verifyUrl, 240);
  const qrB64 = qrBuf.toString("base64");

  const svg =
    data.kind === "payslip"
      ? payslipSvg(ctx, data as Extract<AnyReportData, { kind: "payslip" }>, qrB64)
      : platformSvg(ctx, data as Extract<AnyReportData, { kind: "platform_summary" }>, qrB64);

  const png = await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
  return new Uint8Array(png);
}
