"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  ExternalLink,
  ImageIcon,
  Layers,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { SiteShell } from "@/layout/site-shell";
import { cn } from "@/lib/utils";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

type ActivityItem = {
  id: number;
  prompt: string;
  aspectRatio: string;
  fileUrl: string | null;
  status: string;
  createdAt: Date | string;
  mediaKind: "image" | "video";
};

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
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

  const historiesLoading = imageHistory.isLoading || videoHistory.isLoading;
  const latestLabel = latestActivity[0]
    ? formatDate(latestActivity[0].createdAt)
    : "Empty";

  if (isPending || !user) {
    return <DashboardLoadingState />;
  }

  const totalCount =
    (imageHistory.data?.length ?? 0) + (videoHistory.data?.length ?? 0);

  return (
    <SiteShell>
      <div className="page-frame">
        <section className="border-x border-line">
          <DashboardHero
            totalCount={totalCount}
            latestLabel={latestLabel}
            isAdmin={isAdmin}
          />
          <IdentityPanel
            name={user.name || "Signed user"}
            email={user.email}
            isAdmin={isAdmin}
          />
          <StatGrid
            imageCount={imageHistory.data?.length ?? 0}
            videoCount={videoHistory.data?.length ?? 0}
            totalCount={totalCount}
            latestLabel={latestLabel}
          />

          <div className="grid md:grid-cols-2">
            <ActivityPanel items={latestActivity} isLoading={historiesLoading} />
            <OutputGallery items={recentOutputs} isLoading={historiesLoading} />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

function DashboardHero({
  totalCount,
  latestLabel,
  isAdmin,
}: {
  totalCount: number;
  latestLabel: string;
  isAdmin: boolean;
}) {
  return (
    <header className="screen-line-bottom surface-dots border-b border-line px-4 py-6 sm:px-5 md:px-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
            User dashboard
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Workspace overview
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Pantau aktivitas, output media, dan akses akun dari satu permukaan
            kerja yang ringkas.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <DashboardChip label={`${totalCount} media`} />
            <DashboardChip label={`Latest ${latestLabel}`} />
            <DashboardChip label={isAdmin ? "Admin access" : "User access"} />
          </div>
        </div>
        <Button
          asChild
          className="w-full rounded-none bg-(--primary) font-mono text-[12px] text-(--primary-foreground) uppercase hover:bg-(--primary)/90 sm:w-fit"
        >
          <Link href="/tools">
            Open Tools <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </header>
  );
}

function DashboardChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center border border-line bg-background/70 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
      {label}
    </span>
  );
}

function IdentityPanel({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email?: string | null;
  isAdmin: boolean;
}) {
  return (
    <div className="grid gap-4 border-b border-line px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center border border-line bg-muted/30">
          <UserRound className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tracking-tight">
            {name}
          </div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            {email ?? "No email"}
          </div>
        </div>
      </div>
      <div className="inline-flex w-fit items-center gap-2 border border-line px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        <ShieldCheck className="size-3" aria-hidden />
        {isAdmin ? "Admin access" : "User access"}
      </div>
    </div>
  );
}

function StatGrid({
  imageCount,
  videoCount,
  totalCount,
  latestLabel,
}: {
  imageCount: number;
  videoCount: number;
  totalCount: number;
  latestLabel: string;
}) {
  return (
    <div className="grid border-b border-line sm:grid-cols-2 lg:grid-cols-4">
      <StatCell label="Image history" value={imageCount} icon={ImageIcon} />
      <StatCell label="Video history" value={videoCount} icon={Video} />
      <StatCell label="Total media" value={totalCount} icon={Layers} />
      <StatCell label="Latest" value={latestLabel} icon={Clock3} wideValue />
    </div>
  );
}

function StatCell({
  label,
  value,
  icon: Icon,
  wideValue,
}: {
  label: string;
  value: number | string;
  icon: typeof ImageIcon;
  wideValue?: boolean;
}) {
  return (
    <div className="border-b border-line p-4 last:border-b-0 sm:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            {label}
          </div>
          <div
            className={cn(
              "mt-2 font-semibold tracking-tight tabular-nums",
              wideValue
                ? "text-xl leading-tight break-words"
                : "text-2xl md:text-3xl",
            )}
          >
            {value}
          </div>
        </div>
        <div className="grid size-9 shrink-0 place-items-center border border-line bg-muted/30">
          <Icon className="size-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function ActivityPanel({
  items,
  isLoading,
}: {
  items: ActivityItem[];
  isLoading: boolean;
}) {
  return (
    <div className="border-b border-line p-4 md:border-r md:border-b-0 md:p-5">
      <SectionHeading
        title="Latest activity"
        description="Generasi image dan video terbaru dari akunmu."
        icon={Activity}
      />

      {isLoading && items.length === 0 ? (
        <ActivitySkeleton />
      ) : items.length > 0 ? (
        <div className="divide-y divide-line border border-line">
          {items.map((item) => (
            <ActivityRow key={`${item.mediaKind}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <DashboardEmptyState
          icon={Sparkles}
          title="Belum ada aktivitas"
          description="Mulai generate image atau video dari Tools untuk mengisi riwayat workspace."
        />
      )}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.mediaKind === "image" ? ImageIcon : Video;

  return (
    <article className="grid gap-3 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-8 shrink-0 place-items-center border border-line bg-muted/30">
          <Icon className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm leading-5">
            {item.prompt || "Untitled generation"}
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            <span>{item.mediaKind}</span>
            <span>{item.aspectRatio}</span>
            <time dateTime={new Date(item.createdAt).toISOString()}>
              {formatDate(item.createdAt)}
            </time>
          </div>
        </div>
      </div>
      <StatusBadge status={item.status} className="w-fit sm:justify-self-end" />
    </article>
  );
}

function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] tracking-[0.12em] uppercase",
        status === "success"
          ? "border-line text-foreground"
          : status === "error" || status === "failed"
            ? "border-destructive/40 text-destructive"
            : "border-line text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "success"
            ? "bg-emerald-500"
            : status === "error" || status === "failed"
              ? "bg-rose-500"
              : "bg-muted-foreground",
        )}
        aria-hidden
      />
      {status}
    </span>
  );
}

function OutputGallery({
  items,
  isLoading,
}: {
  items: ActivityItem[];
  isLoading: boolean;
}) {
  return (
    <div className="p-4 md:p-5">
      <SectionHeading
        title="Recent outputs"
        description="Pratinjau media sukses dari Tools."
        action={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full rounded-none font-mono text-[11px] uppercase sm:w-fit"
          >
            <Link href="/tools">
              <Wrench className="size-3.5" aria-hidden />
              Tools
            </Link>
          </Button>
        }
      />

      {isLoading && items.length === 0 ? (
        <OutputSkeleton />
      ) : items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <OutputCard key={`${item.mediaKind}-preview-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <DashboardEmptyState
          icon={Wrench}
          title="Belum ada output sukses"
          description="Output image dan video yang berhasil akan muncul di panel ini."
          actionLabel="Open Tools"
        />
      )}
    </div>
  );
}

function OutputCard({ item }: { item: ActivityItem }) {
  return (
    <article className="overflow-hidden border border-line bg-muted/20">
      <div className="relative aspect-video overflow-hidden border-b border-line bg-muted/30">
        {item.mediaKind === "image" && item.fileUrl ? (
          <Image
            src={item.fileUrl}
            alt={item.prompt || "Generated image"}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : item.mediaKind === "video" && item.fileUrl ? (
          <video
            src={`${item.fileUrl}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>
      <div className="grid gap-2 p-3">
        <h3 className="line-clamp-2 text-sm leading-5">
          {item.prompt || "Untitled generation"}
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          <span>
            {item.mediaKind} / {item.aspectRatio}
          </span>
          <time dateTime={new Date(item.createdAt).toISOString()}>
            {formatDate(item.createdAt)}
          </time>
        </div>
      </div>
    </article>
  );
}

function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
}: {
  icon: typeof ImageIcon;
  title: string;
  description: string;
  actionLabel?: string;
}) {
  return (
    <div className="grid min-h-56 place-items-center border border-dashed border-line p-6 text-center">
      <div className="max-w-xs">
        <div className="mx-auto mb-3 grid size-10 place-items-center border border-line bg-muted/30">
          <Icon className="size-4" aria-hidden />
        </div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {actionLabel ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-4 rounded-none font-mono text-[11px] uppercase"
          >
            <Link href="/tools">
              {actionLabel} <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <SiteShell>
      <div className="page-frame">
        <section className="min-h-[60vh] border-x border-line">
          <div className="screen-line-bottom border-b border-line px-4 py-6 sm:px-5 md:px-6">
            <Skeleton className="h-3 w-36 rounded-none" />
            <Skeleton className="mt-3 h-9 w-64 max-w-full rounded-none" />
            <Skeleton className="mt-3 h-4 w-full max-w-md rounded-none" />
          </div>
          <div className="grid border-b border-line sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="border-b border-line p-4 sm:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0 md:p-5"
              >
                <Skeleton className="h-3 w-24 rounded-none" />
                <Skeleton className="mt-3 h-7 w-16 rounded-none" />
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2">
            <div className="border-b border-line p-4 md:border-r md:border-b-0 md:p-5">
              <ActivitySkeleton />
            </div>
            <div className="p-4 md:p-5">
              <OutputSkeleton />
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

function ActivitySkeleton() {
  return (
    <div className="divide-y divide-line border border-line">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="grid gap-3 p-3 sm:grid-cols-[auto_1fr_auto]">
          <Skeleton className="size-8 rounded-none" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-full rounded-none" />
            <Skeleton className="h-3 w-40 rounded-none" />
          </div>
          <Skeleton className="h-6 w-16 rounded-none" />
        </div>
      ))}
    </div>
  );
}

function OutputSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="border border-line">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="grid gap-2 p-3">
            <Skeleton className="h-4 w-full rounded-none" />
            <Skeleton className="h-3 w-28 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
