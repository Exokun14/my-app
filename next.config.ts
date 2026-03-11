import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy Sanctum CSRF cookie
      {
        source: "/sanctum/:path*",
        destination: "http://localhost/sanctum/:path*",
      },
      // Proxy Fortify auth routes
      {
        source: "/login",
        destination: "http://localhost/login",
      },
      {
        source: "/logout",
        destination: "http://localhost/logout",
      },
      {
        source: "/register",
        destination: "http://localhost/register",
      },
      // Proxy all API routes
      {
        source: "/api/:path*",
        destination: "http://localhost/api/:path*",
      },
    ];
  },
};

export default nextConfig;
