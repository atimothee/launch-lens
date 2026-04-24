export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface GenerateArgs {
  system: string;
  user?: string;
  messages?: ChatMessage[];
  maxTokens?: number;
  /**
   * "workhorse" = fast + cheap, used for extraction + interview turns.
   * "synthesis" = heavier reasoning, used for final report synthesis.
   */
  tier?: "workhorse" | "synthesis";
}

export interface RoutedResponse<T> {
  provider: "openai";
  model: string;
  value: T;
}

export type ProviderLogger = (provider: "openai", model: string, action: string) => void;
