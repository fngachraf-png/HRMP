// FWMS — محمّل @react-pdf/renderer عبر createRequire الأصلي
// ⚠️ الدرس (جلسة المرحلة 7): الاستيراد الساكن داخل خادم dev يمر بطبقة Turbopack
// للحدائق الخارجية فتُحل '#standard-fonts' (خريطة imports في pdfkit) بسياق فارغ،
// ويُحل fontkit لبنية browser → font.unitsPerEm null. createRequire يعطينا
// دقة node الحقيقية (المثبتة في الاختبارات المستقلة تحت bun).
// ملاحظة تتبع الإنتاج: outputFileTracingIncludes في next.config يضم الحزمة
// لبناء standalone (createRequire ديناميكي لا تراه أداة التتبع).
import { createRequire } from "node:module";
import { join } from "node:path";

type PdfLib = typeof import("@react-pdf/renderer");

let cached: PdfLib | null = null;

export function loadPdfLib(): PdfLib {
  if (cached) return cached;
  // قاعدة الحل: جذر المشروع (dev) أو جذر standalone (إنتاج) — كلاهما يحمل package.json
  const req = createRequire(join(process.cwd(), "package.json"));
  const mod = req("@react-pdf/renderer") as PdfLib & { default?: PdfLib };
  cached = (mod.default && typeof (mod.default as PdfLib).renderToBuffer === "function" ? mod.default : mod) as PdfLib;
  return cached;
}
