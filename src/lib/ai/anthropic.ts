import Anthropic from "@anthropic-ai/sdk";
import type { GenerateArgs } from "./types";

const ANTHROPIC_MODELS = {
  workhorse: process.env.CLAUDE_MODEL_WORKHORSE || "glm-4.7",
  synthesis: process.env.CLAUDE_MODEL_SYNTHESIS || "glm-5",
} as const;

let _client: Anthropic | null = null;

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function anthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
    });
  }
  return _client;
}

function pickModel(tier?: "workhorse" | "synthesis") {
  return ANTHROPIC_MODELS[tier ?? "workhorse"];
}

export async function anthropicJSON<T>(args: GenerateArgs): Promise<{ model: string; value: T }> {
  const client = anthropicClient();
  const model = pickModel(args.tier);
  const res = await client.messages.create({
    model,
    max_tokens: args.maxTokens ?? 4096,
    system: args.system,
    messages:
      args.messages?.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })) ?? [{ role: "user", content: args.user ?? "" }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  const value = parseJSON<T>(text);
  return { model, value };
}

export async function* anthropicStream(args: GenerateArgs): AsyncGenerator<string> {
  const client = anthropicClient();
  const model = pickModel(args.tier);
  const stream = client.messages.stream({
    model,
    max_tokens: args.maxTokens ?? 1024,
    system: args.system,
    messages:
      args.messages?.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })) ?? [{ role: "user", content: args.user ?? "" }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) throw new Error(`Anthropic did not return JSON: ${raw.slice(0, 200)}`);
    return JSON.parse(match[1]) as T;
  }
}
