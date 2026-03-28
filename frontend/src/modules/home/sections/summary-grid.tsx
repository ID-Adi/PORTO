import { Badge } from "@/components/ui/badge";
import type { SummaryItem } from "@/shared/types/content";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionTitle } from "@/shared/ui/section-title";

type SummaryGridProps = {
  items: SummaryItem[];
};

export function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <section className="section-frame border-b border-(--line) px-5 py-14 md:px-8 lg:px-10">
      <SectionTitle
        eyebrow="Structure"
        title="Monolith outside, modular inside."
        description="One product, one app, and a folder split that keeps routing, domain sections, and shared primitives from bleeding into each other."
      />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card
            key={item.title}
            className="surface-dots min-h-44 border border-white/50 bg-white/70 shadow-none"
          >
            <CardHeader>
              <Badge variant="outline" className="w-fit rounded-full">
                {item.meta}
              </Badge>
              <CardTitle className="text-xl tracking-[-0.04em]">
                {item.title}
              </CardTitle>
              <CardDescription className="max-w-xl leading-7">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </section>
  );
}
