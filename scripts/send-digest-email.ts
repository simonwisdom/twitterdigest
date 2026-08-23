// Sends one generated digest through Resend.
//
//   DIGEST_DATA_DIR=data npm run email-digest -- --date 2026-08-24 --dry-run
//   npm run email-digest -- --date 2026-08-24
//
// Loads .env.local for local use; GitHub Actions supplies the same values as
// repository secrets. --dry-run renders and validates without needing them.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import {
  DEFAULT_DIGEST_SITE_URL,
  renderDigestEmail,
  sendEmailViaResend,
} from "@/lib/email";
import { createStorage, digestKey } from "@/lib/storage";
import { Digest } from "@/lib/types";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const flag = (name: string) => process.argv.includes(`--${name}`);

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to send the digest email`);
  return value;
}

async function main() {
  const date = arg("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date must use YYYY-MM-DD");
  }

  const digest = await createStorage().getJson<Digest>(digestKey(date));
  if (!digest) throw new Error(`No generated digest found for ${date}`);
  if (digest.date !== date || !digest.themes || typeof digest.themes !== "object") {
    throw new Error(`Digest data for ${date} is malformed`);
  }

  const email = renderDigestEmail(
    digest,
    process.env.DIGEST_SITE_URL?.trim() || DEFAULT_DIGEST_SITE_URL
  );
  if (flag("dry-run")) {
    console.log(
      `email dry run: subject=${JSON.stringify(email.subject)} htmlBytes=${Buffer.byteLength(email.html)} textBytes=${Buffer.byteLength(email.text)}`
    );
    return;
  }

  const recipients = requiredEnv("DIGEST_EMAIL_TO")
    .split(",")
    .map((emailAddress) => emailAddress.trim())
    .filter(Boolean);
  if (recipients.length === 0 || recipients.length > 50) {
    throw new Error("DIGEST_EMAIL_TO must contain between 1 and 50 addresses");
  }

  const result = await sendEmailViaResend(email, {
    apiKey: requiredEnv("RESEND_API_KEY"),
    from: requiredEnv("DIGEST_EMAIL_FROM"),
    to: recipients,
    idempotencyKey: `weekly-digest-${date}`,
  });
  console.log(
    `digest email sent: id=${result.id} recipients=${recipients.length} date=${date}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
