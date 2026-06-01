"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/layout/site-shell";
import { trpc } from "@/lib/trpc";
import { ContactSocialsSkeleton } from "@/components/skeletons/contact-socials-skeleton";
import { usePublicContact } from "@/features/public-data/client";

const SUBJECT_LABELS: Record<string, string> = {
  project: "Project Inquiry",
  collaboration: "Collaboration",
  hiring: "Hiring",
  other: "Other",
};

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const socialsQuery = usePublicContact();
  const socials = socialsQuery.data?.socials ?? [];

  const submit = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      toast.success("Pesan terkirim");
    },
    onError: (err) => toast.error(err.message ?? "Gagal mengirim pesan"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit.mutate({
      name,
      email,
      subject: subject ? SUBJECT_LABELS[subject] ?? subject : null,
      message,
    });
  }

  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
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
                  <div className="flex size-10 items-center justify-center rounded-full border border-(--line) bg-zinc-950">
                    <Mail className="size-4 text-white" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Message sent!</p>
                  <p className="mt-1 text-[12px] text-(--muted-foreground)">
                    Thank you. I&apos;ll get back to you soon.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-4 font-mono text-[11px] uppercase tracking-wider text-(--muted-foreground) hover:text-(--foreground)"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border border-(--line) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--foreground)"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-(--line) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--foreground)"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">
                      Subject
                    </label>
                    <select
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full border border-(--line) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--foreground)"
                    >
                      <option value="">Select a topic</option>
                      <option value="project">Project Inquiry</option>
                      <option value="collaboration">Collaboration</option>
                      <option value="hiring">Hiring</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full resize-none border border-(--line) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--foreground)"
                      placeholder="Tell me about your project..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submit.isPending}
                    className="inline-flex items-center gap-2 border border-(--line) bg-(--foreground) px-5 py-2 text-sm font-medium text-(--background) transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="size-3.5" />
                    {submit.isPending ? "Sending…" : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {/* Social Links */}
            <div className="px-4 py-6 sm:px-5">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">
                Connect
              </h2>
              {socialsQuery.isLoading ? (
                <ContactSocialsSkeleton />
              ) : (
                <div className="mt-4 space-y-3">
                  {socials.map((social) => (
                    <a
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between border-b border-(--line) pb-3 text-sm text-(--muted-foreground) transition-colors hover:text-(--foreground)"
                    >
                      <span>{social.label}</span>
                      <span className="font-mono text-[11px]">{social.detail ?? ""}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-8">
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-(--muted-foreground)">
                  Availability
                </h2>
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
