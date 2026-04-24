import Anthropic from "@anthropic-ai/sdk";

/**
 * Model IDs.
 *
 * Overridable via env so you can point the stack at a different model (or a
 * compatible router like llm.kyle.pub which serves GLM models over the
 * Anthropic-compatible protocol).
 *
 * Defaults map to GLM when running against the configured router. Set
 * CLAUDE_MODEL_WORKHORSE / CLAUDE_MODEL_SYNTHESIS to override (e.g. to
 * claude-sonnet-4-6 / claude-opus-4-7 if pointing at api.anthropic.com).
 */
export const MODELS = {
  workhorse: process.env.CLAUDE_MODEL_WORKHORSE || "glm-4.7",
  synthesis: process.env.CLAUDE_MODEL_SYNTHESIS || "glm-5",
} as const;

let _client: Anthropic | null = null;

export function anthropic() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      ...(process.env.ANTHROPIC_BASE_URL
        ? { baseURL: process.env.ANTHROPIC_BASE_URL }
        : {}),
    });
  }
  return _client;
}

/**
 * Ask Claude for a strict JSON response. We don't rely on response_format —
 * we instruct the model to return a single JSON block and parse it out.
 */
export async function claudeJSON<T>(opts: {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const res = await anthropic().messages.create({
    model: opts.model ?? MODELS.workhorse,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  return parseJSON<T>(text);
}

function parseJSON<T>(raw: string): T {
  // Strip code fences if present.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: grab the first {...} or [...] block.
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) throw new Error(`Claude did not return JSON: ${raw.slice(0, 200)}`);
    return JSON.parse(match[1]) as T;
  }
}

export async function* streamText(opts: {
  model?: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}): AsyncGenerator<string> {
  const stream = anthropic().messages.stream({
    model: opts.model ?? MODELS.workhorse,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: opts.messages,
  });
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
