#!/usr/bin/env node
// PORTO MCP stdio<->HTTP bridge (zero dependency).
//
// Claude Desktop / Cursor menjalankan MCP server via stdio (JSON-RPC per baris).
// Script ini meneruskan tiap pesan JSON-RPC ke endpoint HTTP PORTO dengan header
// Authorization: Bearer, lalu menulis balasan JSON + newline ke stdout.
//
// Env:
//   PORTO_MCP_TOKEN     (wajib)  token dari /admin/mcp
//   PORTO_MCP_ENDPOINT  (opsional) default https://api.pawa.my.id/api/mcp

const http = require("http");
const https = require("https");

const TOKEN = process.env.PORTO_MCP_TOKEN;
const ENDPOINT =
  process.env.PORTO_MCP_ENDPOINT || "https://api.pawa.my.id/api/mcp";

if (!TOKEN) {
  console.error("Error: PORTO_MCP_TOKEN env variable is required");
  process.exit(1);
}

const client = ENDPOINT.startsWith("https") ? https : http;

function forward(message) {
  return new Promise((resolve) => {
    const payload = Buffer.from(JSON.stringify(message), "utf8");
    const req = client.request(
      ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          Authorization: `Bearer ${TOKEN}`,
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve(body.trim()));
      },
    );
    req.on("error", (err) => {
      // Balas error JSON-RPC agar client tidak menggantung.
      resolve(
        JSON.stringify({
          jsonrpc: "2.0",
          id: message && message.id != null ? message.id : null,
          error: { code: -32000, message: `MCP bridge error: ${err.message}` },
        }),
      );
    });
    req.write(payload);
    req.end();
  });
}

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  // Proses tiap baris JSON-RPC lengkap (newline-delimited).
  while ((index = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue; // baris tak valid — lewati, jangan matikan bridge.
    }
    void forward(message).then((responseText) => {
      if (responseText) process.stdout.write(`${responseText}\n`);
    });
  }
});

process.stdin.on("end", () => process.exit(0));
