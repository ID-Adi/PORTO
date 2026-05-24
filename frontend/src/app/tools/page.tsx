import type { Metadata } from "next";

import { SiteShell } from "@/layout/site-shell";
import {
  Panel,
  PanelDescription,
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
        <Panel>
          <PanelHeader>
            <PanelTitle>
              Tools PAWA - ADI
              <PanelTitleSup>workshop</PanelTitleSup>
            </PanelTitle>
            <PanelDescription>
              Bengkel AI internal. Setiap generator dialirkan ke pipeline N8N
              yang berjalan di latar belakang — sesi akan dipertahankan via
              cookie sehingga jika kamu menutup tab, proses yang sedang berjalan
              dapat dilanjutkan saat kamu kembali login.
            </PanelDescription>
          </PanelHeader>

          <ToolsWorkshop />
        </Panel>
      </div>
    </SiteShell>
  );
}
