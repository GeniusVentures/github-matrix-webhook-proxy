// src/types.ts
export interface Env {
  MATRIX_TOKEN: string;
  MATRIX_ROOM_ID: string;
  GITHUB_WEBHOOK_SECRET: string;
}

export interface MatrixMessage {
  msgtype: string;
  body: string;
  format?: string;
  formatted_body?: string;
  external_url?: string;
}

export interface EventConfig {
  emoji: string;
  template: string;
  htmlTemplate?: string;
  useRepoUrl?: boolean;
  simple?: boolean; // For text-only messages like labels
}

export type EventMap = Record<string, EventConfig>;
export type EventHandler = (payload: any, action: string) => MatrixMessage | null;
export type EventActionMap = Record<string, EventMap | EventHandler>;