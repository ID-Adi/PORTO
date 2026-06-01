"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/admin/components/page-header";

export default function AdminDashboardPage() {
  const projects = trpc.projects.list.useQuery();
  const skills = trpc.skills.list.useQuery();
  const blog = trpc.blog.list.useQuery();
  const experience = trpc.experiences.list.useQuery();
  const contact = trpc.contact.list.useQuery();

  const tiles = [
    {
      label: "Projects",
      value: projects.data?.length ?? "—",
      loading: projects.isLoading,
      href: "/admin/projects",
    },
    {
      label: "Skills",
      value: skills.data?.length ?? "—",
      loading: skills.isLoading,
      href: "/admin/skills",
    },
    {
      label: "Blog posts",
      value: blog.data?.length ?? "—",
      loading: blog.isLoading,
      href: "/admin/blog",
    },
    {
      label: "Experience",
      value: experience.data?.length ?? "—",
      loading: experience.isLoading,
      href: "/admin/experience",
    },
    {
      label: "Contact messages",
      value: contact.data?.length ?? "—",
      loading: contact.isLoading,
      sub:
        typeof contact.data !== "undefined"
          ? `${contact.data.filter((m) => !m.read).length} unread`
          : undefined,
      href: "/admin/contact",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of portfolio content"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="group">
            <Card className="border-(--border) transition-colors group-hover:border-(--primary)">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-(--muted-foreground)">
                  {tile.label}
                  <ArrowRight className="size-4 text-(--muted-foreground) transition-transform group-hover:translate-x-0.5 group-hover:text-(--primary)" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight text-(--foreground)">
                  {tile.loading ? (
                    <Skeleton className="h-9 w-12" />
                  ) : (
                    tile.value
                  )}
                </div>
                {tile.sub ? (
                  <div className="mt-1 text-xs text-(--muted-foreground)">
                    {tile.sub}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
