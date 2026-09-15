import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    // `products.image_url` es una URL arbitraria que escribe el admin: el host
    // no se conoce de antemano. Se acota el protocolo a https y el resto queda
    // abierto hasta que exista un bucket propio del proyecto.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
