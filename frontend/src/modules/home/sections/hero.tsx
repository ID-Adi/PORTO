"use client";

import Image from "next/image";
import { useState } from "react";
import { 
  BadgeCheck, 
  Volume2, 
  Code, 
  Lightbulb, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Link as LinkIcon, 
  User 
} from "lucide-react";
import type { HeroContent } from "@/shared/types/content";
import ElectricBorder from "@/components/anim/electric-border";

type HeroSectionProps = {
  content: HeroContent;
};

// Map string icon names from data to actual Lucide components
const IconMap: Record<string, any> = {
  Code,
  Lightbulb,
  MapPin,
  Clock,
  Phone,
  Mail,
  Link: LinkIcon,
  User,
};

function InteractiveAvatar({ src, alt }: { src: string; alt: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 lg:h-44 lg:w-44 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Soft Electric Aura */}
      <div 
        className={`absolute inset-0 transition-opacity duration-500 ease-out z-0 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <ElectricBorder
          color="#f97316"
          borderRadius={9999}
          chaos={0.06} // Reduced for a much softer ring
          speed={1.5}
          className="h-full w-full rounded-full"
        />
      </div>

      {/* Static Profile Picture Overlay */}
      <div 
        className={`absolute inset-0 z-10 overflow-hidden rounded-full border-4 border-(--background) bg-(--background) transition-shadow duration-300 ${
          isHovered ? "shadow-none" : "shadow-[0_0_0_1px_var(--line)]"
        }`}
      >
        <Image 
          src={src} 
          alt={alt}
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className="bg-(--background)">
      {/* TOP: Logo Area (Spans 100vw, with 100vw dots and border) */}
      <div className="surface-dots flex w-full justify-center border-b border-(--line)">
        <div className="mx-auto flex h-[240px] w-[calc(100%-2rem)] max-w-[768px] items-center justify-center md:h-[320px] md:w-full">
          {/* Stylized Pixel Logo Block */}
          <div className="flex select-none items-center justify-center bg-(--foreground) px-6 py-4 font-mono text-6xl font-black tracking-widest text-(--background) shadow-sm md:text-8xl">
            {content.pixelLogoText}
          </div>
        </div>
      </div>

      {/* BOTTOM: Profile Info Area (Spans 100vw, with 100vw bottom border) */}
      <div className="w-full border-b border-(--line)">
        <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[768px] grid-cols-[auto_1fr] md:w-full">
          
          {/* Avatar Column */}
          <div className="flex items-center justify-center border-r border-(--line) p-3 sm:p-4 md:row-span-2 md:p-5">
            <InteractiveAvatar src={content.avatarUrl} alt={content.name} />
          </div>

          {/* Details / Header Column */}
          <div className="flex flex-col justify-center">

            {/* Row 2: Name and Badges */}
            <div className="border-b border-(--line) px-4 py-2 sm:py-1 md:px-6 lg:px-8">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold tracking-tight text-(--foreground) md:text-2xl">
                  {content.name}
                </h1>
                {content.isVerified && (
                  <BadgeCheck className="h-4 w-4 fill-blue-500 text-white md:h-5 md:w-5" />
                )}
                <Volume2 className="h-3.5 w-3.5 text-(--muted-foreground) md:h-4 md:w-4" />
              </div>
            </div>

            {/* Row 3: Role */}
            <div className="px-4 py-1.5 md:px-6 lg:px-8">
              <span className="text-[11px] font-medium text-(--muted-foreground) md:text-[13px]">
                {content.title}
              </span>
            </div>
          </div>

          {/* Info Grid (Full width on mobile, right column on desktop) */}
          <div className="surface-hatch col-span-2 border-t border-(--line) px-4 py-3 sm:px-5 md:col-span-1 md:px-6 md:py-3 lg:px-8 lg:py-3.5">
            <ul className="grid gap-x-6 gap-y-2.5 lg:gap-x-8 lg:gap-y-3 sm:grid-cols-2">
              {content.infoItems.map((item, idx) => {
                const Icon = IconMap[item.icon];
                return (
                  <li key={idx} className="flex items-center gap-3 text-[11px] text-(--foreground) md:text-xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-(--line) bg-(--background) shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                      {Icon && <Icon className="h-3.5 w-3.5 text-(--muted-foreground)" strokeWidth={1.5} />}
                    </div>
                    <span className="font-mono font-medium tracking-tight text-(--foreground)/90">{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          
        </div>
      </div>
    </section>
  );
}
