import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CraftRule } from "@/shared/types/content";
import { SectionTitle } from "@/shared/ui/section-title";

type CraftRulesProps = {
  content: CraftRule[];
};

export function CraftRules({ content }: CraftRulesProps) {
  return (
    <section className="section-frame px-5 py-14 md:px-8 lg:px-10">
      <SectionTitle
        eyebrow="Rules"
        title="UI/UX rules for the first frontend pass."
        description="These constraints come directly from the PORTO docs: system-first thinking, visual restraint, and maintainable modular composition."
      />

      <div className="mt-10 grid gap-0 divide-y divide-(--line) border-y border-(--line)">
        {content.map((rule, index) => (
          <article
            key={rule.title}
            className="grid gap-4 py-5 md:grid-cols-[110px_1fr] md:gap-8"
          >
            <div className="pt-1">
              <Badge variant="outline" className="eyebrow rounded-full">
                {String(index + 1).padStart(2, "0")}
              </Badge>
            </div>
            <div>
              <h3 className="text-lg font-medium tracking-[-0.03em]">
                {rule.title}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-(--muted-foreground)">
                {rule.body}
              </p>
              {index < content.length - 1 ? <Separator className="mt-5" /> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
