"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  BlogCategory,
  PublicBlogPost,
  PublicCommandData,
  PublicContactData,
  PublicExperienceCompany,
  PublicHomeData,
  PublicProject,
  PublicSiteSettings,
  PublicSkill,
} from "./types";

const PUBLIC_DATA_STALE_MS = 60_000;

async function fetchPublicData<T>(path: string): Promise<T> {
  const response = await fetch(`/api/public/${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch public data: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function usePublicHome() {
  return useQuery({
    queryKey: ["public-data", "home"],
    queryFn: () => fetchPublicData<PublicHomeData>("home"),
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}

export function usePublicProjects() {
  return useQuery({
    queryKey: ["public-data", "projects"],
    queryFn: () => fetchPublicData<PublicProject[]>("projects"),
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}

export function usePublicSiteSettings() {
  return useQuery({
    queryKey: ["public-data", "site-settings"],
    queryFn: () => fetchPublicData<PublicSiteSettings | null>("site-settings"),
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}

export function usePublicCommand(enabled: boolean) {
  return useQuery({
    queryKey: ["public-data", "command"],
    queryFn: () => fetchPublicData<PublicCommandData>("command"),
    enabled,
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}

export function usePublicSkills() {
  return useQuery({
    queryKey: ["public-data", "skills"],
    queryFn: () => fetchPublicData<PublicSkill[]>("skills"),
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}

export function usePublicExperience() {
  return useQuery({
    queryKey: ["public-data", "experience"],
    queryFn: () => fetchPublicData<PublicExperienceCompany[]>("experience"),
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}

export function usePublicBlogPosts(
  category?: BlogCategory,
  options?: { enabled?: boolean; initialData?: PublicBlogPost[] },
) {
  return useQuery({
    queryKey: ["public-data", "blog", category ?? "all"],
    queryFn: () =>
      fetchPublicData<PublicBlogPost[]>(
        category ? `blog?category=${category}` : "blog",
      ),
    enabled: options?.enabled ?? true,
    initialData: options?.initialData,
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}

export function usePublicBlogPost(slug: string, initialPost?: PublicBlogPost) {
  return useQuery({
    // Segmen "blog-post" (bukan "blog") agar slug seperti "global"/"learning"
    // tidak bertabrakan dengan cache list per kategori di atas.
    queryKey: ["public-data", "blog-post", slug],
    queryFn: () => fetchPublicData<PublicBlogPost | null>(`blog/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
    initialData: initialPost,
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}

export function usePublicContact() {
  return useQuery({
    queryKey: ["public-data", "contact"],
    queryFn: () => fetchPublicData<PublicContactData>("contact"),
    staleTime: PUBLIC_DATA_STALE_MS,
  });
}
