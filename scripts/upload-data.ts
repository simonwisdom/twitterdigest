// Upload the local .data/ store into Vercel Blob (one-way sync). Useful for
// seeding production with digests generated locally.
//
//   npx tsx scripts/upload-data.ts
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.name.endsWith(".json")) out.push(p);
  }
  return out;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN not set");
  }
  const root = path.join(process.cwd(), ".data");
  const files = await walk(root);
  for (const file of files) {
    const key = path.relative(root, file).split(path.sep).join("/");
    await put(key, await fs.readFile(file, "utf8"), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    console.log(`uploaded ${key}`);
  }
  console.log(`done: ${files.length} files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
