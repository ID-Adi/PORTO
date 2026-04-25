import { PagePlaceholder } from "@/layout/page-placeholder";

export const metadata = {
  title: "Blog",
  description: "Articles, notes, and technical writing.",
};

export default function BlogPage() {
  return (
    <PagePlaceholder
      kicker="03 / Blog"
      title="Articles & notes."
      description="Tulisan teknis, catatan eksplorasi, dan artikel mendalam akan dipublikasikan di sini. Stay tuned."
    />
  );
}
