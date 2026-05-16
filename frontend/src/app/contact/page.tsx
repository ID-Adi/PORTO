"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";

import { SiteShell } from "@/layout/site-shell";
import { homePageContent } from "@/features/home/data/landing-content";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section className="screen-line-top screen-line-bottom">
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
            <p className="mt-2 text-sm text-(--muted-foreground)">
              Have a project in mind or want to collaborate? Send a message.
            </p>
          </header>

          <div className="grid gap-0 lg:grid-cols-2">
            {/* Form */}
            <div className="border-b border-(--line) px-4 py-6 sm:px-5 lg:border-b-0 lg:border-r">
              {submitted ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                  <div className="size-10 rounded-full border border-(--line) bg-zinc-950 flex items-center justify-center">
                    <Mail className="size-4 text-white" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Message sent!</p>
                  <p className="mt-1 text-[12px] text-(--muted-foreground)">Thank you. I&apos;ll get back to you soon.</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">Name</label>
                    <input type="text" required className="w-full border border-(--line) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--foreground)" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">Email</label>
                    <input type="email" required className="w-full border border-(--line) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--foreground)" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">Subject</label>
                    <select required className="w-full border border-(--line) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--foreground)">
                      <option value="">Select a topic</option>
                      <option value="project">Project Inquiry</option>
                      <option value="collaboration">Collaboration</option>
                      <option value="hiring">Hiring</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">Message</label>
                    <textarea required rows={5} className="w-full resize-none border border-(--line) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--foreground)" placeholder="Tell me about your project..." />
                  </div>
                  <button type="submit" className="inline-flex items-center gap-2 border border-(--line) bg-(--foreground) px-5 py-2 text-sm font-medium text-(--background) transition-colors hover:opacity-90">
                    <Send className="size-3.5" />
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Social Links */}
            <div className="px-4 py-6 sm:px-5">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">Connect</h2>
              <div className="mt-4 space-y-3">
                {homePageContent.socials.map((social) => (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border-b border-(--line) pb-3 text-sm transition-colors hover:text-(--foreground) text-(--muted-foreground)"
                  >
                    <span>{social.label}</span>
                    <span className="font-mono text-[11px]">{social.detail}</span>
                  </a>
                ))}
              </div>

              <div className="mt-8">
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">Availability</h2>
                <div className="mt-3 flex items-center gap-2">
                  <span className="size-2 animate-pulse rounded-full bg-green-500" />
                  <span className="text-sm">Open for freelance & collaboration</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
