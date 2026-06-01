# porto-mcp

Bridge + one-command setup untuk menghubungkan agent AI (Claude Code, Codex,
Antigravity CLI, OpenCode) ke endpoint MCP PORTO via Bearer token.

## Setup cepat

```bash
npx porto-mcp@latest setup --token porto_mcp_xxxxxxxxxxxxxx
```

Perintah `setup` mendeteksi dan menulis konfigurasi `porto-agent` ke client yang
didukung (membuat backup file yang sudah ada). Restart client setelahnya.

### Opsi

```
--token, -t      Bearer token dari /admin/mcp (wajib)
--endpoint, -e   default https://api.pawa.my.id/api/mcp
--client, -c     batasi ke client tertentu (boleh diulang):
                 claude-code | codex | antigravity | opencode
```

Contoh hanya Codex:

```bash
npx porto-mcp@latest setup -t porto_mcp_xxx -c codex
```

## Mode bridge

Tanpa argumen, `porto-mcp` berjalan sebagai stdio↔HTTP bridge JSON-RPC (inilah
yang dijalankan MCP client). Membutuhkan env `PORTO_MCP_TOKEN`, opsional
`PORTO_MCP_ENDPOINT`.

## Client & lokasi config

| Client          | File                                              | Format            |
| --------------- | ------------------------------------------------- | ----------------- |
| Claude Code     | `~/.claude.json`                                  | `mcpServers`      |
| Codex           | `~/.codex/config.toml`                            | `[mcp_servers.*]` |
| Antigravity CLI | `~/.gemini/antigravity-cli/mcp_config.json`       | `mcpServers`      |
| OpenCode        | `~/.config/opencode/opencode.json`                | `mcp`             |
