import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());

const envSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  HOST_PASSWORD: optionalString,
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalEmail,
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_FROM_PHONE: optionalString,
  GOOGLE_SHEETS_ID: optionalString,
  GOOGLE_SHEETS_GID: optionalString,
  GOOGLE_SHEETS_TAB: optionalString,
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: optionalString,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: optionalEmail,
  GOOGLE_PRIVATE_KEY: optionalString,
  ALLOW_LOCAL_SHEET_MUTATION: z
    .preprocess((value) => value === "true" || value === "1", z.boolean())
    .default(false),
});

export const env = envSchema.parse({
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  HOST_PASSWORD: process.env.HOST_PASSWORD,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_FROM_PHONE: process.env.TWILIO_FROM_PHONE,
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
  GOOGLE_SHEETS_GID: process.env.GOOGLE_SHEETS_GID,
  GOOGLE_SHEETS_TAB: process.env.GOOGLE_SHEETS_TAB,
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  ALLOW_LOCAL_SHEET_MUTATION: process.env.ALLOW_LOCAL_SHEET_MUTATION,
});

export function hasSupabaseConfig() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasResendConfig() {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}

export function hasTwilioConfig() {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_PHONE);
}

export function hasGoogleSheetsConfig() {
  const hasSheetTarget = Boolean(
    env.GOOGLE_SHEETS_ID && (env.GOOGLE_SHEETS_TAB || env.GOOGLE_SHEETS_GID),
  );
  const hasCredentials = Boolean(
    env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
      (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY),
  );

  return hasSheetTarget && hasCredentials;
}

export function isLocalAppUrl() {
  return Boolean(
    env.APP_URL.includes("localhost") ||
      env.APP_URL.includes("127.0.0.1") ||
      env.APP_URL.includes("::1"),
  );
}
