// FWMS — علامة التحقق (SPEC §4.4.1): رقم مرجعي + QR يتحقق منه الخادم من صحة الكشف
// QR يحمل رابط التحقق العام: {origin}/verify/{ref}?h={hash16} — يفتح صفحة عامة تعرض الأصالة
import QRCode from "qrcode";

export const VERIFY_HASH_PREFIX = 16; // أول 16 حرفًا سداسيًا من SHA-256 في الرابط

/** رابط التحقق العام — الأصل من إعدادات النشر إن ضُبط وإلا من الطلب */
export function verifyUrl(origin: string, refNumber: string, fileHash: string): string {
  const base = (process.env.NEXTAUTH_URL || process.env.APP_PUBLIC_URL || origin).replace(/\/$/, "");
  return `${base}/verify/${encodeURIComponent(refNumber)}?h=${fileHash.slice(0, VERIFY_HASH_PREFIX)}`;
}

/** QR كـ PNG buffer (لتضمينه في PDF/DOCX/PNG) */
export async function qrPngBuffer(url: string, size = 220): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1e3a5f", light: "#ffffff" },
  });
}

/** QR كـ data URL (مباشر لـ @react-pdf Image وSVG) */
export async function qrDataUrl(url: string, size = 220): Promise<string> {
  const buf = await qrPngBuffer(url, size);
  return `data:image/png;base64,${buf.toString("base64")}`;
}
