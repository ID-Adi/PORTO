import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectHighlight } from "@/shared/types/content";
import { SectionTitle } from "@/shared/ui/section-title";

type WorkShowcaseProps = {
  items: ProjectHighlight[];
};

export function WorkShowcase({ items }: WorkShowcaseProps) {
  return (
    <section id="work" className="border-b border-(--line)">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[768px] px-2 py-14 sm:px-5 md:w-full md:px-8 lg:px-10">
        <SectionTitle
          eyebrow="Selected Work"
          title="Three homepage directions already encoded into the system."
          description="The content is still dummy, but the cards now express how PORTO can present narrative, structure, and proof without losing its restrained visual language."
        />

        <div className="mt-10 grid gap-0 border border-(--line) lg:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.title}
              className={`surface-hatch flex flex-col justify-between p-5 ${
                index > 0 ? "border-t border-(--line) lg:border-t-0 lg:border-l" : ""
              }`}
            >
              <div>
                <Badge variant="outline" className="w-fit rounded-full">
                  {item.metric}
                </Badge>
                <h3 className="mt-3 text-base font-medium tracking-[-0.03em]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-(--muted-foreground)">
                  {item.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <Button variant="ghost" className="px-0">
                  Open direction
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
