"use client";

import { Check, Eye, EyeOff, KeyRound, Plug, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/admin/components/form-field";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type ProviderKey = "gemini" | "vertex" | "openrouter" | "local" | "9router";

type ProviderStatus = {
  hasApiKey?: boolean;
  last4?: string | null;
  projectId?: string | null;
  location?: string | null;
  httpRequestEnabled?: boolean | null;
  scopes?: string | null;
  allowedHttpDomains?: string | null;
  // Provider local (OpenAI-compatible via Tailscale).
  configured?: boolean | null;
  baseUrl?: string | null;
  // Flag enable/disable global per provider.
  enabled?: boolean;
};

const NINE_ROUTER_DEFAULT_BASE_URL = "http://localhost:20128/v1";

type ApiKeyFieldProps = {
  provider: ProviderKey;
  label: string;
  hint?: string;
  status: ProviderStatus;
};

export function ApiKeyField({ provider, label, hint, status }: ApiKeyFieldProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState(false);
  // Field per provider.
  const [apiKey, setApiKey] = useState("");
  const [serviceAccount, setServiceAccount] = useState("");
  const [projectId, setProjectId] = useState(status.projectId ?? "");
  const [location, setLocation] = useState(status.location ?? "us-central1");
  const [httpRequestEnabled, setHttpRequestEnabled] = useState(
    status.httpRequestEnabled ?? true,
  );
  const [scopes, setScopes] = useState(
    status.scopes ?? "https://www.googleapis.com/auth/cloud-platform",
  );
  const [allowedHttpDomains, setAllowedHttpDomains] = useState(
    status.allowedHttpDomains ?? "All",
  );
  const [baseUrl, setBaseUrl] = useState(status.baseUrl ?? "");
  const [testResult, setTestResult] = useState<
    { ok: boolean; message?: string } | null
  >(null);

  const isVertex = provider === "vertex";
  const isLocal = provider === "local";
  const isNineRouter = provider === "9router";

  // Seed project/location dari status saat modal DIBUKA (status bisa baru tiba
  // setelah mount; seeding di handler menghindari clobber saat user mengetik).
  function openModal() {
    if (isVertex) {
      setProjectId(status.projectId ?? "");
      setLocation(status.location ?? "us-central1");
      setHttpRequestEnabled(status.httpRequestEnabled ?? true);
      setScopes(
        status.scopes ?? "https://www.googleapis.com/auth/cloud-platform",
      );
      setAllowedHttpDomains(status.allowedHttpDomains ?? "All");
    }
    if (isLocal) {
      setBaseUrl(status.baseUrl ?? "");
    }
    if (isNineRouter) {
      setBaseUrl(status.baseUrl ?? NINE_ROUTER_DEFAULT_BASE_URL);
    }
    setOpen(true);
  }

  const save = trpc.aiSettings.updateProviderKey.useMutation({
    onSuccess: () => {
      toast.success(`${label} disimpan`);
      utils.aiSettings.getTtsConfig.invalidate();
      resetAndClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const test = trpc.aiSettings.testProviderConnection.useMutation({
    onSuccess: (res) => {
      setTestResult(res);
      if (res.ok) toast.success("Koneksi berhasil");
      else toast.error(res.message ?? "Koneksi gagal");
    },
    onError: (err) => {
      setTestResult({ ok: false, message: err.message });
      toast.error(err.message);
    },
  });

  const toggleEnabled = trpc.aiSettings.updateProviderEnabled.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(
        `${label} ${vars.enabled ? "diaktifkan" : "dinonaktifkan"}`,
      );
      utils.aiSettings.getTtsConfig.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const enabled = Boolean(status.enabled);

  function resetAndClose() {
    setOpen(false);
    setReveal(false);
    setApiKey("");
    setServiceAccount("");
    setTestResult(null);
  }

  function buildCreds():
    | { provider: "gemini" | "openrouter"; apiKey: string }
    | { provider: "local"; baseUrl: string }
    | { provider: "9router"; apiKey: string; baseUrl: string }
    | {
        provider: "vertex";
        serviceAccount?: string;
        projectId: string;
        location: string;
        httpRequestEnabled: boolean;
        scopes: string;
        allowedHttpDomains: string;
      }
    | null {
    if (isLocal) {
      if (!baseUrl.trim()) return null;
      return { provider: "local", baseUrl: baseUrl.trim() };
    }
    if (isNineRouter) {
      if (!apiKey.trim()) return null;
      return {
        provider: "9router",
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || NINE_ROUTER_DEFAULT_BASE_URL,
      };
    }
    if (isVertex) {
      if (!projectId.trim()) return null;
      // SA boleh kosong bila sudah tersimpan (hanya update project/location).
      if (!serviceAccount.trim() && !status.hasApiKey) return null;
      return {
        provider: "vertex",
        serviceAccount: serviceAccount.trim() || undefined,
        projectId: projectId.trim(),
        location: location.trim() || "us-central1",
        httpRequestEnabled,
        scopes:
          scopes.trim() || "https://www.googleapis.com/auth/cloud-platform",
        allowedHttpDomains: allowedHttpDomains.trim() || "All",
      };
    }
    if (!apiKey.trim()) return null;
    return { provider: provider as "gemini" | "openrouter", apiKey: apiKey.trim() };
  }

  function onTest() {
    setTestResult(null);
    // Test pakai value yang diketik bila ada; backend fallback ke tersimpan.
    if (isLocal) {
      test.mutate({ provider: "local", baseUrl: baseUrl.trim() || undefined });
    } else if (isNineRouter) {
      test.mutate({
        provider: "9router",
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      });
    } else if (isVertex) {
      test.mutate({
        provider: "vertex",
        serviceAccount: serviceAccount.trim() || undefined,
        projectId: projectId.trim() || undefined,
        location: location.trim() || undefined,
        httpRequestEnabled,
        scopes: scopes.trim() || undefined,
        allowedHttpDomains: allowedHttpDomains.trim() || undefined,
      });
    } else {
      test.mutate({
        provider: provider as "gemini" | "openrouter",
        apiKey: apiKey.trim() || undefined,
      });
    }
  }

  function onSave() {
    const creds = buildCreds();
    if (!creds) {
      toast.error(
        isLocal
          ? "Base URL wajib diisi"
          : isVertex
            ? status.hasApiKey
              ? "Project ID wajib diisi"
              : "Service Account JSON & Project ID wajib diisi"
            : "API key wajib diisi",
      );
      return;
    }
    save.mutate(creds);
  }

  const configured = isLocal ? Boolean(status.configured) : status.hasApiKey;
  const localHost = (() => {
    if (!status.baseUrl) return "endpoint";
    try {
      return new URL(status.baseUrl).host;
    } catch {
      return status.baseUrl;
    }
  })();
  const buttonText = configured
    ? isLocal
      ? `Configured · ${localHost}`
      : isVertex
        ? `Configured · ${status.projectId ?? "project"}`
        : `Configured · ····${status.last4 ?? "****"}`
    : "Set credentials";

  return (
    <Field label={label} htmlFor={`apikey-${provider}`} hint={hint}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          id={`apikey-${provider}`}
          type="button"
          variant="outline"
          onClick={openModal}
          className="w-fit justify-start gap-2 font-mono text-[11px]"
        >
          <KeyRound className="size-3.5" aria-hidden />
          {buttonText}
          <span
            className={cn(
              "ml-1 size-1.5 rounded-full",
              configured ? "bg-emerald-500" : "bg-(--muted-foreground)/40",
            )}
          />
        </Button>

        {/* Toggle enable/disable global. Disabled tidak menghapus credential. */}
        <div className="flex items-center gap-2">
          <Switch
            id={`enabled-${provider}`}
            checked={enabled}
            disabled={toggleEnabled.isPending}
            onCheckedChange={(checked) =>
              toggleEnabled.mutate({ provider, enabled: checked })
            }
          />
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.16em] uppercase",
              enabled
                ? "text-(--foreground)"
                : "text-(--muted-foreground)",
            )}
          >
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? openModal() : resetAndClose())}
      >
        <DialogContent className="max-w-lg overflow-hidden rounded-none border-(--line)">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-[0.12em] uppercase">
              {label}
            </DialogTitle>
          </DialogHeader>

          <div className="grid min-w-0 gap-3 p-4">
            {isLocal ? (
              <div className="space-y-1.5">
                <Label htmlFor={`local-baseurl-${provider}`}>Base URL</Label>
                <Input
                  id={`local-baseurl-${provider}`}
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://100.x.y.z:11434/v1"
                  className="rounded-none border-(--line) font-mono text-[11px]"
                />
                <p className="text-xs text-(--muted-foreground)">
                  Endpoint OpenAI-compatible (Ollama via Tailscale). Sertakan
                  suffix <code>/v1</code>. Tanpa API key.
                </p>
              </div>
            ) : isNineRouter ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`ninerouter-key-${provider}`}>API key</Label>
                  <div className="relative">
                    <Input
                      id={`ninerouter-key-${provider}`}
                      type={reveal ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        status.hasApiKey
                          ? `Tersimpan ····${status.last4 ?? "****"}. Isi untuk mengganti.`
                          : "Tempel API key dari dashboard 9router"
                      }
                      className="rounded-none border-(--line) pr-9 font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => setReveal((v) => !v)}
                      aria-label={reveal ? "Hide" : "Show"}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-(--muted-foreground) hover:text-(--foreground)"
                    >
                      {reveal ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`ninerouter-baseurl-${provider}`}>
                    Base URL
                  </Label>
                  <Input
                    id={`ninerouter-baseurl-${provider}`}
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={NINE_ROUTER_DEFAULT_BASE_URL}
                    className="rounded-none border-(--line) font-mono text-[11px]"
                  />
                  <p className="text-xs text-(--muted-foreground)">
                    Endpoint OpenAI-compatible dari 9router. Default{" "}
                    <code>{NINE_ROUTER_DEFAULT_BASE_URL}</code>. API key diambil
                    dari dashboard 9router.
                  </p>
                </div>
              </>
            ) : isVertex ? (
              <>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`vertex-sa-${provider}`}>Service Account JSON</Label>
                    <button
                      type="button"
                      onClick={() => setReveal((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) hover:text-(--foreground)"
                    >
                      {reveal ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                      {reveal ? "Hide" : "Show"}
                    </button>
                  </div>
                  <Textarea
                    id={`vertex-sa-${provider}`}
                    rows={6}
                    value={serviceAccount}
                    onChange={(e) => setServiceAccount(e.target.value)}
                    placeholder={
                      status.hasApiKey
                        ? "Tersimpan. Tempel JSON baru untuk mengganti."
                        : '{ "type": "service_account", ... }'
                    }
                    className={cn(
                      "h-32 min-h-32 max-h-56 min-w-0 max-w-full resize-y overflow-y-auto rounded-none border-(--line) font-mono text-[11px] whitespace-pre-wrap break-all [field-sizing:fixed]",
                      !reveal && "[-webkit-text-security:disc] [text-security:disc]",
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`vertex-project-${provider}`}>Project ID</Label>
                    <Input
                      id={`vertex-project-${provider}`}
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="my-gcp-project"
                      className="rounded-none border-(--line) font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`vertex-location-${provider}`}>Location</Label>
                    <Input
                      id={`vertex-location-${provider}`}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="us-central1"
                      className="rounded-none border-(--line) font-mono text-[11px]"
                    />
                  </div>
                </div>
                <div className="grid gap-3 border border-(--line) p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <Label htmlFor={`vertex-http-${provider}`}>
                        Set up for use in HTTP Request node
                      </Label>
                      <p className="text-xs text-(--muted-foreground)">
                        Dipakai untuk request Vertex REST, termasuk endpoint global.
                      </p>
                    </div>
                    <Switch
                      id={`vertex-http-${provider}`}
                      checked={httpRequestEnabled}
                      onCheckedChange={setHttpRequestEnabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`vertex-scopes-${provider}`}>Scope(s)</Label>
                    <Input
                      id={`vertex-scopes-${provider}`}
                      value={scopes}
                      onChange={(e) => setScopes(e.target.value)}
                      placeholder="https://www.googleapis.com/auth/cloud-platform"
                      className="rounded-none border-(--line) font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`vertex-domains-${provider}`}>
                      Allowed HTTP Request Domains
                    </Label>
                    <Input
                      id={`vertex-domains-${provider}`}
                      value={allowedHttpDomains}
                      onChange={(e) => setAllowedHttpDomains(e.target.value)}
                      placeholder="All"
                      className="rounded-none border-(--line) font-mono text-[11px]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor={`apikey-input-${provider}`}>API key</Label>
                <div className="relative">
                  <Input
                    id={`apikey-input-${provider}`}
                    type={reveal ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      status.hasApiKey
                        ? `Tersimpan ····${status.last4 ?? "****"}. Isi untuk mengganti.`
                        : "Tempel API key"
                    }
                    className="rounded-none border-(--line) pr-9 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((v) => !v)}
                    aria-label={reveal ? "Hide" : "Show"}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-(--muted-foreground) hover:text-(--foreground)"
                  >
                    {reveal ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {testResult ? (
              <div
                className={cn(
                  "flex items-start gap-2 whitespace-pre-wrap border px-3 py-2 text-xs leading-5",
                  testResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                    : "border-rose-500/30 bg-rose-500/5 text-rose-500",
                )}
              >
                {testResult.ok ? (
                  <Check className="mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <X className="mt-0.5 size-3.5 shrink-0" />
                )}
                {testResult.ok
                  ? "Koneksi berhasil"
                  : testResult.message ?? "Koneksi gagal"}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onTest}
                disabled={test.isPending}
                className="gap-2 rounded-none font-mono text-[11px]"
              >
                <Plug className="size-3.5" aria-hidden />
                {test.isPending ? "Testing..." : "Test connection"}
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={save.isPending}
                className="rounded-none bg-(--primary) font-mono text-[11px] text-(--primary-foreground)"
              >
                {save.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Field>
  );
}
