"use client";

import { Sparkles } from "lucide-react";

import type { TestimonialItem } from "@/shared/types/content";
import { useInView } from "@/shared/hooks/use-in-view";
import { cn } from "@/lib/utils";

import { GlowCard } from "./glow-card";

function TestimonialCard({
  item,
  index,
}: {
  item: TestimonialItem;
  index: number;
}) {
  const { ref, isInView } = useInView({
    threshold: 0.2,
    rootMargin: "0px 0px -48px 0px",
  });

  return (
    <GlowCard
      ref={ref}
      className={cn(
        "border border-(--line) bg-background px-4 py-4 opacity-0 transition-[opacity,transform] duration-500 sm:px-5",
        isInView ? "translate-y-0 opacity-100" : "translate-y-4"
      )}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <Sparkles className="size-4 text-(--muted-foreground)" />
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-(--line) bg-muted font-mono text-[11px]">
          {item.author.slice(0, 1)}
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-7 text-(--foreground)/88">
        &ldquo;{item.quote}&rdquo;
      </p>

      <div className="mt-4">
        <p className="text-[12px] font-medium text-(--foreground)">{item.author}</p>
        <p className="text-[12px] text-(--muted-foreground)">{item.role}</p>
      </div>
    </GlowCard>
  );
}

type TestimonialsWallProps = {
  items: TestimonialItem[];
};

export function TestimonialsWall({ items }: TestimonialsWallProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <TestimonialCard key={`${item.author}-${index}`} item={item} index={index} />
      ))}
    </div>
  );
}
