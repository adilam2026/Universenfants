import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
