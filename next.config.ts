import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {source:"/events/novogodnik26",destination:"/events/novogodnik27",permanent:false},
      {source:"/events/novogodnik26/dish/:id",destination:"/events/novogodnik27/dish/:id",permanent:false},
    ];
  },
};

export default nextConfig;
