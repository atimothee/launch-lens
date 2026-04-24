/**
 * OpenAI entry point for AI calls.
 *
 * Policy:
 *   1. Require OPENAI_API_KEY.
 *   2. Log the model used for each request.
 */

import { openaiJSON, openaiStream, isOpenAIConfigured } from "./openai";
import type { GenerateArgs, RoutedResponse } from "./types";

function log(model: string, action: string) {
  const provider = "openai";
  console.log(`[ai] ${action} via ${provider} (${model})`);
}

export async function generateJSON<T>(args: GenerateArgs): Promise<RoutedResponse<T>> {
  if (!isOpenAIConfigured()) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const { value, model } = await openaiJSON<T>(args);
  log(model, "generateJSON");
  return { provider: "openai", model, value };
}

export async function* generateStream(
  args: GenerateArgs,
): AsyncGenerator<string> {
  if (!isOpenAIConfigured()) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  let started = false;
  for await (const chunk of openaiStream(args)) {
    if (!started) {
      started = true;
      log("(streaming)", "generateStream");
    }
    yield chunk;
  }
}
