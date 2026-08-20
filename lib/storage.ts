import fs from "fs/promises";
import path from "path";

// JSON key-value storage. Local development defaults to .data/. The weekly
// GitHub Action sets DIGEST_DATA_DIR=data so durable digests/history can be
// committed while transient pipeline checkpoints remain gitignored.
export interface Storage {
  getJson<T>(key: string): Promise<T | null>;
  putJson(key: string, data: unknown): Promise<void>;
  exists(key: string): Promise<boolean>;
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
  const configured = process.env.DIGEST_DATA_DIR?.trim();
  const root = configured
    ? path.resolve(process.cwd(), configured)
    : path.join(process.cwd(), ".data");
  return new LocalStorage(root);
}

// Key scheme
export const digestKey = (date: string) => `digests/${date}.json`;
export const indexKey = () => `digests/index.json`;
export const stageKey = (date: string, theme: string, stage: string) =>
  `pipeline/${date}/${theme}/${stage}.json`;
export const historyKey = (scope: "live" | "fixtures", theme: string) =>
  `history/${scope}/${theme}.json`;
