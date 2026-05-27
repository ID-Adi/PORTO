# Plan: Change Password Flow dengan Mailcow Email

**Tanggal:** 2026-05-27  
**Goal:** Implementasi multi-step change password flow dengan verifikasi kode via email Mailcow.

---

## 1. Current State (Hasil Inspeksi)

### Login Page (`/login`)
- File: `frontend/src/app/(admin)/login/page.tsx`
- Menggunakan `better-auth/react` (`authClient.signIn.email`)
- Sudah ada link "Change password" (baris 89-97) tapi hanya menampilkan toast placeholder: `"Change password will be available soon"`
- Styling: monokrom, thin border, monospace font, uppercase tracking — konsisten dengan PORTO design system

### Backend Auth
- File: `backend/src/auth/index.ts`
- better-auth v1.6.9 dengan drizzle adapter (PostgreSQL)
- Plugin aktif: `emailAndPassword`
- Belum ada email sending (tidak ada nodemailer / SMTP config)

### Database Schema
- File: `backend/src/db/schema/auth.ts`
- Tabel existing: `user`, `session`, `account`, `verification`
- Tabel `verification` digunakan oleh better-auth untuk email verification + password reset token

### Middleware
- File: `frontend/middleware.ts`
- Protect `/admin/:path*` dan `/tools/:path*` (tidak protect `/change-password` karena user belum login)

---

## 2. Flow yang Diinginkan

```
Login Page → Klik "Change password"
    → Page 1: /change-password (input email)
        → POST /api/auth/send-reset-code
        → Backend generate kode 6-digit, simpan, kirim email via Mailcow
    → Page 2: /change-password/verify (input kode)
        → POST /api/auth/verify-reset-code
        → Verifikasi kode, return reset token
    → Page 3: /change-password/new (input new password + confirm)
        → POST /api/auth/reset-password-code
        → Reset password via better-auth
        → Kirim email konfirmasi ke user
    → Success page / redirect ke login dengan toast
```

---

## 3. Rencana Implementasi

### Phase A: Backend — Email Infrastructure

#### A1. Install nodemailer
```bash
cd backend && pnpm add nodemailer && pnpm add -D @types/nodemailer
```

#### A2. Tambah env vars ke `.env` dan `.env.example`
```env
# Mailcow SMTP
SMTP_HOST=smtp.pawa.my.id
SMTP_PORT=587
SMTP_USER=noreply@pawa.my.id
SMTP_PASS=your-smtp-password
SMTP_FROM="PORTO <noreply@pawa.my.id>"
```

#### A3. Buat mailer utility
**File:** `backend/src/lib/mailer.ts`
- Export `sendMail({ to, subject, text })` function
- Gunakan nodemailer dengan SMTP transport ke Mailcow
- Logging basic untuk debug

### Phase B: Backend — Password Reset Logic

#### B1. Buat tabel `password_reset_code` (Drizzle migration)
**File:** `backend/src/db/schema/password-reset.ts`
```ts
export const passwordResetCode = pgTable("password_reset_code", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),         // 6-digit numeric
  token: text("token").notNull(),       // better-auth reset token
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

#### B2. Buat custom routes untuk password reset
**File:** `backend/src/routes/password-reset.ts`

Tiga endpoint:

**`POST /api/auth/send-reset-code`**
- Body: `{ email: string }`
- Validasi: cek user exists di DB
- Panggil better-auth internal `forgetPassword` untuk generate token
- Generate 6-digit code (`crypto.randomInt(100000, 999999).toString()`)
- Simpan mapping (code, token, email, expiresAt) ke `password_reset_code`
- Kirim email via `sendMail()` dengan subject + code
- Return: `{ success: true, message: "Kode verifikasi telah dikirim ke email Anda" }`

**`POST /api/auth/verify-reset-code`**
- Body: `{ email: string, code: string }`
- Lookup di `password_reset_code` where email + code + used=false + expiresAt > now
- Jika valid: mark `used = true`, return `{ success: true, token }`
- Jika invalid/expired: return `{ error: "Kode tidak valid atau sudah kadaluarsa" }`

**`POST /api/auth/reset-password-code`**
- Body: `{ token: string, newPassword: string }`
- Panggil better-auth `resetPassword` API dengan token + newPassword
- Jika sukses: kirim email konfirmasi ke user
- Return: `{ success: true, message: "Password berhasil diubah" }`

#### B3. Update backend `index.ts`
```ts
import { passwordResetRoute } from "./routes/password-reset.js";
app.route("/api/auth", passwordResetRoute);
```

#### B4. Run DB migration
```bash
cd backend && pnpm db:generate && pnpm db:migrate
```

### Phase C: Frontend — Change Password Pages

#### C1. Update login page "Change password" link
**File:** `frontend/src/app/(admin)/login/page.tsx` (baris 89-97)
- Ganti `toast.info("Change password will be available soon")` → `router.push("/change-password")`

#### C2. Buat layout shared untuk change-password pages
**File:** `frontend/src/app/(admin)/change-password/layout.tsx`
- Tanpa SiteHeader (karena user belum login)
- Tanpa proteksi middleware (biarkan `middleware.ts` matcher tidak include path ini)
- Layout grid minimalis konsisten dengan login page

#### C3. Page 1: Input Email
**File:** `frontend/src/app/(admin)/change-password/page.tsx`
- Komponen "use client"
- Field: email (Input, autoComplete="email")
- Button: "Send Verification Code"
- State: pending, error, success
- On success → simpan email ke state/URL → redirect ke `/change-password/verify?email=...`
- Styling: konsisten dengan login (border, monospace, uppercase, zinc palette)

#### C4. Page 2: Verify Code
**File:** `frontend/src/app/(admin)/change-password/verify/page.tsx`
- Komponen "use client"
- Field: 6-digit code (Input, maxLength=6, autoComplete="one-time-code")
- Read email dari searchParams
- Button: "Verify Code" + "Back" (kembali ke step 1)
- State: pending, error, success
- On success → simpan token → redirect ke `/change-password/new?token=...`
- Styling: konsisten

#### C5. Page 3: New Password
**File:** `frontend/src/app/(admin)/change-password/new/page.tsx`
- Komponen "use client"
- Fields: newPassword, confirmPassword (Input, type="password")
- Read token dari searchParams
- Validasi client-side: min 8 karakter, cocok
- Buttons: "Save" (submit) + "Cancel" (kembali ke /login)
- State: pending, error, success
- On success → toast success → redirect ke `/login?reset=success`
- Styling: konsisten

#### C6. Update login page untuk handle reset=success
- Jika `searchParams.get("reset") === "success"` → tampilkan toast success dan banner kecil di atas form

### Phase D: Update Middleware (jika perlu)
**File:** `frontend/middleware.ts`
- Pastikan path `/change-password` dan sub-pathnya TIDAK masuk matcher (agar public access tetap bisa)

---

## 4. Files yang Akan Diubah / Dibuat

### Backend (7 files)
| Action | File |
|--------|------|
| NEW | `backend/src/lib/mailer.ts` |
| NEW | `backend/src/db/schema/password-reset.ts` |
| NEW | `backend/src/routes/password-reset.ts` |
| EDIT | `backend/src/db/schema/index.ts` (export table baru) |
| EDIT | `backend/src/index.ts` (register route baru) |
| EDIT | `backend/.env.example` (SMTP vars) |
| MIGRATE | Drizzle auto-generate migration file |

### Frontend (7 files)
| Action | File |
|--------|------|
| EDIT | `frontend/src/app/(admin)/login/page.tsx` (ganti link change password) |
| NEW | `frontend/src/app/(admin)/change-password/layout.tsx` |
| NEW | `frontend/src/app/(admin)/change-password/page.tsx` (Step 1: input email) |
| NEW | `frontend/src/app/(admin)/change-password/verify/page.tsx` (Step 2: input code) |
| NEW | `frontend/src/app/(admin)/change-password/new/page.tsx` (Step 3: new password) |
| DECIDE | `frontend/middleware.ts` (pastikan change-password tidak diproteksi) |

---

## 5. Open Questions (Perlu Konfirmasi)

### Q1: Mailcow SMTP Configuration
Anda menyebut punya email Mailcow. Untuk mengirim email dari backend perlu:

- **SMTP_HOST** — biasanya `smtp.pawa.my.id` atau domain Mailcow Anda
- **SMTP_PORT** — biasanya `587` (STARTTLS) atau `465` (SSL)
- **SMTP_USER** — alamat email pengirim (contoh: `noreply@pawa.my.id`)
- **SMTP_PASS** — password / app password email tersebut
- **SMTP_FROM** — display name + email pengirim

Apakah Anda sudah memiliki kredensial SMTP Mailcow? Jika belum, perlu dibuatkan mailbox khusus (misal `noreply@pawa.my.id`) di dashboard Mailcow.

### Q2: Format Kode Verifikasi
Saya rencanakan **6-digit numeric** (000000–999999). Apakah format ini cukup, atau Anda mau format lain (misal: alphanumeric 8 karakter)?

### Q3: Pengiriman Password Baru via Email
Anda menyebut: "password baru akan dikirimkan ke email user tersebut". Ini perlu dicatat sebagai **security trade-off** — mengirim password dalam plaintext via email tidak ideal secara security best practice. Alternatif:
- Kirim hanya konfirmasi "Password Anda berhasil diubah" (tanpa menyertakan password)
- Atau tetap kirim password baru seperti yang Anda minta

Yang mana yang Anda pilih?

### Q4: Rate Limiting
Perlu ditambahkan rate limiting untuk endpoint `send-reset-code`? Misal: max 3 request per email per 10 menit.

### Q5: Expiry Kode Verifikasi
Berapa menit kode valid? Saya rencanakan **15 menit**.

---

## 6. Verifikasi Setelah Implementasi

```bash
# 1. Backend lint & typecheck
cd backend && npx tsc --noEmit

# 2. Frontend lint & build
pnpm --dir frontend lint
pnpm --dir frontend build

# 3. Jalankan backend
cd backend && pnpm dev

# 4. Jalankan frontend
pnpm dev:frontend

# 5. Test flow manual:
#    - Buka http://localhost:3001/login
#    - Klik "Change password"
#    - Masukkan email terdaftar
#    - Cek email (Mailcow inbox) untuk kode
#    - Masukkan kode
#    - Input password baru
#    - Cek email konfirmasi
#    - Login dengan password baru
```

---

## 7. Risks & Tradeoffs

1. **Security:** Mengirim password baru via email → plaintext risk. Sudah dicatat di Q3.
2. **SPAM:** Endpoint `send-reset-code` bisa di-spam. Rate limiting diperlukan (Q4).
3. **better-auth compatibility:** Pakai internal API better-auth untuk `forgetPassword` + `resetPassword`. Jika better-auth update major, perlu dicek ulang.
4. **Mailcow deliverability:** Pastikan SPF/DKIM/DMARC Mailcow sudah benar agar email tidak masuk spam.
5. **Change-password pages TIDAK diproteksi middleware** — ini disengaja karena user yang lupa password tidak bisa login. Halaman hanya bisa diakses dengan flow yang benar (email → code → token).