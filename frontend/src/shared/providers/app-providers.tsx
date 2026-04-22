"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { homePageContent } from "@/modules/home/data/landing-content";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/shared/providers/query-provider";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { CommandMenu } from "@/shared/ui/command-menu";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <TooltipProvider delayDuration={120}>
          {children}
          <CommandMenu content={homePageContent} />
          <Toaster
            position="bottom-center"
            toastOptions={{
              unstyled: true,
              classNames: {
                toast:
                  "border border-(--line) bg-background px-3 py-2 font-mono text-[12px] text-(--foreground) shadow-none",
                title: "text-[12px] font-medium",
                description: "text-(--muted-foreground)",
              },
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
