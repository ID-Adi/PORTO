"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  FileJson,
  History,
  Network,
  PlugZap,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { McpConnectionPanel } from "@/features/admin/components/mcp-connection-panel";
import { PageHeader } from "@/features/admin/components/page-header";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const domains = [
  {
    id: "blog",
    label: "Blog",
    description: "Draft, publish, dan laporan pasar.",
    toolPrefixes: ["blog_", "market_blog_"],
    resourceNeedles: ["blog"],
  },
  {
    id: "tools.image",
    label: "Tools Image",
    description: "Proposal dan eksekusi image generation.",
    toolPrefixes: ["image_"],
    resourceNeedles: ["tools/images"],
  },
  {
    id: "canvas",
    label: "Canvas",
    description: "Proposal patch dan metadata frame.",
    toolPrefixes: ["canvas_"],
    resourceNeedles: ["canvas"],
  },
] as const;

type DomainId = (typeof domains)[number]["id"];

type McpActionItem = {
  id: number;
  domain: DomainId | string;
  action: string;
  status: string;
  payload: unknown;
  result: unknown;
  errorMessage: string | null;
  createdAt: string | Date;
  approvedAt: string | Date | null;
  completedAt: string | Date | null;
};

type RegistryRow = {
  key: string;
  primary: string;
  secondary: string;
};

export default function AdminMcpPage() {
  const utils = trpc.useUtils();
  const [reviewItem, setReviewItem] = useState<McpActionItem | null>(null);
  const [rejectItem, setRejectItem] = useState<McpActionItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [registryQuery, setRegistryQuery] = useState("");

  const overview = trpc.mcp.overview.useQuery();
  const pendingRequests = trpc.mcp.listRequests.useQuery({
    status: "pending",
    limit: 100,
  });
  const recentRequests = trpc.mcp.listRequests.useQuery({ limit: 50 });

  const approve = trpc.mcp.approve.useMutation({
    onSuccess: (data) => {
      if (data.status === "succeeded" || data.status === "approved") {
        toast.success("Action MCP disetujui");
      } else {
        toast.error(data.errorMessage ?? `Action MCP berpindah ke ${data.status}`);
      }
      if (
        data.domain === "blog" &&
        data.action === "blog_propose_create" &&
        data.status === "succeeded"
      ) {
        void utils.blog.invalidate();
      }
      setReviewItem(null);
    },
    onError: (error) => toast.error(`Approval gagal: ${error.message}`),
    onSettled: () => {
      void utils.mcp.overview.invalidate();
      void utils.mcp.listRequests.invalidate();
    },
  });

  const reject = trpc.mcp.reject.useMutation({
    onSuccess: () => {
      toast.success("Action MCP ditolak");
      setRejectItem(null);
      setRejectReason("");
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => {
      void utils.mcp.overview.invalidate();
      void utils.mcp.listRequests.invalidate();
    },
  });

  const catalog = overview.data?.catalog;
  const pending = (pendingRequests.data ?? []) as McpActionItem[];
  const recent = (recentRequests.data ?? []) as McpActionItem[];

  const registry = useMemo(() => {
    const query = registryQuery.trim().toLowerCase();
    const tools =
      catalog?.tools.map((tool) => ({
        key: tool.name,
        primary: tool.name,
        secondary: tool.description,
      })) ?? [];
    const resources =
      catalog?.resources.map((resource) => ({
        key: resource.uriTemplate,
        primary: resource.uriTemplate,
        secondary: resource.description,
      })) ?? [];

    if (!query) return { tools, resources };

    const matches = (row: RegistryRow) =>
      `${row.primary} ${row.secondary}`.toLowerCase().includes(query);
    return {
      tools: tools.filter(matches),
      resources: resources.filter(matches),
    };
  }, [catalog, registryQuery]);

  return (
    <div className="grid gap-5 sm:gap-6">
      <PageHeader
        title="MCP"
        description="Approval console dan registry surface untuk PORTO MCP."
      />

      <ApprovalQueueSection
        pending={pending}
        loading={pendingRequests.isLoading}
        approving={approve.isPending}
        rejecting={reject.isPending}
        onReview={setReviewItem}
        onReject={(item) => {
          setRejectItem(item);
          setRejectReason("");
        }}
      />

      <Collapsible open={connectionOpen} onOpenChange={setConnectionOpen}>
        <section className="grid gap-3 border border-(--line) bg-(--card) p-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2">
              <PlugZap className="size-4 text-(--muted-foreground)" />
              <div>
                <h2 className="text-sm font-medium">MCP Agent Connection</h2>
                <p className="mt-1 text-xs text-(--muted-foreground)">
                  Generate token dan snippet setup agent eksternal.
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-(--muted-foreground) transition-transform",
                connectionOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            <McpConnectionPanel />
          </CollapsibleContent>
        </section>
      </Collapsible>

      <DomainOverviewSection catalog={catalog} overview={overview.data} />

      <Collapsible open={catalogOpen} onOpenChange={setCatalogOpen}>
        <section className="grid gap-3 border border-(--line) bg-(--card) p-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 border-b border-(--line) pb-3 text-left">
            <div className="flex items-center gap-2">
              <FileJson className="size-4 text-(--muted-foreground)" />
              <div>
                <h2 className="text-sm font-medium">MCP Catalog</h2>
                <p className="mt-1 text-xs text-(--muted-foreground)">
                  {catalog?.tools.length ?? 0} tools /{" "}
                  {catalog?.resources.length ?? 0} resources registered.
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-(--muted-foreground) transition-transform",
                catalogOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-(--muted-foreground)" />
              <Input
                value={registryQuery}
                onChange={(event) => setRegistryQuery(event.target.value)}
                placeholder="Cari tool atau resource..."
                className="pl-8"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <RegistryList title="Tools" rows={registry.tools} />
              <RegistryList title="Resources" rows={registry.resources} />
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

      <RecentActionsSection items={recent.slice(0, 8)} />

      <ReviewSheet
        item={reviewItem}
        open={Boolean(reviewItem)}
        approving={approve.isPending}
        onOpenChange={(open) => {
          if (!open) setReviewItem(null);
        }}
        onApprove={(item) => approve.mutate({ id: item.id })}
        onReject={(item) => {
          setRejectItem(item);
          setRejectReason("");
        }}
      />

      <RejectDialog
        item={rejectItem}
        reason={rejectReason}
        rejecting={reject.isPending}
        onReasonChange={setRejectReason}
        onOpenChange={(open) => {
          if (!open && !reject.isPending) {
            setRejectItem(null);
            setRejectReason("");
          }
        }}
        onConfirm={(item) =>
          reject.mutate({
            id: item.id,
            reason: rejectReason.trim() || undefined,
          })
        }
      />
    </div>
  );
}

function ApprovalQueueSection({
  pending,
  loading,
  approving,
  rejecting,
  onReview,
  onReject,
}: {
  pending: McpActionItem[];
  loading: boolean;
  approving: boolean;
  rejecting: boolean;
  onReview: (item: McpActionItem) => void;
  onReject: (item: McpActionItem) => void;
}) {
  return (
    <section className="grid gap-3 border border-(--line) bg-(--card) p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--line) pb-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-(--muted-foreground)" />
          <div>
            <h2 className="text-sm font-medium">Antrean Approval</h2>
            <p className="mt-1 text-xs text-(--muted-foreground)">
              Review payload sebelum approve atau reject.
            </p>
          </div>
        </div>
        <Badge variant="outline">{loading ? "..." : pending.length} open</Badge>
      </div>

      {loading ? (
        <p className="text-sm text-(--muted-foreground)">Memuat antrean...</p>
      ) : pending.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto border border-(--line) md:block">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[120px_minmax(0,1fr)_170px_110px_150px] border-b border-(--line) bg-(--muted)/30 px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
                <span>Domain</span>
                <span>Action</span>
                <span>Diajukan</span>
                <span>Risk</span>
                <span className="text-right">Keputusan</span>
              </div>
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[120px_minmax(0,1fr)_170px_110px_150px] items-center gap-3 border-b border-(--line) px-3 py-3 last:border-b-0"
                >
                  <span className="text-xs text-(--muted-foreground)">
                    {domainLabel(item.domain)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.action}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-(--muted-foreground)">
                      {payloadSummary(item.payload)}
                    </p>
                  </div>
                  <time
                    dateTime={toIsoString(item.createdAt)}
                    className="font-mono text-[11px] leading-5 tracking-[0.08em] text-(--muted-foreground) uppercase"
                    title="Asia/Makassar"
                  >
                    {formatWitaDateTime(item.createdAt)}
                  </time>
                  <Badge variant="outline">{riskLabel(item.action)}</Badge>
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approving || rejecting}
                      onClick={() => onReview(item)}
                    >
                      Review
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={approving || rejecting}
                      onClick={() => onReject(item)}
                      aria-label={`Reject ${item.action}`}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:hidden">
            {pending.map((item) => (
              <div key={item.id} className="grid gap-3 border border-(--line) p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-(--muted-foreground)">
                      {domainLabel(item.domain)}
                    </p>
                    <p className="mt-1 break-words text-sm font-medium">
                      {item.action}
                    </p>
                  </div>
                  <Badge variant="outline">{riskLabel(item.action)}</Badge>
                </div>
                <p className="break-words font-mono text-[11px] leading-relaxed text-(--muted-foreground)">
                  {payloadSummary(item.payload)}
                </p>
                <time
                  dateTime={toIsoString(item.createdAt)}
                  className="font-mono text-[11px] tracking-[0.08em] text-(--muted-foreground) uppercase"
                >
                  {formatWitaDateTime(item.createdAt)}
                </time>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approving || rejecting}
                    onClick={() => onReview(item)}
                  >
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={approving || rejecting}
                    onClick={() => onReject(item)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="border border-dashed border-(--line) p-6 text-center text-sm text-(--muted-foreground)">
          Tidak ada action MCP pending.
        </p>
      )}
    </section>
  );
}

function DomainOverviewSection({
  catalog,
  overview,
}: {
  catalog: {
    tools: Array<{ name: string; description: string }>;
    resources: Array<{ uriTemplate: string; description: string }>;
  } | undefined;
  overview:
    | {
        counts: { pending: number; failed: number; succeeded: number };
        domainStats?: Record<
          string,
          {
            pending: number;
            failed: number;
            succeeded: number;
            lastAction: {
              action: string;
              status: string;
              createdAt: string | Date;
            } | null;
          }
        >;
      }
    | undefined;
}) {
  return (
    <section className="grid gap-3 border border-(--line) bg-(--card) p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--line) pb-3">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-(--muted-foreground)" />
          <div>
            <h2 className="text-sm font-medium">Domain Overview</h2>
            <p className="mt-1 text-xs text-(--muted-foreground)">
              Status antrean dan katalog per domain.
            </p>
          </div>
        </div>
        <Badge variant="outline">{overview?.counts.pending ?? 0} pending</Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {domains.map((domain) => {
          const toolCount =
            catalog?.tools.filter((tool) =>
              domain.toolPrefixes.some((prefix) => tool.name.startsWith(prefix)),
            ).length ?? 0;
          const resourceCount =
            catalog?.resources.filter((resource) =>
              domain.resourceNeedles.some((needle) =>
                resource.uriTemplate.includes(needle),
              ),
            ).length ?? 0;
          const stats = overview?.domainStats?.[domain.id];

          return (
            <div key={domain.id} className="grid gap-3 border border-(--line) p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{domain.label}</p>
                  <p className="mt-1 text-xs leading-snug text-(--muted-foreground)">
                    {domain.description}
                  </p>
                </div>
                <Badge variant="outline">registered</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniMetric label="pending" value={stats?.pending ?? 0} />
                <MiniMetric label="failed" value={stats?.failed ?? 0} />
                <MiniMetric label="done" value={stats?.succeeded ?? 0} />
              </div>
              <p className="font-mono text-[11px] tracking-[0.12em] text-(--muted-foreground) uppercase">
                {toolCount} tools / {resourceCount} resources
              </p>
              <p className="min-h-4 text-xs text-(--muted-foreground)">
                {stats?.lastAction
                  ? `Last: ${stats.lastAction.action} (${stats.lastAction.status})`
                  : "Belum ada action."}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecentActionsSection({ items }: { items: McpActionItem[] }) {
  return (
    <section className="grid gap-3 border border-(--line) bg-(--card) p-3 sm:p-4">
      <div className="flex items-center gap-2 border-b border-(--line) pb-3">
        <History className="size-4 text-(--muted-foreground)" />
        <h2 className="text-sm font-medium">Recent Actions</h2>
      </div>
      <div className="grid gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="grid gap-2 border border-(--line) p-3 sm:grid-cols-[120px_minmax(0,1fr)_120px] sm:items-start"
            >
              <Badge
                variant="outline"
                className={cn(
                  "w-fit",
                  item.status === "failed" && "border-destructive text-destructive",
                )}
              >
                {item.status}
              </Badge>
              <div className="min-w-0">
                <span className="block break-words text-sm">{item.action}</span>
                {item.status === "failed" && item.errorMessage ? (
                  <RecentActionErrorPanel item={item} />
                ) : (
                  <p className="mt-1 text-xs text-(--muted-foreground)">
                    {domainLabel(item.domain)}
                  </p>
                )}
              </div>
              <span className="font-mono text-[11px] text-(--muted-foreground) sm:text-right">
                {formatShortDate(item.createdAt)}
              </span>
            </div>
          ))
        ) : (
          <p className="border border-dashed border-(--line) p-4 text-sm text-(--muted-foreground)">
            Belum ada action.
          </p>
        )}
      </div>
    </section>
  );
}

function RecentActionErrorPanel({ item }: { item: McpActionItem }) {
  const error = parseMcpError(item);
  const rawError = item.errorMessage ?? "Unknown MCP error";

  return (
    <div className="mt-2 border border-destructive/30 bg-destructive/5">
      <div className="flex items-start justify-between gap-2 border-b border-destructive/20 px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-destructive uppercase">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            Error
          </div>
          <p className="mt-1 break-words text-sm font-medium text-(--foreground)">
            {error.title}
          </p>
        </div>
        <CopyButton
          text={rawError}
          variant="ghost"
          size="icon-xs"
          className="shrink-0 border-none text-destructive hover:bg-destructive/10"
          onCopySuccess={() => toast.success("Error disalin")}
          onCopyError={() => toast.error("Gagal menyalin error")}
        />
      </div>
      <div className="grid gap-2 px-3 py-2">
        <p className="break-words text-xs leading-relaxed text-destructive">
          {error.summary}
        </p>
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 border border-destructive/20 bg-(--background)/70 px-2 py-1.5 text-left font-mono text-[10px] tracking-[0.12em] text-(--muted-foreground) uppercase">
            Detail error
            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-x border-b border-destructive/20 bg-(--background)">
            <div className="grid gap-3 p-3">
              <ErrorDetailRow label="Kemungkinan penyebab" value={error.cause} />
              <ErrorDetailRow label="Aksi berikutnya" value={error.nextAction} />
              <div className="grid gap-1">
                <span className="font-mono text-[10px] tracking-[0.12em] text-(--muted-foreground) uppercase">
                  Raw error
                </span>
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words border border-(--line) bg-(--muted)/20 p-2 font-mono text-[11px] leading-relaxed text-(--foreground)">
                  {rawError}
                </pre>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function ErrorDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="font-mono text-[10px] tracking-[0.12em] text-(--muted-foreground) uppercase">
        {label}
      </span>
      <p className="break-words text-xs leading-relaxed text-(--foreground)">
        {value}
      </p>
    </div>
  );
}

function ReviewSheet({
  item,
  open,
  approving,
  onOpenChange,
  onApprove,
  onReject,
}: {
  item: McpActionItem | null;
  open: boolean;
  approving: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (item: McpActionItem) => void;
  onReject: (item: McpActionItem) => void;
}) {
  const payload = getRecord(item?.payload);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-xl"
      >
        {item ? (
          <>
            <SheetHeader className="border-b border-(--line) p-4 pr-12">
              <SheetTitle className="break-words">{item.action}</SheetTitle>
              <SheetDescription>
                {domainLabel(item.domain)} / {riskLabel(item.action)} /{" "}
                {formatWitaDateTime(item.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 p-4">
              <ReviewSummary item={item} payload={payload} />

              <section className="grid gap-2">
                <p className="font-mono text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
                  Audit Metadata
                </p>
                <div className="grid gap-2 border border-(--line) p-3 text-sm">
                  <DetailRow label="ID" value={String(item.id)} />
                  <DetailRow label="Status" value={item.status} />
                  <DetailRow label="Domain" value={item.domain} />
                  <DetailRow label="Created" value={formatWitaDateTime(item.createdAt)} />
                </div>
              </section>

              <Collapsible>
                <section className="border border-(--line)">
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
                    Raw Payload JSON
                    <ChevronDown className="size-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="max-h-[42vh] overflow-auto border-t border-(--line) bg-(--muted)/20 p-3 font-mono text-[11px] leading-relaxed">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </section>
              </Collapsible>
            </div>

            <SheetFooter className="sticky bottom-0 border-t border-(--line) bg-(--background) p-4">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={approving}
                  onClick={() => onReject(item)}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  disabled={approving}
                  onClick={() => onApprove(item)}
                >
                  <Check className="size-4" />
                  {approving ? "Approving..." : "Approve"}
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function RejectDialog({
  item,
  reason,
  rejecting,
  onReasonChange,
  onOpenChange,
  onConfirm,
}: {
  item: McpActionItem | null;
  reason: string;
  rejecting: boolean;
  onReasonChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: McpActionItem) => void;
}) {
  return (
    <AlertDialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default" className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <X aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>Reject action MCP?</AlertDialogTitle>
          <AlertDialogDescription>
            Alasan reject akan disimpan sebagai audit trail untuk action ini.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Contoh: slug duplikat, konten perlu direvisi, atau target canvas salah."
          className="min-h-24"
          maxLength={1000}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={rejecting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={rejecting || !item}
            onClick={(event) => {
              event.preventDefault();
              if (item) onConfirm(item);
            }}
          >
            {rejecting ? "Rejecting..." : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReviewSummary({
  item,
  payload,
}: {
  item: McpActionItem;
  payload: Record<string, unknown> | null;
}) {
  const detailRows = getTypedDetails(item, payload);

  return (
    <section className="grid gap-2">
      <p className="font-mono text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
        Review Summary
      </p>
      <div className="grid gap-2 border border-(--line) p-3">
        <p className="break-words text-base font-medium">
          {payloadSummary(item.payload)}
        </p>
        <div className="grid gap-2 text-sm">
          {detailRows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
      <span className="font-mono text-[11px] tracking-[0.12em] text-(--muted-foreground) uppercase">
        {label}
      </span>
      <span className="min-w-0 break-words text-(--foreground)">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-(--line) px-2 py-2">
      <p className="text-sm font-medium">{value}</p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-(--muted-foreground) uppercase">
        {label}
      </p>
    </div>
  );
}

function RegistryList({ title, rows }: { title: string; rows: RegistryRow[] }) {
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
            Tidak ada item.
          </p>
        )}
      </div>
    </div>
  );
}

function getTypedDetails(
  item: McpActionItem,
  payload: Record<string, unknown> | null,
) {
  if (!payload) {
    return [{ label: "Payload", value: "No payload" }];
  }

  if (item.domain === "blog") {
    const data = getRecord(payload.data);
    return [
      { label: "Title", value: stringValue(payload.title ?? data?.title) },
      { label: "Slug", value: stringValue(payload.slug ?? data?.slug) },
      { label: "Category", value: stringValue(payload.category ?? data?.category) },
      {
        label: "Published",
        value: String(payload.published ?? data?.published ?? false),
      },
    ];
  }

  if (item.domain === "tools.image") {
    const references = Array.isArray(payload.references)
      ? payload.references.length
      : 0;
    return [
      { label: "Prompt", value: stringValue(payload.prompt) },
      { label: "Aspect", value: stringValue(payload.aspectRatio) },
      { label: "References", value: String(references) },
    ];
  }

  if (item.domain === "canvas") {
    return [
      { label: "Workflow", value: stringValue(payload.workflowId) },
      { label: "Frame", value: stringValue(payload.frameId) },
      { label: "Summary", value: stringValue(payload.summary) },
      {
        label: "Changes",
        value: Array.isArray(payload.changes)
          ? `${payload.changes.length} item`
          : "metadata update",
      },
    ];
  }

  return Object.entries(payload)
    .slice(0, 4)
    .map(([label, value]) => ({ label, value: stringValue(value) }));
}

type ParsedMcpError = {
  title: string;
  summary: string;
  cause: string;
  nextAction: string;
};

function parseMcpError(item: McpActionItem): ParsedMcpError {
  const raw = item.errorMessage?.trim() || "Unknown MCP error";
  const lower = raw.toLowerCase();
  const payload = getRecord(item.payload);
  const data = getRecord(payload?.data);
  const slug = stringValue(payload?.slug ?? data?.slug);

  if (
    lower.includes("slug blog") ||
    lower.includes("blog_posts_slug_unique") ||
    lower.includes("duplicate key value") ||
    lower.includes("already exists") ||
    lower.includes("23505")
  ) {
    const summary =
      slug !== "-"
        ? `Slug "${slug}" sudah dipakai oleh blog post lain.`
        : "Slug blog sudah dipakai oleh blog post lain.";
    return {
      title: "Slug blog sudah dipakai",
      summary,
      cause: "Database menolak insert karena field unik, kemungkinan besar slug, sudah ada.",
      nextAction: "Ubah slug draft MCP, lalu ajukan ulang action dari agent.",
    };
  }

  if (lower.includes("payload mcp tidak valid") || lower.includes("zod")) {
    return {
      title: "Payload MCP tidak valid",
      summary: truncateErrorSummary(raw),
      cause: "Data dari agent tidak sesuai kontrak action yang dieksekusi.",
      nextAction: "Buka review payload, perbaiki field yang disebut di error, lalu ajukan ulang.",
    };
  }

  if (lower.includes("blog post target tidak ditemukan")) {
    return {
      title: "Target blog tidak ditemukan",
      summary: truncateErrorSummary(raw),
      cause: "Action update/publish mengarah ke ID blog yang tidak tersedia.",
      nextAction: "Cek ID blog pada payload MCP atau buat ulang proposal dengan target yang benar.",
    };
  }

  if (lower.includes("unsupported mcp action executor")) {
    return {
      title: "Executor MCP belum tersedia",
      summary: truncateErrorSummary(raw),
      cause: "Action sudah masuk queue, tetapi backend belum punya handler untuk domain/action ini.",
      nextAction: "Tambahkan executor backend untuk action tersebut atau ubah agent agar memakai action yang didukung.",
    };
  }

  if (lower.includes("failed query")) {
    const isBlogCreate =
      item.domain === "blog" &&
      item.action === "blog_propose_create" &&
      lower.includes("insert into");
    return {
      title: isBlogCreate ? "Gagal membuat blog post" : "Query database gagal",
      summary: isBlogCreate
        ? "Database menolak pembuatan blog post dari proposal MCP."
        : "Database menolak operasi yang dijalankan oleh action MCP.",
      cause: "Error mentah dari database tersimpan di audit log. Biasanya terkait constraint, payload, atau nilai yang tidak sesuai schema.",
      nextAction: isBlogCreate
        ? "Cek slug, kategori, title, content, dan field wajib lain. Gunakan detail raw bila perlu debugging SQL."
        : "Buka raw error, cek constraint/query yang gagal, lalu ajukan ulang setelah data diperbaiki.",
    };
  }

  return {
    title: "Action MCP gagal",
    summary: truncateErrorSummary(raw),
    cause: "Backend mengembalikan error saat menjalankan action MCP.",
    nextAction: "Buka detail raw error, salin pesan, lalu perbaiki payload atau executor sesuai konteks.",
  };
}

function truncateErrorSummary(value: string) {
  const firstLine = value.split(/\r?\n/)[0]?.trim() ?? value;
  const firstSentence = firstLine.match(/^.{1,180}?(?:[.!?](?:\s|$)|$)/)?.[0];
  const summary = (firstSentence ?? firstLine).trim();
  return summary.length > 180 ? `${summary.slice(0, 177)}...` : summary;
}

function domainLabel(domain: string) {
  return domains.find((item) => item.id === domain)?.label ?? domain;
}

function formatWitaDateTime(value: string | number | Date | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${witaDateTimeFormatter.format(date).replace(",", "")} WITA`;
}

function formatShortDate(value: string | number | Date | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return shortDateFormatter.format(date);
}

function toIsoString(value: string | number | Date | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const witaDateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
});

function payloadSummary(payload: unknown) {
  const record = getRecord(payload);
  if (!record) return "No payload";
  const data = getRecord(record.data);
  return (
    String(
      record.title ??
        data?.title ??
        record.prompt ??
        record.summary ??
        record.id ??
        "Structured payload",
    )
      .trim()
      .slice(0, 160) || "Structured payload"
  );
}

function riskLabel(action: string) {
  if (action.includes("publish")) return "publish";
  if (action.includes("generation")) return "external";
  if (action.includes("proposal")) return "proposal";
  if (action.includes("update") || action.includes("enrich")) return "update";
  return "draft";
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
