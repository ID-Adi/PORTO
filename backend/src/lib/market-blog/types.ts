import { z } from "zod";

/**
 * Schema input + tipe untuk runtime MCP market-blog (saham & crypto).
 * Sengaja dipisah dari MCP domain agar bisa dipakai ulang oleh tRPC/cron nanti.
 */

export const MARKET_TIMEFRAMES = ["daily", "weekly", "monthly"] as const;
export const MARKET_LANGUAGES = ["id", "en"] as const;
export const MARKET_TONES = ["editorial", "technical", "beginner"] as const;
export const STOCK_MARKETS = ["IDX", "US"] as const;

export type MarketTimeframe = (typeof MARKET_TIMEFRAMES)[number];
export type MarketLanguage = (typeof MARKET_LANGUAGES)[number];
export type MarketTone = (typeof MARKET_TONES)[number];
export type StockMarket = (typeof STOCK_MARKETS)[number];

/**
 * Disclaimer wajib di setiap draft pasar — edukasi, bukan rekomendasi.
 * Bilingual agar konten konsisten dengan `language`.
 */
export const MARKET_DISCLAIMER: Record<MarketLanguage, string> = {
  id: "Konten ini bersifat edukasi dan informasi, bukan rekomendasi investasi atau ajakan membeli/menjual aset.",
  en: "This content is for education and information only, not investment advice or a solicitation to buy/sell any asset.",
};

// Shape mentah (sebelum refine) — dipakai langsung sebagai MCP inputSchema.
export const stockDraftShape = {
  topic: z.string().trim().optional(),
  ticker: z.string().trim().optional(),
  market: z.enum(STOCK_MARKETS).optional(),
  timeframe: z.enum(MARKET_TIMEFRAMES).optional(),
  language: z.enum(MARKET_LANGUAGES).optional(),
  tone: z.enum(MARKET_TONES).optional(),
  sources: z.array(z.string().trim().min(1)).optional(),
};

export const cryptoDraftShape = {
  topic: z.string().trim().optional(),
  asset: z.string().trim().optional(),
  chain: z.string().trim().optional(),
  timeframe: z.enum(MARKET_TIMEFRAMES).optional(),
  language: z.enum(MARKET_LANGUAGES).optional(),
  tone: z.enum(MARKET_TONES).optional(),
  sources: z.array(z.string().trim().min(1)).optional(),
};

// Guard input minimum: saham butuh topic ATAU ticker; crypto butuh topic ATAU asset.
export const StockDraftInputSchema = z
  .object(stockDraftShape)
  .refine((value) => Boolean(value.topic?.length || value.ticker?.length), {
    message: "Minimal salah satu dari `topic` atau `ticker` wajib diisi.",
    path: ["topic"],
  });

export const CryptoDraftInputSchema = z
  .object(cryptoDraftShape)
  .refine((value) => Boolean(value.topic?.length || value.asset?.length), {
    message: "Minimal salah satu dari `topic` atau `asset` wajib diisi.",
    path: ["topic"],
  });

export type StockDraftInput = z.infer<typeof StockDraftInputSchema>;
export type CryptoDraftInput = z.infer<typeof CryptoDraftInputSchema>;

/**
 * Shape untuk tool harian saham berbasis AI agent (`blog_propose_stock_daily`).
 * Berbeda dari generator deterministik: `content` markdown penuh dikirim dari
 * runtime AI (boleh tabel GFM), backend hanya menyimpan + meng-enqueue approval.
 */
export const stockDailyShape = {
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  content: z.string().trim().min(1),
  marketDate: z.string().trim().min(1),
  assets: z.array(z.string().trim().min(1)).optional(),
  sources: z.array(z.string().trim().min(1)).optional(),
  sourceRuntime: z.string().trim().optional(),
};

export const StockDailyInputSchema = z.object(stockDailyShape);
export type StockDailyInput = z.infer<typeof StockDailyInputSchema>;

/**
 * Shape untuk tool harian crypto berbasis AI agent (`blog_propose_crypto_daily`).
 * Paralel dengan stock daily: `content` markdown penuh dari AI (boleh tabel GFM),
 * backend hanya menormalkan + meng-enqueue approval. Kategori hasil: `crypto`.
 */
export const cryptoDailyShape = {
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  content: z.string().trim().min(1),
  marketDate: z.string().trim().min(1),
  assets: z.array(z.string().trim().min(1)).optional(),
  sources: z.array(z.string().trim().min(1)).optional(),
  sourceRuntime: z.string().trim().optional(),
};

export const CryptoDailyInputSchema = z.object(cryptoDailyShape);
export type CryptoDailyInput = z.infer<typeof CryptoDailyInputSchema>;

export const submitForApprovalShape = {
  draftId: z.string().trim().min(1),
  note: z.string().trim().optional(),
};

export const approvalStatusShape = {
  draftId: z.string().trim().min(1),
};

// Status approval yang diekspos ke MCP client (state machine plan).
export const MARKET_APPROVAL_STATUSES = [
  "pending_approval",
  "approved",
  "rejected",
  "published",
] as const;
export type MarketApprovalStatus = (typeof MARKET_APPROVAL_STATUSES)[number];

export type MarketDraftType = "stock" | "crypto";

export type MarketSourceMetadata = {
  tool: string;
  generatedAt: string;
  type: MarketDraftType;
  timeframe: MarketTimeframe;
  language: MarketLanguage;
  tone: MarketTone;
  ticker?: string;
  market?: StockMarket;
  asset?: string;
  chain?: string;
  sources: string[];
  disclaimer: string;
  // Field opsional khusus runtime AI harian (`blog_propose_stock_daily`).
  sourceRuntime?: string;
  assets?: string[];
  marketDate?: string;
};

/**
 * Bentuk draft blog yang dihasilkan generator. Field inti (title..publishedAt)
 * kompatibel dengan `blogDraftPayload` di mcp-action-executor sehingga approval
 * existing bisa langsung memproses tanpa perubahan executor.
 */
export type MarketBlogDraft = {
  title: string;
  slug: string;
  description: string;
  content: string;
  meta: string;
  category: "saham" | "crypto";
  coverUrl: null;
  published: false;
  publishedAt: null;
  summary: string;
  sourceMetadata: MarketSourceMetadata;
};
