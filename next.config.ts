

import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  typescript: {
    // Ignora os erros de checagem de tipos do TypeScript apenas DURANTE o build
    // Isso evita o overhead do compilador tsc travar a CPU da tua máquina
    ignoreBuildErrors: true,
  },

};

export default nextConfig;