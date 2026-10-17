// FWMS — مولّد PDF للتقارير (SPEC §4.4.1: خطوط عربية مضمّنة + RTL + أرقام صفحات + رأس/تذييل)
// @react-pdf/renderer يشكّل العربية عبر fontkit — مثبت بصريًا باللغات الأربع (جلسة المرحلة 7)
// ⚠️ يُحمّل عبر createRequire (load-react-pdf.ts) — لا استيراد ساكن (درس Turbopack)
import React from "react";
import type { Document, Page, Text, View, StyleSheet, renderToBuffer, Image } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import { loadPdfLib } from "./load-react-pdf";
import type { AnyReportData, PayslipReportData, ReportBranding, ReportLanguage, ReportOptions } from "./types";
import { ensurePdfFonts, docFontFamily } from "./fonts";
import { reportDict, tr, docMoney, docHours, monthLabel, isRtl } from "./i18n";
import type { ReportDict } from "./i18n";
import { qrDataUrl } from "./qr";
import { LINE_KIND_MAP } from "./line-kinds";

// ─── سياق التوليد ─────────────────────────────────────────────

export type PdfRenderMeta = {
  refNumber: string; // مرجع المستند RD-…
  contentHash: string; // بصمة المحتوى (تُطبع + في QR)
  verifyUrl: string;
  generatedAt: string; // ISO
  generatedBy: string; // اسم المولِّد
  qrData: string; // data URL محلولة مسبقًا (لا مكوّنات غير متزامنة)
};

type Ctx = {
  lang: ReportLanguage;
  dict: ReportDict;
  rtl: boolean;
  font: string;
  options: ReportOptions;
  meta: PdfRenderMeta;
  branding: ReportBranding; // هوية مالك المنصة (white-label — SPEC §3.2)
};

function P(): ReturnType<typeof loadPdfLib> {
  return loadPdfLib();
}

// ─── تقسيم النصوص مختلطة الأبجديات (اسم عربي في مستند لاتيني والعكس) ──
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function splitScripts(text: string): { text: string; arabic: boolean }[] {
  if (!ARABIC_RE.test(text)) return [{ text, arabic: false }];
  const runs: { text: string; arabic: boolean }[] = [];
  let current = "";
  let currentArabic = ARABIC_RE.test(text[0] ?? "");
  for (const ch of text) {
    const isAr = ARABIC_RE.test(ch);
    if (isAr !== currentArabic) {
      runs.push({ text: current, arabic: currentArabic });
      current = "";
      currentArabic = isAr;
    }
    current += ch;
  }
  if (current) runs.push({ text: current, arabic: currentArabic });
  return runs;
}

/** أبناء Text بمقاطع الأبجديات — العربية بخط Naskh دائمًا مهما كانت لغة المستند */
function richChildren(ctx: Ctx, text: string, baseFont?: string): React.ReactElement[] {
  const runs = splitScripts(text);
  if (runs.length === 1 && !runs[0].arabic) return [];
  return runs.map((r, i) =>
    React.createElement(
      P().Text,
      { key: i, style: { fontFamily: r.arabic ? "Naskh" : baseFont ?? ctx.font } },
      r.text
    )
  );
}

const INK = "#1a2433";
const MUTED = "#5b6b7f";
const LINE = "#d7dee8";
const HEAD_BG = "#eef2f7";
const BRAND = "#1e3a5f";

// ─── أنماط ────────────────────────────────────────────────────

function makeStyles(ctx: Ctx) {
  return P().StyleSheet.create({
    page: {
      fontFamily: ctx.font,
      direction: ctx.rtl ? "rtl" : "ltr",
      fontSize: 10,
      color: INK,
      paddingTop: 30,
      paddingBottom: 44,
      paddingHorizontal: 42,
    },
    company: { fontSize: 13, fontWeight: 700, textAlign: "center", color: BRAND },
    companyMeta: { fontSize: 8, textAlign: "center", color: MUTED, marginTop: 1 },
    docTitle: { fontSize: 14, fontWeight: 700, textAlign: "center", marginTop: 5, marginBottom: 2, color: INK },
    docMeta: { fontSize: 8.5, textAlign: "center", color: MUTED, marginBottom: 5 },
    sectionTitle: { fontSize: 10.5, fontWeight: 700, marginTop: 5, marginBottom: 2, color: BRAND },
    tableHeader: {
      display: "flex",
      flexDirection: ctx.rtl ? "row-reverse" : "row",
      backgroundColor: HEAD_BG,
      borderBottomWidth: 1,
      borderColor: LINE,
      paddingTop: 4,
      paddingBottom: 4,
    },
    tableRow: {
      display: "flex",
      flexDirection: ctx.rtl ? "row-reverse" : "row",
      borderBottomWidth: 0.5,
      borderColor: LINE,
      paddingTop: 2,
      paddingBottom: 2,
    },
    cell: { fontSize: 9 },
    cellHead: { fontSize: 9, fontWeight: 700, color: BRAND },
    netBox: { marginTop: 8, paddingTop: 6, paddingBottom: 6, paddingHorizontal: 12, backgroundColor: BRAND },
    netRow: {
      display: "flex",
      flexDirection: ctx.rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
    },
    netLabel: { fontSize: 12, fontWeight: 700, color: "#ffffff" },
    netValue: { fontSize: 15, fontWeight: 700, color: "#ffffff" },
    kvRow: {
      display: "flex",
      flexDirection: ctx.rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
      borderBottomWidth: 0.5,
      borderColor: LINE,
      paddingTop: 1.5,
      paddingBottom: 1.5,
    },
    kvLabel: { fontSize: 9, color: MUTED },
    kvValue: { fontSize: 9, fontWeight: 700 },
    warn: {
      marginTop: 8,
      paddingTop: 6,
      paddingBottom: 6,
      paddingHorizontal: 10,
      backgroundColor: "#fdf3e7",
      borderLeftWidth: ctx.rtl ? 0 : 2,
      borderRightWidth: ctx.rtl ? 2 : 0,
      borderColor: "#d97706",
    },
    warnText: { fontSize: 8.5, color: "#92400e" },
    okText: { fontSize: 8.5, color: "#065f46" },
    note: { fontSize: 8, color: MUTED, marginTop: 4 },
    footer: {
      position: "absolute",
      bottom: 22,
      left: 42,
      right: 42,
      borderTopWidth: 0.5,
      borderColor: LINE,
      paddingTop: 5,
      display: "flex",
      flexDirection: ctx.rtl ? "row-reverse" : "row",
      justifyContent: "space-between",
      fontSize: 7.5,
      color: MUTED,
    },
    qrWrap: { display: "flex", flexDirection: "row", justifyContent: "center", marginTop: 8 },
    qrSide: { display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 250 },
    qrHash: { fontSize: 6.8, color: MUTED, textAlign: "center", marginTop: 1 },
  });
}

// ─── خلايا الجداول ───────────────────────────────────────────

type CellSpec = {
  text: string;
  flex: number;
  align?: "start" | "end" | "center";
  bold?: boolean;
  font?: string;
};

function cellElements(ctx: Ctx, cells: CellSpec[], head: boolean): React.ReactElement[] {
  return cells.map((c, i) => {
    const textAlign = c.align === "end" ? (ctx.rtl ? "left" : "right") : c.align === "center" ? "center" : ctx.rtl ? "right" : "left";
    const style: Style = {
      flex: c.flex,
      textAlign,
      fontWeight: c.bold || head ? 700 : undefined,
      fontFamily: c.font ?? ctx.font,
    };
    const rich = richChildren(ctx, c.text, c.font ?? ctx.font);
    return React.createElement(
      P().Text,
      { key: i, style: [head ? stylesCache!.cellHead : stylesCache!.cell, style] },
      rich.length > 0 ? rich : c.text
    );
  });
}

let stylesCache: ReturnType<typeof makeStyles> | null = null;

// ─── ترويسة وتذييل وQR ────────────────────────────────────────

function headerEl(
  ctx: Ctx,
  company: { legalName: string; tradeName: string | null; taxId: string | null; cnssNumber: string | null },
  title: string,
  metaLine: string
): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  const ids: string[] = [];
  if (company.taxId) ids.push(`${L("reports.doc.ice")}: ${company.taxId}`);
  if (company.cnssNumber) ids.push(`${L("reports.doc.cnssAff")}: ${company.cnssNumber}`);
  return React.createElement(
    P().View,
    null,
    React.createElement(
      P().Text,
      { style: s.company },
      (() => {
        const companyName = company.tradeName || company.legalName;
        const rich = richChildren(ctx, companyName);
        return rich.length > 0 ? rich : companyName;
      })()
    ),
    React.createElement(P().Text, { style: s.companyMeta }, [company.legalName, ...ids].join("  •  ")),
    React.createElement(P().Text, { style: s.docTitle }, title),
    React.createElement(P().Text, { style: s.docMeta }, metaLine)
  );
}

function footerEl(ctx: Ctx): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  // تذييل التقرير = إعداد تخصيص المالك (white-label — SPEC §3.2):
  // footerText المخصص أو الاسم القانوني للمالك — بمقاطع الأبجديات (درس المرحلة 7)
  const brand = ctx.branding.footerText ?? ctx.branding.legalName;
  const label = L("reports.doc.footerOfficial");
  const brandContent = (() => {
    const rich = richChildren(ctx, `${label} — ${brand}`, "NotoSans");
    return rich.length > 0 ? rich : `${label} — ${brand}`;
  })();
  return React.createElement(
    P().View,
    { style: s.footer, fixed: true },
    React.createElement(P().Text, { style: { fontFamily: "NotoSans" } }, `${ctx.meta.refNumber}`),
    React.createElement(
    P().Text,
      {
        render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `${L("reports.doc.page")} ${pageNumber} ${L("reports.doc.of")} ${totalPages}`,
      }
    ),
    React.createElement(P().Text, { style: { fontFamily: "NotoSans" } }, brandContent)
  );
}

function qrCompactEl(ctx: Ctx): React.ReactElement {
  const s = stylesCache!;
  return React.createElement(
    P().View,
    { style: { display: "flex", flexDirection: "column", alignItems: "center", width: 78 } },
    React.createElement(P().Image, { src: ctx.meta.qrData, style: { width: 64, height: 64 } }),
    React.createElement(P().Text, { style: [s.qrHash, { fontFamily: "NotoSans" }] }, ctx.meta.contentHash.slice(0, 12))
  );
}

function qrEl(ctx: Ctx): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  return React.createElement(
    P().View,
    { style: s.qrWrap },
    React.createElement(P().Image, { src: ctx.meta.qrData, style: { width: 74, height: 74 } }),
    React.createElement(
    P().View,
      { style: s.qrSide },
      React.createElement(
    P().Text,
        { style: { fontSize: 8.5, fontWeight: 700, color: INK, textAlign: "center" } },
        L("reports.doc.qrCaption")
      ),
      React.createElement(P().Text, { style: [s.qrHash, { fontFamily: "NotoSans" }] }, ctx.meta.contentHash.slice(0, 32)),
      React.createElement(
    P().Text,
        { style: { fontSize: 7.2, color: MUTED, textAlign: "center", marginTop: 2, fontFamily: "NotoSans" } },
        ctx.meta.verifyUrl.replace(/^https?:\/\//, "")
      )
    )
  );
}

function kvRowEl(ctx: Ctx, label: string, value: string, bold?: boolean): React.ReactElement {
  const s = stylesCache!;
  const richValue = richChildren(ctx, value);
  return React.createElement(
    P().View,
    { style: s.kvRow },
    React.createElement(P().Text, { style: s.kvLabel }, label),
    React.createElement(P().Text, { style: s.kvValue }, richValue.length > 0 ? richValue : value)
  );
}

function sectionTitleEl(ctx: Ctx, text: string): React.ReactElement {
  return React.createElement(P().Text, { style: stylesCache!.sectionTitle }, text);
}

// ─── تسميات ───────────────────────────────────────────────────

function lineKindLabel(ctx: Ctx, kind: string): string {
  const key = LINE_KIND_MAP[kind] ?? "payroll.lineUnknown";
  const val = tr(ctx.dict, key);
  return val === key ? kind : val;
}

function payTypeLabelKey(payType: string): string {
  if (payType === "hourly") return "payroll.payTypeHourly";
  if (payType === "daily") return "payroll.payTypeDaily";
  if (payType === "monthly") return "payroll.payTypeMonthly";
  return "";
}

function dictOr(ctx: Ctx, key: string, fallback: string): string {
  const val = tr(ctx.dict, key);
  return val === key ? fallback : val;
}

// ─── صفحات الأنواع ───────────────────────────────────────────

function payslipPage(ctx: Ctx, data: PayslipReportData): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  const money = (c: number) => docMoney(c, ctx.lang);
  const showEmployer = ctx.options.includeEmployerShare === true;

  const [y, m] = data.periodLabel.split("-");
  const periodLabel = monthLabel(ctx.dict, Number(y), Number(m));

  // حصة المشغّل تُخفى عن الأجير افتراضيًا (SPEC §4.4.1)
  const lines = data.lines.filter((l) => showEmployer || !l.kind.startsWith("employer_"));

  const headerCells: CellSpec[] = [
    { text: L("reports.doc.colItem"), flex: 4 },
    { text: L("reports.doc.colHours"), flex: 1.4, align: "center" },
    { text: L("reports.doc.colRate"), flex: 1.4, align: "center" },
    { text: L("reports.doc.colAmount"), flex: 2.2, align: "end" },
  ];

  const children: (React.ReactElement | null)[] = [
    headerEl(ctx, data.company, L("reports.doc.payslipTitle"), `${L("reports.doc.period")}: ${periodLabel}  •  ${L("reports.doc.ref")}: ${data.refNumber}`),

    // بيانات العامل + الساعات في عمودين متجاورين — القسيمة في صفحة واحدة
    React.createElement(
      P().View,
      { style: { display: "flex", flexDirection: ctx.rtl ? "row-reverse" : "row", gap: 16 } },
      React.createElement(
        P().View,
        { style: { flex: 1 } },
        sectionTitleEl(ctx, L("reports.doc.workerSection")),
        kvRowEl(ctx, L("reports.doc.worker"), data.worker.fullName, true),
        data.worker.cin ? kvRowEl(ctx, L("reports.doc.cin"), data.worker.cin) : null,
        data.worker.cnssNumber ? kvRowEl(ctx, L("reports.doc.cnssNumber"), data.worker.cnssNumber) : null,
        kvRowEl(ctx, L("reports.doc.payType"), dictOr(ctx, payTypeLabelKey(data.worker.payType), data.worker.payType)),
        kvRowEl(ctx, L("reports.doc.dependents"), String(data.worker.dependentsCount))
      ),
      React.createElement(
        P().View,
        { style: { flex: 1 } },
        sectionTitleEl(ctx, L("reports.doc.hoursSection")),
        kvRowEl(ctx, L("reports.doc.workedMinutes"), docHours(data.totals.workedMinutes)),
        data.totals.overtimeMinutes > 0
          ? kvRowEl(ctx, L("reports.doc.overtimeMinutes"), docHours(data.totals.overtimeMinutes))
          : null,
        kvRowEl(ctx, L("reports.doc.workedDays"), String(data.totals.workedDays)),
        data.totals.breakMinutes > 0
          ? kvRowEl(ctx, L("reports.doc.breakMinutes"), docHours(data.totals.breakMinutes))
          : null
      )
    ),

    sectionTitleEl(ctx, L("reports.doc.linesSection")),
    React.createElement(P().View, { style: s.tableHeader }, ...cellElements(ctx, headerCells, true)),
    ...lines.map((l, i) =>
      React.createElement(
    P().View,
        { key: i, style: s.tableRow, wrap: false },
        ...cellElements(ctx, [
          { text: l.label || lineKindLabel(ctx, l.kind), flex: 4 },
          { text: l.minutes !== null ? docHours(l.minutes) : "—", flex: 1.4, align: "center", font: "NotoSans" },
          { text: l.rateBp !== null ? `${(l.rateBp / 10000).toFixed(2)}%` : "—", flex: 1.4, align: "center", font: "NotoSans" },
          { text: money(l.amountCents), flex: 2.2, align: "end", font: "NotoSans" },
        ], false)
      )
    ),

    // الإجماليات في عمودين — تكملة ضغط الصفحة الواحدة
    React.createElement(
      P().View,
      { style: { display: "flex", flexDirection: ctx.rtl ? "row-reverse" : "row", gap: 16 } },
      React.createElement(
        P().View,
        { style: { flex: 1 } },
        sectionTitleEl(ctx, L("reports.doc.totalsSection")),
        kvRowEl(ctx, L("reports.doc.gross"), money(data.totals.grossCents), true),
        kvRowEl(ctx, L("reports.doc.cnss"), money(-data.totals.cnssEmployeeCents)),
        showEmployer
          ? kvRowEl(ctx, L("reports.doc.employerCost"), money(data.totals.employerCostCents))
          : React.createElement(P().Text, { style: s.note }, L("reports.doc.employerShareNote"))
      ),
      React.createElement(
        P().View,
        { style: { flex: 1, paddingTop: 16 } },
        kvRowEl(ctx, L("reports.doc.amo"), money(-data.totals.amoEmployeeCents)),
        kvRowEl(ctx, L("reports.doc.ir"), money(-data.totals.irNetCents)),
        showEmployer ? kvRowEl(ctx, L("reports.doc.totalCost"), money(data.totals.totalCostCents), true) : null
      )
    ),

    data.smigBreached
      ? React.createElement(P().View, { style: s.warn }, React.createElement(P().Text, { style: s.warnText }, L("reports.doc.smigWarning")))
      : null,

    React.createElement(
      P().View,
      { style: { display: "flex", flexDirection: ctx.rtl ? "row-reverse" : "row", gap: 10, marginTop: 8, alignItems: "center" } },
      React.createElement(
        P().View,
        { style: [s.netBox, { flex: 1, marginTop: 0 }] },
        React.createElement(
          P().View,
          { style: s.netRow },
          React.createElement(P().Text, { style: s.netLabel }, L("reports.doc.net")),
          React.createElement(P().Text, { style: [s.netValue, { fontFamily: "NotoSans" }] }, money(data.totals.netCents))
        )
      ),
      qrCompactEl(ctx)
    ),

    footerEl(ctx),
  ];

  return React.createElement(P().Page, { size: "A4", style: s.page }, ...children.filter(Boolean));
}

function payrollSummaryPage(ctx: Ctx, data: Extract<AnyReportData, { kind: "payroll_summary" }>): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  const money = (c: number) => docMoney(c, ctx.lang);
  const [y, m] = data.periodLabel.split("-");
  const periodLabel = monthLabel(ctx.dict, Number(y), Number(m));

  const head: CellSpec[] = [
    { text: L("reports.doc.worker"), flex: 3 },
    { text: L("reports.doc.colRef"), flex: 1.9, font: "NotoSans" },
    { text: L("reports.doc.colHours"), flex: 1.2, align: "center", font: "NotoSans" },
    { text: L("reports.doc.gross"), flex: 1.8, align: "end", font: "NotoSans" },
    { text: "CNSS", flex: 1.5, align: "end", font: "NotoSans" },
    { text: "AMO", flex: 1.4, align: "end", font: "NotoSans" },
    { text: "IR", flex: 1.4, align: "end", font: "NotoSans" },
    { text: L("reports.doc.net"), flex: 1.8, align: "end", font: "NotoSans" },
  ];

  const children: (React.ReactElement | null)[] = [
    headerEl(
      ctx,
      data.company,
      L("reports.doc.summaryTitle"),
      `${L("reports.doc.period")}: ${periodLabel}  •  ${L("reports.doc.workersCount")}: ${data.workersCount}`
    ),

    sectionTitleEl(ctx, L("reports.doc.totalsSection")),
    kvRowEl(ctx, L("reports.doc.workersCount"), String(data.workersCount)),
    kvRowEl(ctx, L("reports.doc.workedMinutes"), docHours(data.totals.workedMinutes)),
    data.totals.overtimeMinutes > 0
      ? kvRowEl(ctx, L("reports.doc.overtimeMinutes"), docHours(data.totals.overtimeMinutes))
      : null,
    kvRowEl(ctx, L("reports.doc.gross"), money(data.totals.grossCents), true),
    kvRowEl(ctx, L("reports.doc.cnss"), money(-data.totals.cnssEmployeeCents)),
    kvRowEl(ctx, L("reports.doc.amo"), money(-data.totals.amoEmployeeCents)),
    kvRowEl(ctx, L("reports.doc.ir"), money(-data.totals.irNetCents)),
    kvRowEl(ctx, L("reports.doc.employerCost"), money(data.totals.employerCostCents)),
    kvRowEl(ctx, L("reports.doc.totalCost"), money(data.totals.totalCostCents), true),

    sectionTitleEl(ctx, L("reports.doc.workersSection")),
    React.createElement(P().View, { style: s.tableHeader }, ...cellElements(ctx, head, true)),
    ...data.rows.map((r, i) =>
      React.createElement(
    P().View,
        { key: i, style: s.tableRow, wrap: false },
        ...cellElements(ctx, [
          { text: r.fullName, flex: 3 },
          { text: r.refNumber, flex: 1.9, font: "NotoSans" },
          { text: docHours(r.workedMinutes), flex: 1.2, align: "center", font: "NotoSans" },
          { text: money(r.grossCents), flex: 1.8, align: "end", font: "NotoSans" },
          { text: money(-r.cnssEmployeeCents), flex: 1.5, align: "end", font: "NotoSans" },
          { text: money(-r.amoEmployeeCents), flex: 1.4, align: "end", font: "NotoSans" },
          { text: money(-r.irNetCents), flex: 1.4, align: "end", font: "NotoSans" },
          { text: money(r.netCents), flex: 1.8, align: "end", bold: true, font: "NotoSans" },
        ], false)
      )
    ),

    qrEl(ctx),
    footerEl(ctx),
  ];

  return React.createElement(P().Page, { size: "A4", style: s.page }, ...children.filter(Boolean));
}

function attendancePage(
  ctx: Ctx,
  data: Extract<AnyReportData, { kind: "attendance_statement" | "hours_statement" }>
): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  const [y, m] = data.rangeLabel.split("-");
  const rangeLabel = monthLabel(ctx.dict, Number(y), Number(m));

  const head: CellSpec[] = [
    { text: L("reports.doc.attendanceColDate"), flex: 2, font: "NotoSans" },
    { text: L("reports.doc.attendanceColIn"), flex: 1.5, align: "center", font: "NotoSans" },
    { text: L("reports.doc.attendanceColOut"), flex: 1.5, align: "center", font: "NotoSans" },
    { text: L("reports.doc.attendanceColMinutes"), flex: 1.5, align: "center", font: "NotoSans" },
    { text: L("reports.doc.attendanceColStatus"), flex: 2 },
  ];

  const title = data.kind === "hours_statement" ? L("reports.doc.hoursTitle") : L("reports.doc.attendanceTitle");

  const children: (React.ReactElement | null)[] = [
    headerEl(
      ctx,
      data.company,
      title,
      `${L("reports.doc.worker")}: ${data.workerName}  •  ${L("reports.doc.period")}: ${rangeLabel}`
    ),

    sectionTitleEl(ctx, L("reports.doc.totalsSection")),
    kvRowEl(ctx, L("reports.doc.attendancePresentDays"), String(data.totals.presentDays)),
    kvRowEl(ctx, L("reports.doc.attendanceTotalMinutes"), docHours(data.totals.totalMinutes)),

    sectionTitleEl(ctx, L("reports.doc.attendanceSection")),
    React.createElement(P().View, { style: s.tableHeader }, ...cellElements(ctx, head, true)),
    ...data.rows.map((r, i) =>
      React.createElement(
    P().View,
        { key: i, style: s.tableRow, wrap: false },
        ...cellElements(ctx, [
          { text: r.localDate, flex: 2, font: "NotoSans" },
          { text: r.inLabel ?? "—", flex: 1.5, align: "center", font: "NotoSans" },
          { text: r.outLabel ?? "—", flex: 1.5, align: "center", font: "NotoSans" },
          { text: docHours(r.minutes), flex: 1.5, align: "center", font: "NotoSans" },
          { text: dictOr(ctx, `reports.doc.attendanceStatus.${r.status}`, r.status), flex: 2 },
        ], false)
      )
    ),
    data.rows.length === 0 ? React.createElement(P().Text, { style: s.note }, L("reports.doc.noRows")) : null,

    qrEl(ctx),
    footerEl(ctx),
  ];

  return React.createElement(P().Page, { size: "A4", style: s.page }, ...children.filter(Boolean));
}

function declarationsSummaryPage(
  ctx: Ctx,
  data: Extract<AnyReportData, { kind: "declarations_summary" }>
): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  const money = (c: number | null) => (c === null ? "—" : docMoney(c, ctx.lang));

  const head: CellSpec[] = [
    { text: L("reports.doc.colAuthority"), flex: 1.2, font: "NotoSans" },
    { text: L("reports.doc.colDeclKind"), flex: 1.9 },
    { text: L("reports.doc.period"), flex: 1.4, font: "NotoSans" },
    { text: L("reports.doc.colDeclStatus"), flex: 1.7 },
    { text: L("reports.doc.gross"), flex: 1.9, align: "end", font: "NotoSans" },
    { text: "IR", flex: 1.5, align: "end", font: "NotoSans" },
    { text: L("reports.doc.net"), flex: 1.9, align: "end", font: "NotoSans" },
  ];

  const children: (React.ReactElement | null)[] = [
    headerEl(ctx, data.company, L("reports.doc.declSummaryTitle"), `${L("reports.doc.period")}: ${data.periodLabel}`),

    sectionTitleEl(ctx, L("reports.doc.declSection")),
    React.createElement(P().View, { style: s.tableHeader }, ...cellElements(ctx, head, true)),
    ...data.rows.map((r, i) =>
      React.createElement(
    P().View,
        { key: i, style: s.tableRow, wrap: false },
        ...cellElements(ctx, [
          { text: r.authority.toUpperCase(), flex: 1.2, font: "NotoSans" },
          { text: dictOr(ctx, `specRegistry.kinds.${r.kind}`, r.kind), flex: 1.9 },
          { text: r.periodKey, flex: 1.4, font: "NotoSans" },
          { text: dictOr(ctx, `declarations.statuses.${r.status}`, r.status), flex: 1.7 },
          { text: money(r.grossCents), flex: 1.9, align: "end", font: "NotoSans" },
          { text: money(r.irNetCents), flex: 1.5, align: "end", font: "NotoSans" },
          { text: money(r.netCents), flex: 1.9, align: "end", font: "NotoSans" },
        ], false)
      )
    ),
    data.rows.length === 0 ? React.createElement(P().Text, { style: s.note }, L("reports.doc.noRows")) : null,

    qrEl(ctx),
    footerEl(ctx),
  ];

  return React.createElement(P().Page, { size: "A4", style: s.page }, ...children.filter(Boolean));
}

function compliancePage(ctx: Ctx, data: Extract<AnyReportData, { kind: "compliance_report" }>): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  const money = (c: number | null) => (c === null ? "—" : docMoney(c, ctx.lang));

  const head: CellSpec[] = [
    { text: L("reports.doc.colField"), flex: 2.6 },
    { text: L("reports.doc.colPayslips"), flex: 2.2, align: "end", font: "NotoSans" },
    { text: L("reports.doc.colDeclaration"), flex: 2.2, align: "end", font: "NotoSans" },
    { text: L("reports.doc.colDiff"), flex: 1.9, align: "end", font: "NotoSans" },
  ];

  const fieldLabel = (f: string) =>
    f === "workers"
      ? L("reports.doc.workersCount")
      : f === "grossCents"
        ? L("reports.doc.gross")
        : f === "cnssEmployeeCents"
          ? L("reports.doc.cnss")
          : f === "amoEmployeeCents"
            ? L("reports.doc.amo")
            : f === "irNetCents"
              ? L("reports.doc.ir")
              : L("reports.doc.net");

  const fieldText = (f: string, v: number) => (f === "workers" ? String(v) : money(v));

  const allMatch = data.diffs.length > 0 && data.diffs.every((d) => d.diffCents === 0);

  const children: (React.ReactElement | null)[] = [
    headerEl(
      ctx,
      data.company,
      L("reports.doc.complianceTitle"),
      `${data.declarationLabel}  •  ${L("reports.doc.colDeclStatus")}: ${dictOr(ctx, `declarations.statuses.${data.status}`, data.status)}`
    ),

    React.createElement(P().Text, { style: s.note }, L("reports.doc.complianceIntro")),

    sectionTitleEl(ctx, L("reports.doc.complianceTable")),
    React.createElement(P().View, { style: s.tableHeader }, ...cellElements(ctx, head, true)),
    ...data.diffs.map((d, i) =>
      React.createElement(
    P().View,
        { key: i, style: s.tableRow, wrap: false },
        ...cellElements(ctx, [
          { text: fieldLabel(d.field), flex: 2.6 },
          { text: fieldText(d.field, d.payslipCents), flex: 2.2, align: "end", font: "NotoSans" },
          {
            text: d.declarationCents !== null ? fieldText(d.field, d.declarationCents) : "—",
            flex: 2.2,
            align: "end",
            font: "NotoSans",
          },
          {
            text: d.field === "workers" ? String(d.diffCents) : money(d.diffCents),
            flex: 1.9,
            align: "end",
            bold: d.diffCents !== 0,
            font: "NotoSans",
          },
        ], false)
      )
    ),
    data.diffs.length === 0
      ? React.createElement(P().Text, { style: s.note }, L("reports.doc.complianceNoFile"))
      : allMatch
        ? React.createElement(P().View, { style: s.warn }, React.createElement(P().Text, { style: s.okText }, L("reports.doc.complianceMatch")))
        : React.createElement(P().View, { style: s.warn }, React.createElement(P().Text, { style: s.warnText }, L("reports.doc.complianceDiff"))),

    data.fileHash
      ? React.createElement(
    P().View,
          { style: { marginTop: 10 } },
          sectionTitleEl(ctx, L("reports.doc.officialFile")),
          kvRowEl(ctx, "SHA-256", data.fileHash),
          data.specVersion !== null
            ? kvRowEl(ctx, L("reports.doc.specVersion"), `v${data.specVersion}`)
            : null
        )
      : null,

    qrEl(ctx),
    footerEl(ctx),
  ];

  return React.createElement(P().Page, { size: "A4", style: s.page }, ...children.filter(Boolean));
}

function platformSummaryPage(ctx: Ctx, data: Extract<AnyReportData, { kind: "platform_summary" }>): React.ReactElement {
  const s = stylesCache!;
  const L = (k: string) => tr(ctx.dict, k);
  const money = (c: number) => docMoney(c, ctx.lang);

  const head: CellSpec[] = [
    { text: L("reports.doc.company"), flex: 3.2 },
    { text: L("reports.doc.workersCount"), flex: 1.4, align: "center", font: "NotoSans" },
    { text: L("reports.doc.periodsCount"), flex: 1.4, align: "center", font: "NotoSans" },
    { text: L("reports.doc.net"), flex: 2, align: "end", font: "NotoSans" },
    { text: L("reports.doc.totalCost"), flex: 2.2, align: "end", font: "NotoSans" },
  ];

  const children: (React.ReactElement | null)[] = [
    headerEl(
      ctx,
      { legalName: data.branding.legalName, tradeName: data.branding.displayName, taxId: null, cnssNumber: null },
      L("reports.doc.platformTitle"),
      `${L("reports.doc.companiesCount")}: ${data.companiesCount}`
    ),

    sectionTitleEl(ctx, L("reports.doc.companiesSection")),
    React.createElement(P().View, { style: s.tableHeader }, ...cellElements(ctx, head, true)),
    ...data.rows.map((r, i) =>
      React.createElement(
    P().View,
        { key: i, style: s.tableRow, wrap: false },
        ...cellElements(ctx, [
          { text: r.legalName, flex: 3.2 },
          { text: String(r.workersCount), flex: 1.4, align: "center", font: "NotoSans" },
          { text: String(r.approvedPeriods), flex: 1.4, align: "center", font: "NotoSans" },
          { text: money(r.netCents), flex: 2, align: "end", font: "NotoSans" },
          { text: money(r.totalCostCents), flex: 2.2, align: "end", font: "NotoSans" },
        ], false)
      )
    ),
    data.rows.length === 0 ? React.createElement(P().Text, { style: s.note }, L("reports.doc.noRows")) : null,

    qrEl(ctx),
    footerEl(ctx),
  ];

  return React.createElement(P().Page, { size: "A4", style: s.page }, ...children.filter(Boolean));
}

// ─── نقطة الدخول ─────────────────────────────────────────────

export async function renderReportPdf(
  data: AnyReportData,
  language: ReportLanguage,
  options: ReportOptions,
  metaInput: Omit<PdfRenderMeta, "qrData">
): Promise<Uint8Array> {
  await ensurePdfFonts();
  const meta: PdfRenderMeta = { ...metaInput, qrData: await qrDataUrl(metaInput.verifyUrl, 200) };
  const ctx: Ctx = {
    lang: language,
    dict: reportDict(language),
    rtl: isRtl(language),
    font: docFontFamily(language),
    options,
    meta,
    branding: data.branding,
  };
  stylesCache = makeStyles(ctx);
  try {
    let page: React.ReactElement;
    switch (data.kind) {
      case "payslip":
        page = payslipPage(ctx, data);
        break;
      case "payroll_summary":
        page = payrollSummaryPage(ctx, data);
        break;
      case "attendance_statement":
      case "hours_statement":
        page = attendancePage(ctx, data);
        break;
      case "declarations_summary":
        page = declarationsSummaryPage(ctx, data);
        break;
      case "compliance_report":
        page = compliancePage(ctx, data);
        break;
      case "platform_summary":
        page = platformSummaryPage(ctx, data);
        break;
      default:
        throw new Error(`pdf_unknown_kind:${(data as { kind: string }).kind}`);
    }
    const doc = React.createElement(P().Document, null, page);
    const buffer = await P().renderToBuffer(doc);
    return new Uint8Array(buffer);
  } finally {
    stylesCache = null;
  }
}
