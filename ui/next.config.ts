import type { NextConfig } from "next";
import path from "node:path";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Cache-Control", value: "no-store" }
];

const config: NextConfig = {
  poweredByHeader: false,
  // O runner de agentes, o Postgres e o cliente MCP rodam só no servidor e
  // não devem ser empacotados.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk", "pg", "@modelcontextprotocol/sdk", "@huggingface/transformers", "onnxruntime-node", "playwright-core"],
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  async headers() {
    // Arquivos com hash no nome (_next/static) e fontes podem ficar em cache; o resto, nunca.
    const cacheable = securityHeaders.filter((h) => h.key !== "Cache-Control");
    return [
      { source: "/((?!_next/static|fonts/).*)", headers: securityHeaders },
      { source: "/_next/static/:path*", headers: cacheable },
      { source: "/fonts/:path*", headers: [...cacheable, { key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }
    ];
  }
};

export default config;
