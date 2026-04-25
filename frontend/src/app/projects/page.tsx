import { PagePlaceholder } from "@/layout/page-placeholder";

export const metadata = {
  title: "Projects",
  description: "Selected work and case studies built by PORTO.",
};

export default function ProjectsPage() {
  return (
    <PagePlaceholder
      kicker="01 / Projects"
      title="Selected work, in progress."
      description="Studi kasus dan eksperimen yang sedang dirapikan. Bagian ini akan menampilkan proyek pilihan dengan konteks teknis, peran, dan hasil terukur."
    />
  );
}
