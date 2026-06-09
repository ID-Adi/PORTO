"use client";

import { Check, Clock, Network, PlugZap, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { McpConnectionPanel } from "@/features/admin/components/mcp-connection-panel";
import { PageHeader } from "@/features/admin/components/page-header";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const domains = [
  { id: "blog", label: "Admin Blog" },
  { id: "tools.image", label: "Tools Image" },
  { id: "canvas", label: "Canvas Frame" },
] as const;

export default function AdminMcpPage() {
  const utils = trpc.useUtils();
  const overview = trpc.mcp.overview.useQuery();
  const requests = trpc.mcp.listRequests.useQuery({ limit: 50 });

  const approve = trpc.mcp.approve.useMutation({
    onSuccess: (data) => {
      if (data.status === "succeeded" || data.status === "approved") {
        toast.success("MCP action approved");
      } else {
        toast.error(data.errorMessage ?? `MCP action moved to ${data.status}`);
      }
      if (
        data.domain === "blog" &&
        data.action === "blog_propose_create" &&
        data.status === "succeeded"
      ) {
        void utils.blog.invalidate();
      }
    },
    onError: (error) => toast.error(`Approval gagal: ${error.message}`),
    onSettled: () => {
      void utils.mcp.overview.invalidate();
      void utils.mcp.listRequests.invalidate();
    },
  });

  const reject = trpc.mcp.reject.useMutation({
    onSuccess: () => {
      toast.success("MCP action rejected");
      void utils.mcp.overview.invalidate();
      void utils.mcp.listRequests.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const catalog = overview.data?.catalog;
  const pending = requests.data?.filter((item) => item.status === "pending");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="MCP"
        description="Approval queue and registry surface for PORTO MCP."
      />

      <McpConnectionPanel />

      <section className="grid gap-3 border border-(--line) bg-(--card) p-4">
        <div className="flex items-center justify-between gap-3 border-b border-(--line) pb-3">
          <div className="flex items-center gap-2">
            <Network className="size-4 text-(--muted-foreground)" />
            <h2 className="text-sm font-medium">Domains</h2>
          </div>
          <Badge variant="outline">
            {overview.data?.counts.pending ?? 0} pending
          </Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {domains.map((domain) => {
            const toolCount =
              catalog?.tools.filter((tool) =>
                tool.name.startsWith(domain.id === "tools.image" ? "image_" : domain.id),
              ).length ?? 0;
            const resourceCount =
              catalog?.resources.filter((resource) =>
                resource.uriTemplate.includes(domain.id.split(".")[0]),
              ).length ?? 0;
            return (
              <div
                key={domain.id}
                className="border border-(--line) px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{domain.label}</p>
                  <StatusDot active />
                </div>
                <p className="mt-2 font-mono text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
                  {toolCount} tools / {resourceCount} resources
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 border border-(--line) bg-(--card) p-4">
        <div className="flex items-center justify-between gap-3 border-b border-(--line) pb-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-(--muted-foreground)" />
            <h2 className="text-sm font-medium">Approval Queue</h2>
          </div>
          <Badge variant="outline">{pending?.length ?? "..." } open</Badge>
        </div>

        {!requests.data ? (
          <p className="text-sm text-(--muted-foreground)">Loading...</p>
        ) : pending && pending.length > 0 ? (
          <div className="overflow-hidden border border-(--line)">
            <div className="grid grid-cols-[120px_1fr_120px_128px] border-b border-(--line) bg-(--muted)/30 px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
              <span>Domain</span>
              <span>Action</span>
              <span>Risk</span>
              <span className="text-right">Decision</span>
            </div>
            {pending.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[120px_1fr_120px_128px] items-center gap-3 border-b border-(--line) px-3 py-3 last:border-b-0"
              >
                <span className="text-xs text-(--muted-foreground)">
                  {item.domain}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.action}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-(--muted-foreground)">
                    {payloadSummary(item.payload)}
                  </p>
                </div>
                <Badge variant="outline">{riskLabel(item.action)}</Badge>
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => approve.mutate({ id: item.id })}
                    aria-label={`Approve ${item.action}`}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => reject.mutate({ id: item.id })}
                    aria-label={`Reject ${item.action}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-(--line) p-6 text-center text-sm text-(--muted-foreground)">
            No pending MCP actions.
          </p>
        )}
      </section>

      <section className="grid gap-3 border border-(--line) bg-(--card) p-4">
        <div className="flex items-center gap-2 border-b border-(--line) pb-3">
          <PlugZap className="size-4 text-(--muted-foreground)" />
          <h2 className="text-sm font-medium">Registry</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <RegistryList
            title="Tools"
            rows={
              catalog?.tools.map((tool) => ({
                key: tool.name,
                primary: tool.name,
                secondary: tool.description,
              })) ?? []
            }
          />
          <RegistryList
            title="Resources"
            rows={
              catalog?.resources.map((resource) => ({
                key: resource.uriTemplate,
                primary: resource.uriTemplate,
                secondary: resource.description,
              })) ?? []
            }
          />
        </div>
      </section>

      <section className="grid gap-3 border border-(--line) bg-(--card) p-4">
        <h2 className="text-sm font-medium">Recent Actions</h2>
        <div className="grid gap-2">
          {(requests.data ?? []).slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[120px_1fr_110px] items-center gap-3 border border-(--line) px-3 py-2"
            >
              <Badge
                variant="outline"
                className={cn(
                  item.status === "failed" && "border-destructive text-destructive",
                )}
              >
                {item.status}
              </Badge>
              <div className="min-w-0">
                <span className="block truncate text-sm">{item.action}</span>
                {item.status === "failed" && item.errorMessage ? (
                  <p className="mt-1 break-words text-xs leading-snug text-destructive">
                    {item.errorMessage}
                  </p>
                ) : null}
              </div>
              <span className="text-right text-xs text-(--muted-foreground)">
                {new Date(item.createdAt).toLocaleDateString("id-ID")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RegistryList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; primary: string; secondary: string }>;
}) {
  return (
    <div className="grid gap-2">
      <p className="font-mono text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
        {title}
      </p>
      <div className="grid gap-2">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.key} className="border border-(--line) px-3 py-2">
              <p className="break-all font-mono text-xs">{row.primary}</p>
              <p className="mt-1 text-xs text-(--muted-foreground)">
                {row.secondary}
              </p>
            </div>
          ))
        ) : (
          <p className="border border-dashed border-(--line) p-4 text-sm text-(--muted-foreground)">
            Loading...
          </p>
        )}
      </div>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "size-2 rounded-full border",
        active
          ? "border-emerald-500 bg-emerald-500"
          : "border-(--muted-foreground)",
      )}
    />
  );
}

function payloadSummary(payload: unknown) {
  if (!payload || typeof payload !== "object") return "No payload";
  const record = payload as Record<string, unknown>;
  return (
    String(record.title ?? record.prompt ?? record.summary ?? record.id ?? "")
      .trim()
      .slice(0, 120) || "Structured payload"
  );
}

function riskLabel(action: string) {
  if (action.includes("publish")) return "publish";
  if (action.includes("generation")) return "external";
  if (action.includes("proposal")) return "proposal";
  return "draft";
}
