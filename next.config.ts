import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // turbopack: {} tells Next.js 16 that Turbopack is intentional for `next dev`.
  // Production builds use --webpack (see package.json "build" script)
  // so that @serwist/next's webpack plugin can inject the precache manifest.
  turbopack: {},
  devIndicators: false,
};

export default withSerwist(nextConfig);
