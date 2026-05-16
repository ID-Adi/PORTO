"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useMemo } from "react";

import type { ProfilePageContent } from "@/types/content";
import { PronounceButton } from "@/components/common/pronounce-button";
import { TextFlip } from "@/components/text-flip";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { trpc } from "@/lib/trpc";

type ProfileIntroProps = Pick<
  ProfilePageContent,
  | "avatarUrl"
  | "flipSentences"
  | "name"
  | "pronunciationText"
  | "title"
>;

function InteractiveAvatar({
  avatarUrl,
  name,
}: Pick<ProfileIntroProps, "avatarUrl" | "name">) {
  return (
    <Image
      className="size-30 rounded-full ring-1 ring-(--border) ring-offset-2 ring-offset-background select-none sm:size-40"
      src={avatarUrl}
      alt={name}
      width={160}
      height={160}
      priority
      sizes="(max-width: 640px) 120px, 160px"
    />
  );
}

function VerifiedIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
      {...props}
    >
      <path
        fill="currentColor"
        d="M24 12a4.454 4.454 0 0 0-2.564-3.91 4.437 4.437 0 0 0-.948-4.578 4.436 4.436 0 0 0-4.577-.948A4.44 4.44 0 0 0 12 0a4.423 4.423 0 0 0-3.9 2.564 4.434 4.434 0 0 0-2.43-.178 4.425 4.425 0 0 0-2.158 1.126 4.42 4.42 0 0 0-1.12 2.156 4.42 4.42 0 0 0 .183 2.421A4.456 4.456 0 0 0 0 12a4.465 4.465 0 0 0 2.576 3.91 4.433 4.433 0 0 0 .936 4.577 4.459 4.459 0 0 0 4.577.95A4.454 4.454 0 0 0 12 24a4.439 4.439 0 0 0 3.91-2.563 4.26 4.26 0 0 0 5.526-5.526A4.453 4.453 0 0 0 24 12Zm-13.709 4.917-4.38-4.378 1.652-1.663 2.646 2.646L15.83 7.4l1.72 1.591-7.258 7.926Z"
      />
    </svg>
  );
}

function HeroFlip({
  flipSentences,
  title,
}: Pick<ProfileIntroProps, "flipSentences" | "title">) {
  const items = useMemo(() => {
    if (flipSentences.length > 0) return flipSentences;
    return [title];
  }, [flipSentences, title]);

  return (
    <div className="relative flex h-full items-center overflow-hidden">
      <TextFlip
        as={motion.span}
        className="font-pixel-square text-sm text-balance text-(--muted-foreground)"
        interval={1.8}
      >
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </TextFlip>
    </div>
  );
}

export function ProfileIntro({
  avatarUrl,
  flipSentences,
  name,
  pronunciationText,
  title,
}: ProfileIntroProps) {
  const hasMounted = useHasMounted();
  const settings = trpc.siteSettings.get.useQuery(undefined, {
    enabled: hasMounted,
    staleTime: 60_000,
  });
  const displayName = hasMounted ? (settings.data?.profileName ?? name) : name;
  const displayTitle = hasMounted
    ? (settings.data?.profileTitle ?? title)
    : title;

  return (
    <div className="screen-line-bottom flex border-x border-(--line)">
      <div className="shrink-0 border-r border-(--line)">
        <div className="mx-0.5 my-0.75">
          <InteractiveAvatar avatarUrl={avatarUrl} name={displayName} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex grow items-end pb-1 pl-4">
          <div
            className="line-clamp-1 font-mono text-xs text-zinc-300 select-none max-sm:hidden dark:text-zinc-800"
            aria-hidden
          >
            {"text-3xl "}
            <span className="inline dark:hidden">text-zinc-950</span>
            <span className="hidden dark:inline">text-zinc-50</span>
            {" font-medium"}
          </div>
        </div>

        <div className="border-t border-(--line)">
          <div className="flex min-w-0 items-center gap-2 pl-4">
            <h1 className="min-w-0 flex-1 line-clamp-1 -translate-y-px text-3xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <VerifiedIcon className="size-4.5 text-sky-500 select-none" />
            {pronunciationText ? (
              <PronounceButton name={displayName} />
            ) : null}
          </div>

          <div className="h-12.5 border-t border-(--line) py-1 pl-4 sm:h-9">
            <HeroFlip flipSentences={flipSentences} title={displayTitle} />
          </div>
        </div>
      </div>
    </div>
  );
}
