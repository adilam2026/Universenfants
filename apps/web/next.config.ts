import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
      ...(process.env.R2_PUBLIC_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.R2_PUBLIC_URL).hostname }]
        : []),
    ],
    // `localhost` resolves to a private IP, blocked by Next's SSRF protection by
    // default. Only the local-disk storage fallback (dev only) serves images from
    // localhost; production always points at a public R2/CDN domain instead.
    ...(process.env.NODE_ENV !== "production" ? { dangerouslyAllowLocalIP: true } : {}),
  },
};

export default withNextIntl(nextConfig);
