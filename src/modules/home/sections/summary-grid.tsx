import type { SummaryItem } from "@/shared/types/content";
import { Panel } from "@/shared/ui/panel";
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
          <Panel key={item.title} className="surface-dots min-h-44 p-5 md:p-6">
            <h3 className="text-xl font-medium tracking-[-0.04em]">
              {item.title}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-(--muted-foreground)">
              {item.description}
            </p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

