"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const { DEFAULT_ENDPOINT } = require("./bridge");
const { multiselect, isInteractive } = require("./prompt");

const SERVER_NAME = "porto-agent";
const NPX_COMMAND = "npx";
const NPX_ARGS = ["-y", "porto-mcp@latest"];

// ── Target clients ──────────────────────────────────────────────────────────
// Setiap target tahu lokasi config-nya dan cara merge entri porto-agent.

const HOME = os.homedir();

const TARGETS = {
  "claude-code": {
    label: "Claude Code",
    file: path.join(HOME, ".claude.json"),
    format: "json-mcpServers",
  },
  codex: {
    label: "Codex",
    file: path.join(HOME, ".codex", "config.toml"),
    format: "toml-codex",
  },
  antigravity: {
    label: "Antigravity CLI",
    file: path.join(HOME, ".gemini", "antigravity-cli", "mcp_config.json"),
    format: "json-mcpServers",
  },
  opencode: {
    label: "OpenCode",
    file: path.join(HOME, ".config", "opencode", "opencode.json"),
    format: "json-opencode",
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, "utf8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw new Error(`gagal membaca ${file}: ${err.message}`);
  }
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function backup(file) {
  if (fs.existsSync(file)) {
    const dest = `${file}.bak-${Date.now()}`;
    fs.copyFileSync(file, dest);
    return dest;
  }
  return null;
}

function writeFileAtomic(file, contents) {
  ensureDir(file);
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, file);
}

// ── Per-format writers ──────────────────────────────────────────────────────

function applyJsonMcpServers(file, env) {
  const config = readJson(file);
  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }
  config.mcpServers[SERVER_NAME] = {
    type: "stdio",
    command: NPX_COMMAND,
    args: [...NPX_ARGS],
    env,
  };
  writeFileAtomic(file, `${JSON.stringify(config, null, 2)}\n`);
}

function applyJsonOpencode(file, env) {
  const config = readJson(file);
  if (!config.$schema) config.$schema = "https://opencode.ai/config.json";
  if (!config.mcp || typeof config.mcp !== "object") config.mcp = {};
  config.mcp[SERVER_NAME] = {
    type: "local",
    enabled: true,
    command: [NPX_COMMAND, ...NPX_ARGS],
    environment: env,
  };
  writeFileAtomic(file, `${JSON.stringify(config, null, 2)}\n`);
}

// Codex memakai TOML. Kita ganti/append blok [mcp_servers.porto-agent] secara
// tekstual agar tidak butuh dependency parser TOML, dan tidak mengganggu key lain.
function applyTomlCodex(file, env) {
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const block = [
    `[mcp_servers.${SERVER_NAME}]`,
    `command = "${esc(NPX_COMMAND)}"`,
    `args = [${NPX_ARGS.map((a) => `"${esc(a)}"`).join(", ")}]`,
    "",
    `[mcp_servers.${SERVER_NAME}.env]`,
    ...Object.entries(env).map(([k, v]) => `${k} = "${esc(v)}"`),
  ].join("\n");

  // Hapus blok porto-agent lama (header + env sub-table) bila ada.
  const lines = text.split("\n");
  const out = [];
  let skipping = false;
  const startsBlock = (line) => {
    const m = line.match(/^\s*\[(mcp_servers\.[^\].]+)(\.[^\]]+)?\]\s*$/);
    return m ? m[1] : null;
  };
  for (const line of lines) {
    const blockName = startsBlock(line);
    if (blockName !== null) {
      skipping = blockName === `mcp_servers.${SERVER_NAME}`;
    } else if (/^\s*\[/.test(line)) {
      // section non-mcp_servers menghentikan skip
      skipping = false;
    }
    if (!skipping) out.push(line);
  }

  let body = out.join("\n").replace(/\n{3,}$/g, "\n\n").replace(/\s*$/, "");
  body = body.length ? `${body}\n\n${block}\n` : `${block}\n`;
  writeFileAtomic(file, body);
}

const WRITERS = {
  "json-mcpServers": applyJsonMcpServers,
  "json-opencode": applyJsonOpencode,
  "toml-codex": applyTomlCodex,
};

// ── Public API ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { token: process.env.PORTO_MCP_TOKEN || "", endpoint: "", clients: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--token" || arg === "-t") opts.token = argv[++i] || "";
    else if (arg.startsWith("--token=")) opts.token = arg.slice(8);
    else if (arg === "--endpoint" || arg === "-e") opts.endpoint = argv[++i] || "";
    else if (arg.startsWith("--endpoint=")) opts.endpoint = arg.slice(11);
    else if (arg === "--client" || arg === "-c") opts.clients.push(argv[++i]);
    else if (arg.startsWith("--client=")) opts.clients.push(arg.slice(9));
  }
  return opts;
}

async function runSetup(argv) {
  const opts = parseArgs(argv);
  if (!opts.token) {
    process.stderr.write(
      "porto-mcp setup: token wajib. Pakai --token porto_mcp_xxx " +
        "(atau set env PORTO_MCP_TOKEN).\n",
    );
    process.exit(1);
  }

  const env = {
    PORTO_MCP_TOKEN: opts.token,
    PORTO_MCP_ENDPOINT: opts.endpoint || DEFAULT_ENDPOINT,
  };

  // Tentukan target client ——————————————————————————————————————————————————
  let requested;

  if (opts.clients.length > 0) {
    // Eksplisit via --client flag → pakai langsung
    requested = opts.clients;
  } else if (isInteractive()) {
    // Terminal interaktif, tampilkan multiselect
    const choices = Object.entries(TARGETS).map(([key, t]) => ({
      label: `${t.label}  \x1b[2m(${path.basename(t.file)})\x1b[0m`,
      value: key,
    }));

    const picked = await multiselect({
      message: "\x1b[1mPilih client yang ingin dikonfigurasi:\x1b[0m",
      choices,
    });

    if (!picked || picked.length === 0) {
      process.stdout.write("Dibatalkan — tidak ada client yang dipilih.\n");
      process.exit(0);
    }
    requested = picked;
  } else {
    // Non-interaktif (piped/CI) → semua client
    requested = Object.keys(TARGETS);
  }

  // Tulis config ————————————————————————————————————————————————————————————
  process.stdout.write("\nporto-mcp setup\n");
  let ok = 0;
  for (const key of requested) {
    const target = TARGETS[key];
    if (!target) {
      process.stdout.write(`  - ${key}: dilewati (client tidak dikenal)\n`);
      continue;
    }
    try {
      const backedUp = backup(target.file);
      WRITERS[target.format](target.file, env);
      const note = backedUp ? ` (backup: ${path.basename(backedUp)})` : "";
      process.stdout.write(`  ✓ ${target.label}: ${target.file}${note}\n`);
      ok += 1;
    } catch (err) {
      process.stdout.write(`  ✗ ${target.label}: ${err.message}\n`);
    }
  }
  process.stdout.write(
    `\nSelesai (${ok}/${requested.length}). Restart client untuk memuat porto-agent.\n`,
  );
}

module.exports = { runSetup, TARGETS };
