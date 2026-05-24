/**
 * URL base backend (Hono di VPS, dev: localhost:4001).
 * Sumber tunggal — sebelumnya pola `process.env.NEXT_PUBLIC_BACKEND_URL ??
 * "http://localhost:4001"` di-duplicate di `auth-client.ts`,
 * `trpc-provider.tsx`, dan dua admin upload consumers.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";
