export interface VoiceCaption {
  id: string;
  role: "agent" | "user";
  text: string;
}

export interface VoiceAgent {
  name: string;
  /** An emoji or an image URL. Falls back to a bot icon. */
  avatar?: string;
  /** For example the agent's role. */
  subtitle?: string;
}
