import { Badge } from "@/components/ui/badge";
import type { SummaryItem } from "@/shared/types/content";
import { SectionTitle } from "@/shared/ui/section-title";

type SummaryGridProps = {
  items: SummaryItem[];
};

export function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <section className="border-b border-(--line)">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[768px] px-2 py-14 sm:px-5 md:w-full md:px-8 lg:px-10">
        <SectionTitle
          eyebrow="Structure"
          title="Monolith outside, modular inside."
          description="One product, one app, and a folder split that keeps routing, domain sections, and shared primitives from bleeding into each other."
        />

        <div className="mt-10 grid gap-0 border border-(--line) md:grid-cols-2">
          {items.map((item, index) => (
            <div
              key={item.title}
              className={`surface-dots min-h-44 p-5 ${
                index % 2 !== 0 ? "md:border-l md:border-(--line)" : ""
              } ${index >= 2 ? "border-t border-(--line)" : ""}`}
            >
              <Badge variant="outline" className="w-fit rounded-full">
                {item.meta}
              </Badge>
              <h3 className="mt-3 text-base font-medium tracking-[-0.03em]">
                {item.title}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-7 text-(--muted-foreground)">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
