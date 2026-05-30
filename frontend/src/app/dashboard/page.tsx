"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  ImageIcon,
  Layers,
  ShieldCheck,
  UserRound,
  Video,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { SiteShell } from "@/layout/site-shell";
import { cn } from "@/lib/utils";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

function toTime(value: Date | string | number) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value: Date | string | number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatPanel({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof ImageIcon;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 md:p-6">
      <div className="min-w-0">
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {label}
        </div>
        <div className="mt-2 truncate text-2xl font-semibold tracking-tight">
          {value}
        </div>
      </div>
      <div className="grid size-9 shrink-0 place-items-center border border-line bg-muted/30">
        <Icon className="size-4" aria-hidden />
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon?: typeof ImageIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-mono text-[12px] tracking-[0.18em] uppercase">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action ??
        (Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null)}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isAdmin = user?.email === adminEmail;
  const queriesEnabled = Boolean(user);

  const imageHistory = trpc.tools.listMyHistory.useQuery(
    { kind: "image" },
    { enabled: queriesEnabled },
  );
  const videoHistory = trpc.tools.listMyHistory.useQuery(
    { kind: "video" },
    { enabled: queriesEnabled },
  );

  useEffect(() => {
    if (!isPending && !user) {
      router.replace("/login?redirect=/dashboard");
    }
  }, [isPending, router, user]);

  const latestActivity = useMemo(() => {
    const images = (imageHistory.data ?? []).map((row) => ({
      ...row,
      mediaKind: "image" as const,
    }));
    const videos = (videoHistory.data ?? []).map((row) => ({
      ...row,
      mediaKind: "video" as const,
    }));
    return [...images, ...videos]
      .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
      .slice(0, 8);
  }, [imageHistory.data, videoHistory.data]);

  const recentOutputs = latestActivity
    .filter((row) => row.status === "success" && row.fileUrl)
    .slice(0, 6);

  if (isPending || !user) {
    return (
      <SiteShell>
        <div className="page-frame">
          <section className="grid min-h-[60vh] place-items-center border-x border-line px-4">
            <div className="font-mono text-[12px] tracking-[0.18em] text-muted-foreground uppercase">
              Loading dashboard
            </div>
          </section>
        </div>
      </SiteShell>
    );
  }

  const totalCount =
    (imageHistory.data?.length ?? 0) + (videoHistory.data?.length ?? 0);

  return (
    <SiteShell>
      <div className="page-frame">
        <section className="border-x border-line">
          {/* Header */}
          <header className="border-b border-line px-4 py-6 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
                  User dashboard
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                  Workspace overview
                </h1>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Pantau aktivitas dan hasil generasi media dari akunmu.
                </p>
              </div>
              <Button
                asChild
                className="w-fit rounded-none font-mono text-[12px] uppercase"
              >
                <Link href="/tools">
                  Open Tools <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          </header>

          {/* Identity bar */}
          <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center border border-line bg-muted/30">
                <UserRound className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">
                  {user.name || "Signed user"}
                </div>
                <div className="mt-0.5 truncate text-sm text-muted-foreground">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 border border-line px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              <ShieldCheck className="size-3" aria-hidden />
              {isAdmin ? "Admin access" : "User access"}
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 border-b border-line lg:grid-cols-4">
            <div className="border-r border-b border-line lg:border-b-0">
              <StatPanel
                label="Image history"
                value={imageHistory.data?.length ?? 0}
                icon={ImageIcon}
              />
            </div>
            <div className="border-b border-line lg:border-r lg:border-b-0">
              <StatPanel
                label="Video history"
                value={videoHistory.data?.length ?? 0}
                icon={Video}
              />
            </div>
            <div className="border-r border-line">
              <StatPanel label="Total media" value={totalCount} icon={Layers} />
            </div>
            <div>
              <StatPanel
                label="Latest"
                value={
                  latestActivity[0]
                    ? formatDate(latestActivity[0].createdAt)
                    : "Empty"
                }
                icon={Clock3}
              />
            </div>
          </div>

          {/* Content panels */}
          <div className="grid md:grid-cols-2">
            <div className="border-b border-line p-4 md:border-r md:border-b-0 md:p-6">
              <SectionHeading
                title="Latest activity"
                description="Generasi image & video terbaru dari akunmu."
                icon={Activity}
              />

              <div className="space-y-2">
                {latestActivity.length > 0 ? (
                  latestActivity.map((row) => (
                    <div
                      key={`${row.mediaKind}-${row.id}`}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-line p-3"
                    >
                      <div className="grid size-8 place-items-center border border-line bg-muted/30">
                        {row.mediaKind === "image" ? (
                          <ImageIcon className="size-3.5" aria-hidden />
                        ) : (
                          <Video className="size-3.5" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm">
                          {row.prompt || "Untitled generation"}
                        </div>
                        <div className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                          {row.mediaKind} / {row.aspectRatio}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "font-mono text-[10px] tracking-[0.12em] uppercase",
                          row.status === "success"
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {row.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-dashed border-line p-6 text-sm text-muted-foreground">
                    No generation history yet.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 md:p-6">
              <SectionHeading
                title="Recent outputs"
                description="Pratinjau media sukses dari Tools."
                action={
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-none font-mono text-[11px] uppercase"
                  >
                    <Link href="/tools">
                      <Wrench className="size-3.5" aria-hidden />
                      Tools
                    </Link>
                  </Button>
                }
              />

              {recentOutputs.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {recentOutputs.map((row) => (
                    <div
                      key={`${row.mediaKind}-preview-${row.id}`}
                      className="border border-line bg-muted/20"
                    >
                      <div className="relative aspect-video overflow-hidden border-b border-line bg-muted/30">
                        {row.mediaKind === "image" ? (
                          <Image
                            src={row.fileUrl!}
                            alt={row.prompt || "Generated image"}
                            fill
                            sizes="(max-width: 768px) 100vw, 320px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <video
                            src={`${row.fileUrl!}#t=0.1`}
                            preload="metadata"
                            muted
                            playsInline
                            className="absolute inset-0 size-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-3">
                        <div className="truncate text-sm">
                          {row.prompt || "Untitled generation"}
                        </div>
                        <div className="mt-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                          {formatDate(row.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-64 place-items-center border border-dashed border-line p-6 text-center">
                  <div>
                    <div className="mx-auto mb-3 grid size-10 place-items-center border border-line bg-muted/30">
                      <Wrench className="size-4" aria-hidden />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Create your first image or video from Tools.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
