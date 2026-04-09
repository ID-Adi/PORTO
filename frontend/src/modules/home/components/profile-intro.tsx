"use client";

import Image from "next/image";
import { BadgeCheck, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import ElectricBorder from "@/components/anim/electric-border";
import type { ProfilePageContent } from "@/shared/types/content";

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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative size-30 cursor-pointer sm:size-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <ElectricBorder
          color="#f59e0b"
          borderRadius={9999}
          chaos={0.06}
          speed={1.4}
          className="size-full rounded-full"
        />
      </div>

      <div
        className={`absolute inset-0 overflow-hidden rounded-full border bg-background transition-shadow duration-300 ${
          isHovered
            ? "border-transparent shadow-none"
            : "border-(--line) shadow-[0_0_0_1px_var(--line)]"
        }`}
      >
        <Image
          src={avatarUrl}
          alt={name}
          fill
          priority
          sizes="(max-width: 640px) 120px, 160px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

function NamePronunciationButton({
  name,
  pronunciationText,
}: Pick<ProfileIntroProps, "name" | "pronunciationText">) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      return () => window.speechSynthesis.cancel();
    }

    return undefined;
  }, []);

  const phrase = pronunciationText || name;

  const speakName = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={speakName}
      className={`inline-flex size-7 items-center justify-center rounded-full border transition-colors ${
        isSpeaking
          ? "border-zinc-400 bg-zinc-950 text-zinc-50 dark:border-zinc-500 dark:bg-zinc-50 dark:text-zinc-950"
          : "border-(--line) text-(--muted-foreground) hover:bg-black/[0.03] hover:text-(--foreground) dark:hover:bg-white/[0.06]"
      }`}
      aria-label={`Pronounce ${name}`}
      title={`Pronounce ${name}`}
    >
      <Volume2 className="size-3.5" strokeWidth={1.8} />
    </button>
  );
}

function RotatingSubtitle({
  flipSentences,
  title,
}: Pick<ProfileIntroProps, "flipSentences" | "title">) {
  const items = useMemo(() => {
    if (flipSentences.length > 0) {
      return flipSentences;
    }

    return [title];
  }, [flipSentences, title]);

  const [index, setIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setIsReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () =>
      mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (items.length <= 1 || isReducedMotion) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isReducedMotion, items]);

  return (
    <div className="relative flex h-full items-center overflow-hidden">
      <span
        key={items[index]}
        className={`inline-block font-mono text-[12px] tracking-tight text-(--muted-foreground) transition-all duration-300 ease-out sm:text-sm ${
          isReducedMotion ? "translate-y-0 opacity-100" : "translate-y-[-1px] opacity-100"
        }`}
      >
        {items[index]}
      </span>
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
  return (
    <div className="screen-line-bottom flex border-x border-(--line)">
      <div className="shrink-0 border-r border-(--line)">
        <div className="mx-0.5 my-0.75">
          <InteractiveAvatar avatarUrl={avatarUrl} name={name} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex grow items-end pb-1 pl-4">
          <div
            className="line-clamp-1 font-mono text-[11px] tracking-tight text-zinc-300 select-none max-sm:hidden dark:text-zinc-800"
            aria-hidden
          >
            {"text-3xl "}
            <span className="inline dark:hidden">text-zinc-950</span>
            <span className="hidden dark:inline">text-zinc-50</span>
            {" font-medium"}
          </div>
        </div>

        <div className="border-t border-(--line)">
          <div className="flex flex-wrap items-center gap-2 pl-4 pr-3">
            <h1 className="-translate-y-px text-3xl font-semibold tracking-tight sm:text-[2rem]">
              {name}
            </h1>
            <BadgeCheck className="size-4.5 fill-sky-500 text-white" />
            {pronunciationText ? (
              <NamePronunciationButton
                name={name}
                pronunciationText={pronunciationText}
              />
            ) : null}
          </div>

          <div className="h-12.5 border-t border-(--line) px-4 py-1 sm:h-9">
            <RotatingSubtitle flipSentences={flipSentences} title={title} />
          </div>
        </div>
      </div>
    </div>
  );
}
