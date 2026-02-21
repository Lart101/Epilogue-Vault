import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mxcagzcvwzosejuhdxpn.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "www.gutenberg.org",
      },
      {
        protocol: "https",
        hostname: "gutendex.com",
      },
    ],
  },


};

export default nextConfig;
