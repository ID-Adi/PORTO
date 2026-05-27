import type { Metadata } from "next";

import { SiteShell } from "@/layout/site-shell";
import {
  PanelHeader,
  PanelTitle,
  PanelTitleSup,
} from "@/layout/panel";
import { ToolsWorkshop } from "@/features/tools/components/tools-workshop";

export const metadata: Metadata = {
  title: "Tools PAWA - ADI",
  description:
    "Bengkel AI internal — generate image & video lewat pipeline N8N. Akses memerlukan sesi login.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ToolsPage() {
  return (
    <SiteShell>
      <div className="page-frame">
        <section className="border-x border-(--line)">
          <PanelHeader className="py-6 text-center">
            <PanelTitle className="text-balance">
              Tools PAWA - ADI
              <PanelTitleSup>workshop</PanelTitleSup>
            </PanelTitle>
          </PanelHeader>

          <ToolsWorkshop />
        </section>
      </div>
    </SiteShell>
  );
}
