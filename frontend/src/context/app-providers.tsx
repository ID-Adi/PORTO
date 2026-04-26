"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { homePageContent } from "@/features/home/data/landing-content";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCProvider } from "@/context/trpc-provider";
import { ThemeProvider } from "@/context/theme-provider";
import { CommandMenu } from "@/components/common/command-menu";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TRPCProvider>
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
    </TRPCProvider>
  );
}
