import OpenAI from "openai";
import type { ChatMessage, GenerateArgs } from "./types";

const OPENAI_MODELS = {
  workhorse: process.env.OPENAI_MODEL_WORKHORSE || "gpt-4o",
  synthesis: process.env.OPENAI_MODEL_SYNTHESIS || "gpt-4o",
} as const;

let _client: OpenAI | null = null;

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function openaiClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
  }
  return _client;
}

function pickModel(tier?: "workhorse" | "synthesis") {
  return OPENAI_MODELS[tier ?? "workhorse"];
}

function buildMessages(args: GenerateArgs): ChatMessage[] {
  const msgs: ChatMessage[] = [{ role: "system", content: args.system }];
  if (args.messages) {
    msgs.push(...args.messages);
  } else if (args.user) {
    msgs.push({ role: "user", content: args.user });
  }
  return msgs;
}

export async function openaiJSON<T>(args: GenerateArgs): Promise<{ model: string; value: T }> {
  const client = openaiClient();
  const model = pickModel(args.tier);
  const res = await client.chat.completions.create({
    model,
    max_tokens: args.maxTokens ?? 4096,
    messages: buildMessages(args),
    response_format: { type: "json_object" },
  });
  const text = res.choices[0]?.message?.content ?? "";
  const value = parseJSON<T>(text);
  return { model, value };
}

export async function* openaiStream(args: GenerateArgs): AsyncGenerator<string> {
  const client = openaiClient();
  const model = pickModel(args.tier);
  const stream = await client.chat.completions.create({
    model,
    max_tokens: args.maxTokens ?? 1024,
    messages: buildMessages(args),
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
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
    if (!match) throw new Error(`OpenAI did not return JSON: ${raw.slice(0, 200)}`);
    return JSON.parse(match[1]) as T;
  }
}
