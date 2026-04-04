import { ArrowUpRight, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContactContent } from "@/shared/types/content";

type ContactCtaProps = {
  content: ContactContent;
};

export function ContactCta({ content }: ContactCtaProps) {
  return (
    <section id="contact">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[768px] px-2 py-14 sm:px-5 md:w-full md:px-8 lg:px-10">
        <div className="surface-hatch border border-(--line) p-6 md:p-8">
          <div className="relative z-10">
            <Badge variant="outline" className="w-fit rounded-full">
              Next step
            </Badge>
            <h2 className="mt-4 max-w-3xl text-xl font-medium tracking-[-0.04em] md:text-2xl">
              {content.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-(--muted-foreground)">
              {content.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg">
                <Mail data-icon="inline-start" />
                {content.primaryCta}
              </Button>
              <Button size="lg" variant="outline">
                {content.secondaryCta}
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </div>
            <p className="mt-6 text-xs text-(--muted-foreground)">
              Current state: dummy content, real structure, validated build pipeline.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
