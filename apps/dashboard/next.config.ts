import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zet de hele server in .next/standalone, zodat de Docker-image geen
  // node_modules hoeft mee te slepen.
  output: "standalone",
  // better-sqlite3 is een native module en mag niet gebundeld worden.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
