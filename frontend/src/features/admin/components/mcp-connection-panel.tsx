"use client";

import { KeyRound, PlugZap, RotateCcw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/tabs";
import { trpc } from "@/lib/trpc";

const MCP_ENDPOINT = "https://api.pawa.my.id/api/mcp";
const TOKEN_PLACEHOLDER = "porto_mcp_xxxxxxxxxxxxxx";
const BRIDGE_PATH = "/absolute/path/to/PORTO/scripts/mcp-bridge.js";

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function claudeSnippet(token: string) {
  return JSON.stringify(
    {
      mcpServers: {
        "porto-agent": {
          command: "node",
          args: [BRIDGE_PATH],
          env: {
            PORTO_MCP_TOKEN: token,
            PORTO_MCP_ENDPOINT: MCP_ENDPOINT,
          },
        },
      },
    },
    null,
    2,
  );
}

function curlSnippet(token: string) {
  return [
    `curl -X POST ${MCP_ENDPOINT} \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "Authorization: Bearer ${token}" \\`,
    `  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'`,
  ].join("\n");
}

export function McpConnectionPanel() {
  const utils = trpc.useUtils();
  const tokenInfo = trpc.mcp.getMcpTokenInfo.useQuery();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Token mentah hanya ada di memori sesi ini setelah generate — tidak di-fetch ulang.
  const [rawToken, setRawToken] = useState<string | null>(null);

  const generate = trpc.mcp.generateMcpToken.useMutation({
    onSuccess: (data) => {
      setRawToken(data.token);
      setConfirmOpen(false);
      toast.success("Token MCP dibuat — salin sekarang");
      void utils.mcp.getMcpTokenInfo.invalidate();
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast.error(error.message);
    },
  });

  const configured = tokenInfo.data?.configured ?? false;
  const snippetToken = rawToken ?? TOKEN_PLACEHOLDER;

  return (
    <section className="grid gap-3 border border-(--line) bg-(--card) p-4">
      <div className="flex items-center justify-between gap-3 border-b border-(--line) pb-3">
        <div className="flex items-center gap-2">
          <PlugZap className="size-4 text-(--muted-foreground)" />
          <h2 className="text-sm font-medium">MCP Agent Connection</h2>
        </div>
        <span className="font-mono text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
          {configured
            ? `Aktif · ${formatDate(tokenInfo.data?.createdAt ?? null)} · ····${tokenInfo.data?.last4 ?? ""}`
            : "Belum ada token"}
        </span>
      </div>

      <p className="text-sm text-(--muted-foreground)">
        Token statis untuk menghubungkan agent eksternal (Claude Desktop / Cursor)
        ke endpoint MCP PORTO via Bearer authorization, tanpa cookie session.
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setConfirmOpen(true)}
          disabled={generate.isPending}
        >
          {configured ? (
            <RotateCcw className="size-3.5" aria-hidden />
          ) : (
            <KeyRound className="size-3.5" aria-hidden />
          )}
          {configured ? "Generate token baru" : "Generate token"}
        </Button>
      </div>

      {rawToken ? (
        <div className="grid gap-2 border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-amber-600 uppercase">
            <TriangleAlert className="size-3.5" aria-hidden />
            Token hanya ditampilkan sekali
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-none border border-(--line) bg-(--background) px-2 py-1.5 font-mono text-[11px] break-all">
              {rawToken}
            </code>
            <CopyButton
              text={rawToken}
              variant="outline"
              size="icon-sm"
              onCopySuccess={() => toast.success("Token disalin")}
            />
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="claude" className="mt-1 gap-3">
        <TabsList>
          <TabsIndicator />
          <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
          <TabsTrigger value="curl">cURL</TabsTrigger>
        </TabsList>

        <TabsContent value="claude">
          <SnippetBlock
            caption="claude_desktop_config.json"
            code={claudeSnippet(snippetToken)}
          />
        </TabsContent>
        <TabsContent value="curl">
          <SnippetBlock
            caption="Uji koneksi dari terminal"
            code={curlSnippet(snippetToken)}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <KeyRound aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {configured ? "Rotasi token MCP?" : "Generate token MCP?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {configured
                ? "Token lama akan langsung dicabut. Semua client yang memakai token lama harus diperbarui."
                : "Token baru akan dibuat dan ditampilkan satu kali untuk disalin."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generate.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                generate.mutate();
              }}
              disabled={generate.isPending}
            >
              {generate.isPending ? "Membuat..." : "Generate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SnippetBlock({ caption, code }: { caption: string; code: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase">
          {caption}
        </span>
        <CopyButton
          text={code}
          variant="ghost"
          size="icon-xs"
          onCopySuccess={() => toast.success("Disalin")}
        />
      </div>
      <pre className="overflow-x-auto border border-(--line) bg-(--muted)/20 p-3 font-mono text-[11px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
