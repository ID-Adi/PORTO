import { ArrowUpRight, Mail } from "lucide-react";

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
import type { ContactContent } from "@/shared/types/content";

type ContactCtaProps = {
  content: ContactContent;
};

export function ContactCta({ content }: ContactCtaProps) {
  return (
    <section className="section-frame px-5 py-14 md:px-8 lg:px-10">
      <Card className="surface-hatch border border-white/50 bg-white/70 shadow-none">
        <CardHeader>
          <Badge variant="outline" className="w-fit rounded-full">
            Next step
          </Badge>
          <CardTitle className="max-w-3xl text-3xl tracking-[-0.05em] md:text-4xl">
            {content.title}
          </CardTitle>
          <CardDescription className="max-w-2xl leading-7">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button size="lg">
            <Mail data-icon="inline-start" />
            {content.primaryCta}
          </Button>
          <Button size="lg" variant="outline">
            {content.secondaryCta}
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Current state: dummy content, real structure, validated build pipeline.
        </CardFooter>
      </Card>
    </section>
  );
}
