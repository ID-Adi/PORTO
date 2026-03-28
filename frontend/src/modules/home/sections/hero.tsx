import { ArrowUpRight, MoveRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { HeroContent } from "@/shared/types/content";

type HeroSectionProps = {
  content: HeroContent;
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className="section-frame border-b border-(--line)">
      <div className="grid gap-0 md:grid-cols-[1.35fr_0.85fr]">
        <div className="surface-hatch relative min-h-[26rem] border-b border-(--line) px-5 py-16 md:border-b-0 md:border-r md:px-8 lg:px-10">
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <Badge variant="outline" className="eyebrow h-6 rounded-full px-3">
                {content.badge}
              </Badge>
              <h1 className="max-w-3xl text-4xl font-medium tracking-[-0.06em] text-balance md:text-6xl">
                {content.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-(--muted-foreground) md:text-lg">
                {content.description}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg">
                  {content.primaryCta}
                  <MoveRight data-icon="inline-end" />
                </Button>
                <Button size="lg" variant="outline">
                  {content.secondaryCta}
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-(--muted-foreground)">
              {content.highlights.map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="h-7 rounded-full bg-background/70 px-3"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <aside className="surface-dots flex flex-col justify-between gap-8 px-5 py-8 md:px-8 lg:px-10">
          <Card className="border border-white/50 bg-white/70 shadow-none">
            <CardHeader>
              <CardTitle>Setup</CardTitle>
              <CardDescription>{content.location}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div>
                <p className="text-sm text-muted-foreground">Reference direction</p>
                <p className="mt-2 text-lg font-medium tracking-[-0.03em]">
                  Swiss-grid inspired, Vercel-adjacent, documentation-grade UI.
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Current phase</p>
                <p className="mt-2 text-lg font-medium tracking-[-0.03em]">
                  Foundation, hierarchy, and component rhythm before feature work.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
