const DEFAULT_MODEL = "google/gemini-3.7-flash";

// OPENROUTER_MODEL changes every pipeline stage. The per-tier variables allow
// a different summarization model later without changing the code.
export const MODEL_FAST =
  process.env.OPENROUTER_MODEL_FAST ??
  process.env.OPENROUTER_MODEL ??
  DEFAULT_MODEL;
export const MODEL_SMART =
  process.env.OPENROUTER_MODEL_SMART ??
  process.env.OPENROUTER_MODEL ??
  DEFAULT_MODEL;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface LlmRequest<T> {
  model: string;
  system?: string;
  prompt: string;
  maxTokens: number;
  // Deterministic stand-in used in --mock runs (no API call, no key needed).
  mock?: () => T;
}

export interface LlmClient {
  json<T>(req: LlmRequest<T>): Promise<T>;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: { content?: string | null };
    error?: { code?: number; message?: string };
  }>;
  error?: { code?: number; message?: string };
}

class MockLlm implements LlmClient {
  async json<T>(req: LlmRequest<T>): Promise<T> {
    if (!req.mock) {
      throw new Error("Mock LLM: call site provided no mock() implementation");
    }
    return req.mock();
  }
}

class OpenRouterLlm implements LlmClient {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is not set. Create a key at https://openrouter.ai/keys and add it to .env.local"
      );
    }
    this.apiKey = apiKey;
  }

  async json<T>(req: LlmRequest<T>): Promise<T> {
    const attempt = async (extra: string): Promise<T> => {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: req.maxTokens,
          response_format: { type: "json_object" },
          messages: [
            ...(req.system
              ? [{ role: "system" as const, content: req.system }]
              : []),
            { role: "user" as const, content: req.prompt + extra },
          ],
        }),
      });

      const body = (await response.json()) as OpenRouterResponse;
      if (!response.ok || body.error) {
        const error = body.error;
        throw new Error(
          `OpenRouter ${error?.code ?? response.status}: ${error?.message ?? response.statusText}`
        );
      }

      const choice = body.choices?.[0];
      if (choice?.error) {
        throw new Error(
          `OpenRouter ${choice.error.code ?? "generation error"}: ${choice.error.message ?? "unknown error"}`
        );
      }
      const text = choice?.message?.content;
      if (!text) throw new Error("OpenRouter response contained no text");
      return parseJson<T>(text);
    };

    try {
      return await attempt("");
    } catch {
      return await attempt(
        "\n\nYour previous attempt was not valid JSON. Respond with ONLY valid JSON, no prose, no code fences."
      );
    }
  }
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]) as T;
}

export function createLlm(opts?: { mock?: boolean }): LlmClient {
  return opts?.mock ? new MockLlm() : new OpenRouterLlm();
}
