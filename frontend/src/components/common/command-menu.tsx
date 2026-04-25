"use client";

import { useRouter } from "next/navigation";
import {
  Component,
  FileText,
  Hash,
  Layers3,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import type { ProfilePageContent } from "@/types/content";
import { navItems } from "@/features/home/data/nav-items";
import { useTheme } from "@/context/theme-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

const OPEN_COMMAND_EVENT = "porto:open-command-menu";

type CommandMenuProps = {
  content: ProfilePageContent;
};

type MenuItem = {
  label: string;
  href?: string;
  external?: boolean;
  shortcut?: string;
  keywords?: string[];
  action?: () => void;
};

export function openCommandMenu() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_EVENT));
}

export function CommandMenu({ content }: CommandMenuProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);

    window.addEventListener(OPEN_COMMAND_EVENT, handleOpen);

    return () => window.removeEventListener(OPEN_COMMAND_EVENT, handleOpen);
  }, []);

  useHotkeys(
    "mod+k, /",
    (event) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === "/" && isTypingTarget) {
        return;
      }

      event.preventDefault();
      setOpen((current) => !current);
    },
    { preventDefault: true }
  );

  const navigationItems = useMemo<MenuItem[]>(
    () =>
      navItems.map((item, index) => ({
        label: item.label,
        href: item.href,
        keywords: [...item.keywords],
        shortcut: index < 9 ? String(index + 1) : undefined,
      })),
    []
  );

  const componentItems = useMemo<MenuItem[]>(
    () =>
      content.components.map((item) => ({
        label: item.title,
        href: "#components",
        keywords: [item.meta, item.description],
      })),
    [content.components]
  );

  const writingItems = useMemo<MenuItem[]>(
    () =>
      content.blog.map((item) => ({
        label: item.title,
        href: "#writing",
        keywords: [item.meta, item.description],
      })),
    [content.blog]
  );

  const socialItems = useMemo<MenuItem[]>(
    () =>
      content.socials.map((item) => ({
        label: item.label,
        href: item.href,
        external: true,
        keywords: [item.detail],
      })),
    [content.socials]
  );

  const themeItems = useMemo<MenuItem[]>(
    () => [
      { label: "Light", action: () => setTheme("light"), shortcut: "L" },
      { label: "Dark", action: () => setTheme("dark"), shortcut: "D" },
    ],
    [setTheme]
  );

  const handleSelect = (item: MenuItem) => {
    setOpen(false);

    if (item.action) {
      item.action();
      return;
    }

    if (!item.href) {
      return;
    }

    if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(item.href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search sections, content, or actions..." />
      <CommandList>
        <CommandEmpty>No matching result. PORTO masih kalem, bukan kosong 😄</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.label}
              keywords={item.keywords}
              onSelect={() => handleSelect(item)}
            >
              <Hash className="size-4" />
              <span>{item.label}</span>
              {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Components">
          {componentItems.map((item) => (
            <CommandItem
              key={item.label}
              keywords={item.keywords}
              onSelect={() => handleSelect(item)}
            >
              <Component className="size-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Writing">
          {writingItems.map((item) => (
            <CommandItem
              key={item.label}
              keywords={item.keywords}
              onSelect={() => handleSelect(item)}
            >
              <FileText className="size-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Social">
          {socialItems.map((item) => (
            <CommandItem
              key={item.label}
              keywords={item.keywords}
              onSelect={() => handleSelect(item)}
            >
              <Layers3 className="size-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Theme">
          {themeItems.map((item) => (
            <CommandItem key={item.label} onSelect={() => handleSelect(item)}>
              {item.label === "Dark" ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              )}
              <span>{item.label}</span>
              {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
