import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // حزم خادمية ثقيلة لا تُحزَّم (sharp وحدة أصلية) — react-pdf يُحمَّل عبر createRequire
  serverExternalPackages: ["@react-pdf/renderer", "sharp"],
  // تتبع ملفات standalone: الحزم المحمّلة ديناميكيًا (createRequire/dynamic import)
  // لا تراها أداة التتبع تلقائيًا — تُضمَّن صراحة مع شجراتها
  outputFileTracingIncludes: {
    "/api/reports/**": [
      "./node_modules/@react-pdf/renderer/**",
      "./node_modules/@react-pdf/font/**",
      "./node_modules/@react-pdf/layout/**",
      "./node_modules/@react-pdf/render/**",
      "./node_modules/@react-pdf/pdfkit/**",
      "./node_modules/@react-pdf/image/**",
      "./node_modules/@react-pdf/primitives/**",
      "./node_modules/@react-pdf/reconciler/**",
      "./node_modules/@react-pdf/stylesheet/**",
      "./node_modules/@react-pdf/svg/**",
      "./node_modules/@react-pdf/types/**",
      "./node_modules/@react-pdf/textkit/**",
      "./node_modules/fontkit/**",
      "./node_modules/pdfkit/**",
      "./node_modules/yoga-layout/**",
      "./node_modules/sharp/**",
      "./public/fonts/**",
    ],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
