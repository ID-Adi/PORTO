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
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/admin/components/form-field";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type ProviderKey = "gemini" | "vertex" | "openrouter";

type ProviderStatus = {
  hasApiKey: boolean;
  last4?: string | null;
  projectId?: string | null;
  location?: string | null;
};

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
  const [testResult, setTestResult] = useState<
    { ok: boolean; message?: string } | null
  >(null);

  const isVertex = provider === "vertex";

  // Seed project/location dari status saat modal DIBUKA (status bisa baru tiba
  // setelah mount; seeding di handler menghindari clobber saat user mengetik).
  function openModal() {
    if (isVertex) {
      setProjectId(status.projectId ?? "");
      setLocation(status.location ?? "us-central1");
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

  function resetAndClose() {
    setOpen(false);
    setReveal(false);
    setApiKey("");
    setServiceAccount("");
    setTestResult(null);
  }

  function buildCreds():
    | { provider: "gemini" | "openrouter"; apiKey: string }
    | {
        provider: "vertex";
        serviceAccount?: string;
        projectId: string;
        location: string;
      }
    | null {
    if (isVertex) {
      if (!projectId.trim()) return null;
      // SA boleh kosong bila sudah tersimpan (hanya update project/location).
      if (!serviceAccount.trim() && !status.hasApiKey) return null;
      return {
        provider: "vertex",
        serviceAccount: serviceAccount.trim() || undefined,
        projectId: projectId.trim(),
        location: location.trim() || "us-central1",
      };
    }
    if (!apiKey.trim()) return null;
    return { provider: provider as "gemini" | "openrouter", apiKey: apiKey.trim() };
  }

  function onTest() {
    setTestResult(null);
    // Test pakai value yang diketik bila ada; backend fallback ke tersimpan.
    if (isVertex) {
      test.mutate({
        provider: "vertex",
        serviceAccount: serviceAccount.trim() || undefined,
        projectId: projectId.trim() || undefined,
        location: location.trim() || undefined,
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
        isVertex
          ? status.hasApiKey
            ? "Project ID wajib diisi"
            : "Service Account JSON & Project ID wajib diisi"
          : "API key wajib diisi",
      );
      return;
    }
    save.mutate(creds);
  }

  const configured = status.hasApiKey;
  const buttonText = configured
    ? isVertex
      ? `Configured · ${status.projectId ?? "project"}`
      : `Configured · ····${status.last4 ?? "****"}`
    : "Set credentials";

  return (
    <Field label={label} htmlFor={`apikey-${provider}`} hint={hint}>
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

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? openModal() : resetAndClose())}
      >
        <DialogContent className="max-w-lg rounded-none border-(--line)">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-[0.12em] uppercase">
              {label}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            {isVertex ? (
              <>
                <div className="space-y-1.5">
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
                      "rounded-none border-(--line) font-mono text-[11px]",
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
                  "flex items-center gap-2 border px-3 py-2 text-xs",
                  testResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                    : "border-rose-500/30 bg-rose-500/5 text-rose-500",
                )}
              >
                {testResult.ok ? (
                  <Check className="size-3.5" />
                ) : (
                  <X className="size-3.5" />
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
