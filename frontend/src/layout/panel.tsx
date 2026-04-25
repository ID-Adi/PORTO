import { Slot } from "radix-ui";
import type React from "react";

import { cn } from "@/lib/utils";

export function Panel({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="panel"
      className={cn("screen-line-top screen-line-bottom border-x border-(--line)", className)}
      {...props}
    />
  );
}

export function PanelHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="panel-header"
      className={cn(
        "screen-line-bottom px-4 has-data-[slot=panel-description]:*:data-[slot=panel-title]:screen-line-bottom",
        className
      )}
      {...props}
    />
  );
}

export function PanelTitle({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"h2"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "h2";

  return (
    <Comp
      data-slot="panel-title"
      className={cn("text-3xl font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function PanelTitleSup({
  className,
  ...props
}: React.ComponentProps<"sup">) {
  return (
    <sup
      className={cn(
        "-top-[0.75em] ml-1 text-sm font-medium tracking-normal text-(--muted-foreground)",
        className
      )}
      {...props}
    />
  );
}

export function PanelDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-description"
      className={cn("py-4 font-mono text-sm text-balance text-(--muted-foreground)", className)}
      {...props}
    />
  );
}

export function PanelContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div data-slot="panel-body" className={cn("p-4", className)} {...props} />;
}
