/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns", "radix-ui"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
