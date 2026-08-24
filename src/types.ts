export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  standardDescription?: string;
  foundInKB?: "Да" | "Нет" | "Частично";
  durationSeconds?: number;
  logId?: string;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  pinned?: boolean;
}

export interface KnowledgeBaseStats {
  headers: string[];
  rowsCount: number;
  sampleRows: Record<string, string>[];
  allRows: Record<string, string>[];
  lastFetched: string;
  sourceUrl: string;
}

export interface LogItem {
  id: string;
  datetime: string;
  question: string;
  standardDescription: string;
  foundInKB: "Да" | "Нет" | "Частично";
  durationSeconds: number;
  webhookStatus?: "sent" | "failed" | "not_configured";
  webhookError?: string;
}

export interface AppSettings {
  sheetUrl: string;
  webhookUrl: string;
}
