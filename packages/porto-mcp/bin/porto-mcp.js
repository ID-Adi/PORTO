#!/usr/bin/env node
"use strict";

// porto-mcp
//   (tanpa argumen)  -> jalan sebagai stdio<->HTTP MCP bridge (dipanggil client)
//   setup [opts]     -> tulis config porto-agent ke Claude Code/Codex/Antigravity/OpenCode
//   help             -> bantuan

const { runBridge } = require("../lib/bridge");
const { runSetup } = require("../lib/setup");

const [command, ...rest] = process.argv.slice(2);

function printHelp() {
  process.stdout.write(
    [
      "porto-mcp — PORTO MCP bridge + setup",
      "",
      "Usage:",
      "  npx porto-mcp@latest setup --token porto_mcp_xxx [--endpoint URL] [--client claude-code|codex|antigravity|opencode]",
      "  porto-mcp            run as stdio<->HTTP bridge (used by MCP clients)",
      "",
      "Env:",
      "  PORTO_MCP_TOKEN      Bearer token dari /admin/mcp (wajib untuk bridge)",
      "  PORTO_MCP_ENDPOINT   default https://api.pawa.my.id/api/mcp",
      "",
    ].join("\n"),
  );
}

if (command === "setup") {
  runSetup(rest).catch((err) => {
    process.stderr.write(`porto-mcp: ${err.message}\n`);
    process.exit(1);
  });
} else if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else if (!command) {
  runBridge();
} else {
  process.stderr.write(`porto-mcp: perintah tidak dikenal "${command}"\n\n`);
  printHelp();
  process.exit(1);
}
