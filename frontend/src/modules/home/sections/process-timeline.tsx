import { Badge } from "@/components/ui/badge";
import type { ProcessStep } from "@/shared/types/content";
import { SectionTitle } from "@/shared/ui/section-title";

type ProcessTimelineProps = {
  steps: ProcessStep[];
};

export function ProcessTimeline({ steps }: ProcessTimelineProps) {
  return (
    <section id="process" className="border-b border-(--line)">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[768px] px-2 py-14 sm:px-5 md:w-full md:px-8 lg:px-10">
        <SectionTitle
          eyebrow="Workflow"
          title="A homepage process that matches the PORTO docs."
          description="This keeps implementation aligned with the design-system-first approach described in the repository notes, instead of jumping straight into arbitrary sections."
        />

        <div className="mt-10 grid gap-0 border border-(--line) lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-dots p-5 lg:border-r lg:border-(--line)">
            <p className="eyebrow text-xs text-(--muted-foreground)">Setup</p>
            <h3 className="mt-2 text-base font-medium">Frontend architecture</h3>
            <p className="mt-2 text-sm leading-7 text-(--muted-foreground)">
              Monolith project at the repo root, with feature modules handling
              homepage growth and shared primitives kept independent.
            </p>
            <div className="mt-6 space-y-0">
              <div className="flex items-center justify-between border-t border-(--line) py-3 text-sm">
                <span className="text-(--muted-foreground)">Routing layer</span>
                <span className="font-mono text-xs font-medium">src/app</span>
              </div>
              <div className="flex items-center justify-between border-t border-(--line) py-3 text-sm">
                <span className="text-(--muted-foreground)">Domain sections</span>
                <span className="font-mono text-xs font-medium">src/modules/home</span>
              </div>
              <div className="flex items-center justify-between border-t border-(--line) py-3 text-sm">
                <span className="text-(--muted-foreground)">Shared primitives</span>
                <span className="font-mono text-xs font-medium">src/shared + components/ui</span>
              </div>
            </div>
          </div>

          <div className="grid gap-0">
            {steps.map((step, index) => (
              <div
                key={step.step}
                className={`p-5 ${index > 0 ? "border-t border-(--line)" : ""}`}
              >
                <Badge variant="outline" className="w-fit rounded-full">
                  {step.step}
                </Badge>
                <h3 className="mt-2 text-base font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-(--muted-foreground)">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
