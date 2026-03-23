import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "utfs.io", pathname: "/**" },
      { protocol: "https", hostname: "**.uploadthing.com", pathname: "/**" },
      { protocol: "https", hostname: "karamba.com.uy", pathname: "/**" },
      { protocol: "https", hostname: "www.karamba.com.uy", pathname: "/**" },
      { protocol: "http", hostname: "karamba.com.uy", pathname: "/**" },
      { protocol: "http", hostname: "www.karamba.com.uy", pathname: "/**" },
    ],
  },
};

export default nextConfig;
