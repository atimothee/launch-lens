import type { VoiceBackend, VoiceCallbacks } from "./types";

/**
 * Gemini Live voice backend — SCAFFOLD.
 *
 * Gemini's Live API is a bidirectional WebSocket that streams audio both
 * directions in real time, with the model handling VAD + turn-taking. Wiring
 * it up properly requires:
 *
 *   1. A short-lived client token minted server-side (so we don't ship the
 *      raw API key to the browser).
 *   2. Capturing the mic via MediaStream → encoding to 16-bit PCM at the
 *      model's required sample rate (usually 16kHz).
 *   3. Sending audio frames over WS; receiving PCM back and playing through
 *      an AudioContext.
 *   4. Relaying the model's server-side transcript back into onTranscript
 *      so we can save both sides to Supabase.
 *
 * None of that is wired up here. This file exists so the abstraction is in
 * place the day you're ready to flip it on. Today it throws — the controller
 * falls back to the browser backend.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/live
 */
export function createGeminiLiveBackend(_cb: VoiceCallbacks): VoiceBackend {
  throw new Error(
    "Gemini Live is not wired up yet. Set up a server-side token endpoint + audio plumbing first.",
  );
}
