"use strict";

// stdio <-> HTTP bridge untuk PORTO MCP. Membaca JSON-RPC newline-delimited dari
// stdin, meneruskan ke endpoint HTTP dengan Authorization: Bearer, lalu menulis
// balasan ke stdout. Zero dependency (hanya modul bawaan Node).

const http = require("http");
const https = require("https");

const DEFAULT_ENDPOINT = "https://api.pawa.my.id/api/mcp";

function runBridge() {
  const token = process.env.PORTO_MCP_TOKEN;
  const endpoint = process.env.PORTO_MCP_ENDPOINT || DEFAULT_ENDPOINT;

  if (!token) {
    process.stderr.write(
      "porto-mcp: PORTO_MCP_TOKEN env variable is required\n",
    );
    process.exit(1);
  }

  const client = endpoint.startsWith("https") ? https : http;

  function forward(message) {
    return new Promise((resolve) => {
      const payload = Buffer.from(JSON.stringify(message), "utf8");
      const req = client.request(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": payload.length,
            Authorization: `Bearer ${token}`,
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
        resolve(
          JSON.stringify({
            jsonrpc: "2.0",
            id: message && message.id != null ? message.id : null,
            error: {
              code: -32000,
              message: `porto-mcp bridge error: ${err.message}`,
            },
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
    while ((index = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      // JSON-RPC notifications (tanpa id) tidak mengharapkan response.
      const isNotification =
        !("id" in message) || message.id === undefined || message.id === null;
      void forward(message).then((responseText) => {
        if (!isNotification && responseText) {
          process.stdout.write(`${responseText}\n`);
        }
      });
    }
  });
  process.stdin.on("end", () => process.exit(0));
}

module.exports = { runBridge, DEFAULT_ENDPOINT };
