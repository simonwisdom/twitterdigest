import { head, put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

// JSON key-value storage. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
// otherwise a local .data/ directory (dev / mock runs need no credentials).
export interface Storage {
  getJson<T>(key: string): Promise<T | null>;
  putJson(key: string, data: unknown): Promise<void>;
  exists(key: string): Promise<boolean>;
}

class BlobStorage implements Storage {
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const meta = await head(key);
      const res = await fetch(meta.url, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async putJson(key: string, data: unknown): Promise<void> {
    await put(key, JSON.stringify(data, null, 1), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await head(key);
      return true;
    } catch {
      return false;
    }
  }
}

class LocalStorage implements Storage {
  constructor(private root: string) {}

  private filePath(key: string): string {
    return path.join(this.root, key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(this.filePath(key), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async putJson(key: string, data: unknown): Promise<void> {
    const fp = this.filePath(key);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, JSON.stringify(data, null, 1), "utf8");
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.filePath(key));
      return true;
    } catch {
      return false;
    }
  }
}

export function createStorage(): Storage {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new BlobStorage();
  return new LocalStorage(path.join(process.cwd(), ".data"));
}

// Key scheme
export const digestKey = (date: string) => `digests/${date}.json`;
export const indexKey = () => `digests/index.json`;
export const stageKey = (date: string, theme: string, stage: string) =>
  `pipeline/${date}/${theme}/${stage}.json`;
