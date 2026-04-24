export interface VoiceBackend {
  /** Begin listening for a single respondent utterance. */
  startListening(): void;
  /** Stop listening (user-initiated). */
  stopListening(): void;
  /** Speak the given text aloud. Returns when playback is queued/started. */
  speak(text: string): Promise<void>;
  /** Tear down any open resources. */
  dispose(): void;
  readonly kind: "browser" | "gemini-live";
}

export interface VoiceCallbacks {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}
