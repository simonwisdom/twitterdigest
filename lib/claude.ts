import Anthropic from "@anthropic-ai/sdk";

export const MODEL_FAST = "claude-haiku-4-5"; // bulk classification / labeling
export const MODEL_SMART = "claude-sonnet-5"; // summaries, label merging

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

class MockLlm implements LlmClient {
  async json<T>(req: LlmRequest<T>): Promise<T> {
    if (!req.mock) {
      throw new Error("Mock LLM: call site provided no mock() implementation");
    }
    return req.mock();
  }
}

class AnthropicLlm implements LlmClient {
  private client = new Anthropic();

  async json<T>(req: LlmRequest<T>): Promise<T> {
    const attempt = async (extra: string): Promise<T> => {
      const response = await this.client.messages.create({
        model: req.model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: [{ role: "user", content: req.prompt + extra }],
      });
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") {
        throw new Error("No text block in LLM response");
      }
      return parseJson<T>(block.text);
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
  return opts?.mock ? new MockLlm() : new AnthropicLlm();
}
