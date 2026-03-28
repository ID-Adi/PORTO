import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectHighlight } from "@/shared/types/content";
import { SectionTitle } from "@/shared/ui/section-title";

type WorkShowcaseProps = {
  items: ProjectHighlight[];
};

export function WorkShowcase({ items }: WorkShowcaseProps) {
  return (
    <section className="section-frame border-b border-(--line) px-5 py-14 md:px-8 lg:px-10">
      <SectionTitle
        eyebrow="Selected Work"
        title="Three homepage directions already encoded into the system."
        description="The content is still dummy, but the cards now express how PORTO can present narrative, structure, and proof without losing its restrained visual language."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <Card
            key={item.title}
            className="surface-hatch border border-white/50 bg-white/70 shadow-none"
          >
            <CardHeader>
              <Badge variant="outline" className="w-fit rounded-full">
                {item.metric}
              </Badge>
              <CardTitle className="text-xl tracking-[-0.04em]">
                {item.title}
              </CardTitle>
              <CardDescription className="leading-7">
                {item.summary}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full">
                  {tag}
                </Badge>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="px-0">
                Open direction
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
