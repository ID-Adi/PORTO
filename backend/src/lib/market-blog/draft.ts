import {
  MARKET_DISCLAIMER,
  type CryptoDailyInput,
  type CryptoDraftInput,
  type MarketBlogDraft,
  type MarketLanguage,
  type MarketTimeframe,
  type MarketTone,
  type StockDailyInput,
  type StockDraftInput,
} from "./types.js";

/**
 * Generator draft pasar berbasis template deterministic. Tidak memanggil API
 * harga eksternal (lihat guard di plan: hindari klaim harga real-time bila sumber
 * tidak tersedia) — fokus menyusun kerangka editorial + metadata + disclaimer.
 */

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function todayIso() {
  // YYYY-MM-DD untuk slug & metadata; UTC agar konsisten lintas runtime/cron.
  return new Date().toISOString().slice(0, 10);
}

const TIMEFRAME_LABEL: Record<MarketLanguage, Record<MarketTimeframe, string>> = {
  id: { daily: "harian", weekly: "mingguan", monthly: "bulanan" },
  en: { daily: "daily", weekly: "weekly", monthly: "monthly" },
};

const TONE_INTRO: Record<MarketLanguage, Record<MarketTone, string>> = {
  id: {
    editorial:
      "Ulasan editorial ringkas untuk membantu pembaca memahami konteks pasar.",
    technical:
      "Catatan teknis terstruktur untuk pembaca yang terbiasa dengan analisis pasar.",
    beginner:
      "Penjelasan sederhana yang ramah bagi pembaca yang baru mengenal pasar.",
  },
  en: {
    editorial:
      "A concise editorial overview to help readers understand the market context.",
    technical:
      "Structured technical notes for readers familiar with market analysis.",
    beginner:
      "A simple, beginner-friendly explanation of the market situation.",
  },
};

const SECTION: Record<
  MarketLanguage,
  {
    snapshot: string;
    context: string;
    watch: string;
    risk: string;
    sources: string;
    instrument: string;
    scope: string;
    horizon: string;
    watchItems: string[];
    noSources: string;
  }
> = {
  id: {
    snapshot: "Ringkasan",
    context: "Konteks",
    watch: "Poin Pemantauan",
    risk: "Catatan Risiko",
    sources: "Sumber",
    instrument: "Instrumen",
    scope: "Pasar / Chain",
    horizon: "Kerangka waktu",
    watchItems: [
      "Sentimen dan arah tren pada kerangka waktu yang dipilih.",
      "Level support / resistance atau area harga penting yang relevan.",
      "Katalis fundamental (berita, rilis data, atau peristiwa on-chain).",
      "Manajemen risiko: ukuran posisi dan rencana keluar.",
    ],
    noSources:
      "Belum ada sumber data yang dilampirkan. Verifikasi angka dan klaim sebelum publikasi.",
  },
  en: {
    snapshot: "Snapshot",
    context: "Context",
    watch: "What to Watch",
    risk: "Risk Notes",
    sources: "Sources",
    instrument: "Instrument",
    scope: "Market / Chain",
    horizon: "Timeframe",
    watchItems: [
      "Sentiment and trend direction on the selected timeframe.",
      "Key support / resistance or notable price areas.",
      "Fundamental catalysts (news, data releases, or on-chain events).",
      "Risk management: position sizing and an exit plan.",
    ],
    noSources:
      "No data sources attached yet. Verify figures and claims before publishing.",
  },
};

type CommonBuild = {
  topic?: string;
  timeframe: MarketTimeframe;
  language: MarketLanguage;
  tone: MarketTone;
  sources: string[];
};

function buildTitle(
  language: MarketLanguage,
  instrument: string,
  scope: string,
  timeframeLabel: string,
  topic: string | undefined,
  kind: "saham" | "crypto",
) {
  if (topic && topic.length > 0) return topic;
  const subject = kind === "saham" ? "Saham" : "Crypto";
  const subjectEn = kind === "saham" ? "Stock" : "Crypto";
  if (language === "id") {
    return `Analisis ${subject} ${instrument} (${scope}) — ${timeframeLabel}`;
  }
  return `${subjectEn} Analysis: ${instrument} (${scope}) — ${timeframeLabel}`;
}

function buildContent(args: {
  language: MarketLanguage;
  tone: MarketTone;
  title: string;
  disclaimer: string;
  instrument: string;
  scope: string;
  timeframeLabel: string;
  topic: string | undefined;
  sources: string[];
}) {
  const s = SECTION[args.language];
  const intro = TONE_INTRO[args.language][args.tone];
  const contextBody =
    args.topic && args.topic.length > 0
      ? args.topic
      : intro;

  const sourcesBlock =
    args.sources.length > 0
      ? args.sources.map((src) => `- ${src}`).join("\n")
      : `- _${s.noSources}_`;

  return [
    `# ${args.title}`,
    "",
    `> ${args.disclaimer}`,
    "",
    intro,
    "",
    `## ${s.snapshot}`,
    "",
    `- **${s.instrument}:** ${args.instrument}`,
    `- **${s.scope}:** ${args.scope}`,
    `- **${s.horizon}:** ${args.timeframeLabel}`,
    "",
    `## ${s.context}`,
    "",
    contextBody,
    "",
    `## ${s.watch}`,
    "",
    s.watchItems.map((item) => `- ${item}`).join("\n"),
    "",
    `## ${s.risk}`,
    "",
    args.disclaimer,
    "",
    `## ${s.sources}`,
    "",
    sourcesBlock,
  ].join("\n");
}

function buildSummary(
  language: MarketLanguage,
  instrument: string,
  scope: string,
  timeframeLabel: string,
  topic: string | undefined,
) {
  if (topic && topic.length > 0) return topic.slice(0, 280);
  if (language === "id") {
    return `Tinjauan ${timeframeLabel} untuk ${instrument} (${scope}) — konteks, poin pemantauan, dan catatan risiko.`;
  }
  return `A ${timeframeLabel} review of ${instrument} (${scope}) — context, what to watch, and risk notes.`;
}

function buildMeta(tags: Array<string | undefined>) {
  return tags
    .filter((tag): tag is string => Boolean(tag && tag.length))
    .map((tag) => tag.toLowerCase())
    .join(", ");
}

function sourceHost(src: string): string {
  try {
    return new URL(src).host;
  } catch {
    return src.slice(0, 24);
  }
}

export function buildStockDraft(input: StockDraftInput): MarketBlogDraft {
  const timeframe: MarketTimeframe = input.timeframe ?? "weekly";
  const language: MarketLanguage = input.language ?? "id";
  const tone: MarketTone = input.tone ?? "technical";
  const market = input.market ?? "IDX";
  const sources = input.sources ?? [];
  const ticker = input.ticker?.toUpperCase();
  const instrument = ticker ?? input.topic ?? "—";

  return finalizeDraft({
    kind: "saham",
    type: "stock",
    tool: "market_blog_create_stock_draft",
    common: { topic: input.topic, timeframe, language, tone, sources },
    instrument,
    scope: market,
    slugParts: [ticker ?? input.topic ?? "saham", timeframe, market],
    extraMeta: [ticker, market],
    sourceMetadataExtra: { ticker, market },
  });
}

export function buildCryptoDraft(input: CryptoDraftInput): MarketBlogDraft {
  const timeframe: MarketTimeframe = input.timeframe ?? "weekly";
  const language: MarketLanguage = input.language ?? "id";
  const tone: MarketTone = input.tone ?? "technical";
  const sources = input.sources ?? [];
  const asset = input.asset?.toUpperCase();
  const chain = input.chain;
  const instrument = asset ?? input.topic ?? "—";
  const scope = chain ?? "Multi-chain";

  return finalizeDraft({
    kind: "crypto",
    type: "crypto",
    tool: "market_blog_create_crypto_draft",
    common: { topic: input.topic, timeframe, language, tone, sources },
    instrument,
    scope,
    slugParts: [asset ?? input.topic ?? "crypto", timeframe, chain],
    extraMeta: [asset, chain],
    sourceMetadataExtra: { asset, chain },
  });
}

function finalizeDraft(args: {
  kind: "saham" | "crypto";
  type: "stock" | "crypto";
  tool: string;
  common: CommonBuild;
  instrument: string;
  scope: string;
  slugParts: Array<string | undefined>;
  extraMeta: Array<string | undefined>;
  sourceMetadataExtra: Record<string, string | undefined>;
}): MarketBlogDraft {
  const { language, tone, timeframe, topic, sources } = args.common;
  const timeframeLabel = TIMEFRAME_LABEL[language][timeframe];
  const disclaimer = MARKET_DISCLAIMER[language];

  const title = buildTitle(
    language,
    args.instrument,
    args.scope,
    timeframeLabel,
    topic,
    args.kind,
  );
  const summary = buildSummary(
    language,
    args.instrument,
    args.scope,
    timeframeLabel,
    topic,
  );
  const content = buildContent({
    language,
    tone,
    title,
    disclaimer,
    instrument: args.instrument,
    scope: args.scope,
    timeframeLabel,
    topic,
    sources,
  });

  const slug = slugify([...args.slugParts, todayIso()].filter(Boolean).join("-"));
  const meta = buildMeta([
    args.kind,
    timeframe,
    language,
    ...args.extraMeta,
    ...sources.map(sourceHost),
  ]);

  const sourceMetadata = {
    tool: args.tool,
    generatedAt: new Date().toISOString(),
    type: args.type,
    timeframe,
    language,
    tone,
    sources,
    disclaimer,
    ...Object.fromEntries(
      Object.entries(args.sourceMetadataExtra).filter(
        ([, value]) => value !== undefined,
      ),
    ),
  } as MarketBlogDraft["sourceMetadata"];

  return {
    title,
    slug,
    description: summary.slice(0, 180),
    content,
    meta,
    category: "saham_crypto",
    coverUrl: null,
    published: false,
    publishedAt: null,
    summary,
    sourceMetadata,
  };
}

/**
 * Builder draft harian berbasis AI agent (saham/crypto). Berbeda dari builder
 * deterministik (`buildStockDraft`/`buildCryptoDraft` — template kosong): di sini
 * `content` markdown penuh datang dari runtime AI. Backend hanya menormalkan —
 * pastikan heading judul, disclaimer, dan blok Sumber selalu hadir, lalu menyusun
 * metadata. Tabel GFM dibiarkan apa adanya (frontend render via remark-gfm).
 */
function buildDailyDraft(
  input: StockDailyInput | CryptoDailyInput,
  opts: {
    kind: "saham" | "crypto";
    type: "stock" | "crypto";
    tool: string;
    scope: { market?: "IDX" | "US"; chain?: string };
  },
): MarketBlogDraft {
  const language: MarketLanguage = "id";
  const disclaimer = MARKET_DISCLAIMER[language];
  const sources = input.sources ?? [];
  const assets = (input.assets ?? []).map((a) => a.toUpperCase());

  let content = input.content.trim();

  // Pastikan heading judul ada di awal.
  if (!/^#\s+/m.test(content.split("\n", 1)[0] ?? "")) {
    content = `# ${input.title}\n\n${content}`;
  }
  // Pastikan disclaimer hadir (blockquote) bila belum disebut.
  if (!content.includes(disclaimer)) {
    const lines = content.split("\n");
    const headIdx = lines.findIndex((l) => /^#\s+/.test(l));
    const insertAt = headIdx >= 0 ? headIdx + 1 : 0;
    lines.splice(insertAt, 0, "", `> ${disclaimer}`);
    content = lines.join("\n");
  }
  // Pastikan blok Sumber hadir bila ada sources tapi belum dirender.
  if (sources.length > 0 && !/^##\s+Sumber\s*$/m.test(content)) {
    const block = sources.map((src) => `- ${src}`).join("\n");
    content = `${content.trimEnd()}\n\n## Sumber\n\n${block}`;
  }

  const slug = slugify(`${opts.kind}-${input.marketDate}-${input.title}`);
  const meta = buildMeta([
    opts.kind,
    "daily",
    input.marketDate,
    ...assets.slice(0, 6),
    ...sources.map(sourceHost),
  ]);

  const sourceMetadata = {
    tool: opts.tool,
    generatedAt: new Date().toISOString(),
    type: opts.type,
    timeframe: "daily" as const,
    language,
    tone: "technical" as const,
    ...(opts.scope.market ? { market: opts.scope.market } : {}),
    ...(opts.scope.chain ? { chain: opts.scope.chain } : {}),
    sources,
    disclaimer,
    ...(input.sourceRuntime ? { sourceRuntime: input.sourceRuntime } : {}),
    ...(assets.length ? { assets } : {}),
    marketDate: input.marketDate,
  } as MarketBlogDraft["sourceMetadata"];

  return {
    title: input.title,
    slug,
    description: input.summary.slice(0, 180),
    content,
    meta,
    category: "saham_crypto",
    coverUrl: null,
    published: false,
    publishedAt: null,
    summary: input.summary,
    sourceMetadata,
  };
}

export function buildStockDailyDraft(input: StockDailyInput): MarketBlogDraft {
  return buildDailyDraft(input, {
    kind: "saham",
    type: "stock",
    tool: "blog_propose_stock_daily",
    scope: { market: "IDX" },
  });
}

export function buildCryptoDailyDraft(input: CryptoDailyInput): MarketBlogDraft {
  return buildDailyDraft(input, {
    kind: "crypto",
    type: "crypto",
    tool: "blog_propose_crypto_daily",
    scope: { chain: "Multi-chain" },
  });
}
