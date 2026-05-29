"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { SiteHeader } from "@/layout/site-header";

import { CanvasClient } from "./canvas-client";

export function CanvasShell() {
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <motion.div
        initial={false}
        animate={{ height: headerCollapsed ? 0 : "auto" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="shrink-0 overflow-hidden"
        aria-hidden={headerCollapsed}
      >
        <SiteHeader />
      </motion.div>
      <CanvasClient
        headerCollapsed={headerCollapsed}
        onToggleHeader={() => setHeaderCollapsed((prev) => !prev)}
      />
    </div>
  );
}
