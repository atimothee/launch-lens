import type { VoiceBackend, VoiceCallbacks } from "./types";

// Minimal local typings for the Web Speech API (not in lib.dom yet).
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionResultEventLike {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
}

/**
 * Browser-native voice backend.
 *
 *   STT: Web Speech API (SpeechRecognition) — Chrome/Edge/Safari. On Firefox
 *        it silently no-ops because the constructor is undefined.
 *   TTS: SpeechSynthesis — universally supported.
 *
 * Quality is limited (single-turn, no barge-in, no real-time streaming) but
 * it works offline with zero config, which is what a fallback should do.
 */
export function createBrowserBackend(cb: VoiceCallbacks): VoiceBackend {
  const w =
    typeof window !== "undefined"
      ? (window as unknown as {
          SpeechRecognition?: new () => SpeechRecognitionLike;
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        })
      : null;
  const SpeechRecognitionCtor = w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null;

  if (!SpeechRecognitionCtor) {
    throw new Error(
      "Voice mode isn't supported in this browser. Try Chrome, Edge, or Safari.",
    );
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event: SpeechRecognitionResultEventLike) => {
    const transcript = Array.from(event.results)
      .map((r) => r[0]?.transcript ?? "")
      .join(" ")
      .trim();
    if (transcript) cb.onTranscript(transcript);
  };
  recognition.onerror = (e: { error?: string }) => {
    cb.onError?.(`recognition error: ${e.error ?? "unknown"}`);
  };

  return {
    kind: "browser",
    startListening() {
      try {
        recognition.start();
      } catch (err) {
        cb.onError?.(err instanceof Error ? err.message : String(err));
      }
    },
    stopListening() {
      try {
        recognition.stop();
      } catch {
        // Stopping when not started throws; ignore.
      }
    },
    async speak(text: string) {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      // Cancel any in-flight utterance so we don't queue endlessly.
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onstart = () => cb.onSpeakStart?.();
      u.onend = () => cb.onSpeakEnd?.();
      window.speechSynthesis.speak(u);
    },
    dispose() {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    },
  };
}
