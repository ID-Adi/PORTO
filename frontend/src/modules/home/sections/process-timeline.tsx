import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ProcessStep } from "@/shared/types/content";
import { SectionTitle } from "@/shared/ui/section-title";

type ProcessTimelineProps = {
  steps: ProcessStep[];
};

export function ProcessTimeline({ steps }: ProcessTimelineProps) {
  return (
    <section className="section-frame border-b border-(--line) px-5 py-14 md:px-8 lg:px-10">
      <SectionTitle
        eyebrow="Workflow"
        title="A homepage process that matches the PORTO docs."
        description="This keeps implementation aligned with the design-system-first approach described in the repository notes, instead of jumping straight into arbitrary sections."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="surface-dots border border-white/50 bg-white/70 shadow-none">
          <CardHeader>
            <CardTitle>Frontend architecture</CardTitle>
            <CardDescription>
              Monolith project at the repo root, with feature modules handling
              homepage growth and shared primitives kept independent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Routing layer</span>
              <span className="font-medium">src/app</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Domain sections</span>
              <span className="font-medium">src/modules/home</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shared primitives</span>
              <span className="font-medium">src/shared + components/ui</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {steps.map((step) => (
            <Card
              key={step.step}
              className="border border-white/50 bg-white/70 shadow-none"
            >
              <CardHeader>
                <Badge variant="outline" className="w-fit rounded-full">
                  {step.step}
                </Badge>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription className="leading-7">
                  {step.body}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
