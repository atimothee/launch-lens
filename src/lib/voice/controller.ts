import { createBrowserBackend } from "./browser-fallback";
import { createGeminiLiveBackend } from "./gemini-live";
import type { VoiceBackend, VoiceCallbacks } from "./types";

/**
 * VoiceController picks a backend and forwards calls. Separating the factory
 * from the backend keeps components oblivious to which engine is running —
 * they just know "I have a voice controller."
 */
export class VoiceController {
  private constructor(private backend: VoiceBackend) {}

  static browser(cb: VoiceCallbacks): VoiceController {
    return new VoiceController(createBrowserBackend(cb));
  }

  /** Will throw until Gemini Live is wired up — today, use .browser(). */
  static geminiLive(cb: VoiceCallbacks): VoiceController {
    return new VoiceController(createGeminiLiveBackend(cb));
  }

  get kind() {
    return this.backend.kind;
  }

  startListening() {
    this.backend.startListening();
  }
  stopListening() {
    this.backend.stopListening();
  }
  speak(text: string) {
    return this.backend.speak(text);
  }
  dispose() {
    this.backend.dispose();
  }
}
