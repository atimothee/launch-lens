/**
 * Provider-agnostic entry point for AI calls.
 *
 * Policy:
 *   1. Try OpenAI if OPENAI_API_KEY is set.
 *   2. On any error (including rate limits), fall back to Anthropic (or the
 *      Anthropic-compatible router pointed to by ANTHROPIC_BASE_URL).
 *   3. Log which provider served the request so we can eyeball failovers.
 *
 * If you want to pin a single provider, set AI_PROVIDER=openai or =anthropic.
 */

import { anthropicJSON, anthropicStream, isAnthropicConfigured } from "./anthropic";
import { openaiJSON, openaiStream, isOpenAIConfigured } from "./openai";
import type { GenerateArgs, RoutedResponse } from "./types";

type Provider = "openai" | "anthropic";

function pinnedProvider(): Provider | null {
  const pin = process.env.AI_PROVIDER?.toLowerCase();
  if (pin === "openai" || pin === "anthropic") return pin;
  return null;
}

function preferenceOrder(): Provider[] {
  const pin = pinnedProvider();
  if (pin) return [pin];
  // Default preference: OpenAI first, then Anthropic-compatible.
  return ["openai", "anthropic"];
}

function isConfigured(p: Provider): boolean {
  return p === "openai" ? isOpenAIConfigured() : isAnthropicConfigured();
}

function log(provider: Provider, model: string, action: string) {
  console.log(`[ai] ${action} via ${provider} (${model})`);
}

export async function generateJSON<T>(args: GenerateArgs): Promise<RoutedResponse<T>> {
  const order = preferenceOrder();
  let firstError: unknown;
  for (const p of order) {
    if (!isConfigured(p)) continue;
    try {
      const { value, model } =
        p === "openai" ? await openaiJSON<T>(args) : await anthropicJSON<T>(args);
      log(p, model, "generateJSON");
      return { provider: p, model, value };
    } catch (err) {
      firstError ??= err;
      console.warn(
        `[ai] generateJSON failed on ${p} — falling back. Error: ${errorShort(err)}`,
      );
    }
  }
  throw new Error(
    `All AI providers failed. Last error: ${errorShort(firstError)}. ` +
      `Configure OPENAI_API_KEY or ANTHROPIC_API_KEY.`,
  );
}

export async function* generateStream(
  args: GenerateArgs,
): AsyncGenerator<string> {
  const order = preferenceOrder();
  let firstError: unknown;
  for (const p of order) {
    if (!isConfigured(p)) continue;
    try {
      // For streaming, we log at start and yield as we go. If the first token
      // fails, we fall back; if we fail mid-stream there's no good fallback.
      const gen =
        p === "openai" ? openaiStream(args) : anthropicStream(args);
      let started = false;
      for await (const chunk of gen) {
        if (!started) {
          started = true;
          log(p, "(streaming)", "generateStream");
        }
        yield chunk;
      }
      return;
    } catch (err) {
      firstError ??= err;
      console.warn(
        `[ai] generateStream failed on ${p} — falling back. Error: ${errorShort(err)}`,
      );
    }
  }
  throw new Error(
    `All AI providers failed for streaming. Last error: ${errorShort(firstError)}.`,
  );
}

function errorShort(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 240);
  return String(err).slice(0, 240);
}
