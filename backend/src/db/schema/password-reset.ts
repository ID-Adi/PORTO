import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Maps a 6-digit verification code to a better-auth password reset token.
 *
 * Flow:
 * 1. User requests reset → backend calls better-auth forgetPassword →
 *    receives a reset token, generates a 6-digit code, stores both here.
 * 2. User enters the 6-digit code → backend looks up the matching token.
 * 3. User submits new password → backend uses the token with better-auth
 *    resetPassword to complete the password change.
 */
export const passwordResetCode = pgTable("password_reset_code", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  /** 6-digit numeric code shown to the user. */
  code: text("code").notNull(),
  /** The better-auth reset token that actually authorises the password change. */
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
