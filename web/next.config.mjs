// @ts-check
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    unoptimized: true,
    formats: ["image/webp"], // Prefer webp for smaller files
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days cache for optimized images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "webapi.genoun.com",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "http",
        hostname: "webapi.genoun.com",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        hostname: "localhost",
        pathname: "/**",
        search: "",
      },
      {
        hostname: "uifaces.co",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Optimize package imports for faster builds and smaller bundles
  experimental: {
    optimizeCss: true, // Inline critical CSS to reduce render-blocking
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "date-fns",
      "recharts",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "gsap",
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  // Reduce build output verbosity
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default withNextIntl(nextConfig);
