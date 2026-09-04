import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { KnowledgeBaseModal } from "./components/KnowledgeBaseModal";
import { LogsModal } from "./components/LogsModal";
import { SettingsModal } from "./components/SettingsModal";
import { ModelProtocolModal } from "./components/ModelProtocolModal";
import {
  Message,
  ChatSession,
  KnowledgeBaseStats,
  AppSettings,
  AIProvider,
  ModelProtocolEntry,
} from "./types";
import {
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

const DEFAULT_SHEET_URL =
  import.meta.env.VITE_DEFAULT_SHEET_URL ||
  "https://docs.google.com/spreadsheets/d/1Uf1g3BcPntwg2aPvzg4urTo4knwmxAAFvtlcxUA3BTc/edit?gid=0#gid=0";
const DEFAULT_WEBHOOK_URL =
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL || "";
const ASSISTANT_NAME =
  import.meta.env.VITE_ASSISTANT_NAME || "Крантик";
const APP_TITLE =
  import.meta.env.VITE_APP_TITLE || "База знаний стандартов компании";

const STORAGE_SESSIONS_KEY = "company_standards_sessions_v1";
const STORAGE_CURRENT_SESSION_KEY = "company_standards_current_session_v1";
const STORAGE_SETTINGS_KEY = "company_standards_settings_v1";
const STORAGE_PROVIDER_KEY = "company_standards_provider_v1";

export default function App() {
  // AI Provider State (OpenAI or Google Gemini) with localStorage persistence
  const [provider, setProvider] = useState<AIProvider>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROVIDER_KEY);
      if (saved === "openai" || saved === "gemini") {
        return saved;
      }
    } catch {}
    return "openai";
  });

  // Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load sessions from storage:", e);
    }
    const initialSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: "Новый диалог",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    return [initialSession];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_SESSION_KEY);
      if (saved) return saved;
    } catch {}
    return sessions[0]?.id || `session_${Date.now()}`;
  });

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          provider: parsed.provider || "openai",
        };
      }
    } catch {}
    return {
      sheetUrl: DEFAULT_SHEET_URL,
      webhookUrl: DEFAULT_WEBHOOK_URL,
      provider: "openai",
    };
  });

  // Knowledge Base State
  const [kbStats, setKbStats] = useState<KnowledgeBaseStats | null>(null);
  const [kbLoading, setKbLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStatusText, setLoadingStatusText] = useState<string>("");

  // UI Modals & Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKBModalOpen, setIsKBModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);

  // Model Protocol (in-memory, session-only)
  const [modelProtocolLogs, setModelProtocolLogs] = useState<ModelProtocolEntry[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync provider to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROVIDER_KEY, provider);
    } catch {}
  }, [provider]);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Error saving sessions:", e);
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CURRENT_SESSION_KEY, currentSessionId);
    } catch {}
  }, [currentSessionId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Fetch KB on start or sheet URL change
  const fetchKnowledgeBase = async (force = false) => {
    setKbLoading(true);
    try {
      const url = `/api/knowledge-base/data?sheetUrl=${encodeURIComponent(
        settings.sheetUrl
      )}${force ? "&force=true" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setKbStats({
          headers: data.headers,
          rowsCount: data.rowsCount,
          sampleRows: data.sampleRows,
          allRows: data.allRows,
          lastFetched: data.lastFetched,
          sourceUrl: data.sourceUrl,
        });
      }
    } catch (err) {
      console.error("Failed to load Knowledge Base:", err);
    } finally {
      setKbLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
  }, [settings.sheetUrl]);

  // Current session messages
  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0];
  const messages = currentSession?.messages || [];

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle New Chat
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: "Новый диалог",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  // Handle Session Select
  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setIsSidebarOpen(false);
  };

  // Handle Delete Session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fresh: ChatSession = {
          id: `session_${Date.now()}`,
          title: "Новый диалог",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        setCurrentSessionId(fresh.id);
        return [fresh];
      }
      if (currentSessionId === id) {
        setCurrentSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Handle Toggle Pin
  const handleTogglePinSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
  };

  // Handle Clear All Sessions
  const handleClearAllSessions = () => {
    const fresh: ChatSession = {
      id: `session_${Date.now()}`,
      title: "Новый диалог",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions([fresh]);
    setCurrentSessionId(fresh.id);
    setIsSettingsModalOpen(false);
  };

  // Handle Provider Change
  const handleSelectProvider = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setSettings((prev) => ({ ...prev, provider: newProvider }));
  };

  // Handle Send Message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Update session title if first message
    const updatedTitle =
      messages.length === 0
        ? text.slice(0, 32) + (text.length > 32 ? "..." : "")
        : currentSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              title: updatedTitle,
              updatedAt: Date.now(),
              messages: [...s.messages, userMessage],
            }
          : s
      )
    );

    setIsLoading(true);
    const providerLabel = provider === "gemini" ? "Google Gemini" : "OpenAI";
    setLoadingStatusText(`Поиск в регламентах (генерация через ${providerLabel})...`);

    // Rotate status text to provide clear visual feedback
    const statusSteps = [
      `Поиск регламентов в базе знаний...`,
      `Анализ стандартов и требований компании...`,
      `Формулирование ответа через ${providerLabel}...`,
    ];
    let stepIndex = 0;
    const statusInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % statusSteps.length;
      setLoadingStatusText(statusSteps[stepIndex]);
    }, 1800);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          provider: provider,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sheetUrl: settings.sheetUrl,
          webhookUrl: settings.webhookUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Не удалось получить ответ от ${providerLabel}`);
      }

      const assistantMessage: Message = {
        id: `msg_asst_${Date.now()}`,
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        standardDescription: data.standardDescription,
        foundInKB: data.foundInKB,
        durationSeconds: data.durationSeconds,
        logId: data.logId,
        provider: data.provider || provider,
        modelUsed: data.modelUsed,
        tokens: data.tokens,
      };

      // Append to session model protocol (in-memory only, no DB)
      const nowFormatted =
        data.timestamp ||
        new Date().toLocaleString("ru-RU", {
          timeZone: "Europe/Moscow",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

      const protocolEntry: ModelProtocolEntry = {
        id: `prot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: nowFormatted,
        provider: data.provider || provider,
        modelUsed:
          data.modelUsed || (provider === "gemini" ? "gemini-3.5-flash-lite" : "gpt-4o-mini"),
        question: text.trim(),
        durationSeconds: data.durationSeconds ?? 0,
        status: data.modelUsed === "direct-standards-kb" ? "fallback" : "success",
        foundInKB: data.foundInKB,
        standardDescription: data.standardDescription,
        tokens: data.tokens,
        answerSnippet: data.answer,
      };
      setModelProtocolLogs((prev) => [protocolEntry, ...prev]);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, assistantMessage],
              }
            : s
        )
      );
    } catch (err: any) {
      console.error("Chat error:", err);
      const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
      const errorText = isTimeout
        ? "Превышено время ожидания ответа от сервиса. Попробуйте повторить вопрос."
        : err.message || "Пожалуйста, проверьте соединение и настройки.";

      const nowFormatted = new Date().toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Record error in session model protocol
      const errProtocolEntry: ModelProtocolEntry = {
        id: `prot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: nowFormatted,
        provider: provider,
        modelUsed: provider === "gemini" ? "gemini-3.5-flash-lite" : "gpt-4o-mini",
        question: text.trim(),
        durationSeconds: 0,
        status: "error",
        errorMessage: errorText,
      };
      setModelProtocolLogs((prev) => [errProtocolEntry, ...prev]);

      const errorMessage: Message = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Не удалось сформировать ответ (${providerLabel}):**\n\n${errorText}`,
        timestamp: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        foundInKB: "Нет",
        error: true,
        provider: provider,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, errorMessage],
              }
            : s
        )
      );
    } finally {
      clearInterval(statusInterval);
      setIsLoading(false);
      setLoadingStatusText("");
    }
  };

  return (
    <div className="flex h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#f3f4f6] text-[#1e293b] antialiased font-sans">
      {/* Left Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onTogglePinSession={handleTogglePinSession}
        onOpenKBModal={() => setIsKBModalOpen(true)}
        kbStats={kbStats}
        kbLoading={kbLoading}
        onRefreshKB={() => fetchKnowledgeBase(true)}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenModelProtocol={() => setIsProtocolModalOpen(true)}
        protocolCount={modelProtocolLogs.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden relative bg-white">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          title={currentSession?.title || "База знаний стандартов"}
          kbStats={kbStats}
          kbLoading={kbLoading}
          onRefreshKB={() => fetchKnowledgeBase(true)}
          onOpenKBModal={() => setIsKBModalOpen(true)}
          provider={provider}
          onSelectProvider={handleSelectProvider}
        />

        {/* Chat Scroll Container */}
        <main className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {messages.length === 0 ? (
            /* Welcome / Empty State */
            <div className="min-h-full flex flex-col items-center justify-center p-6 sm:p-12 max-w-3xl mx-auto text-center animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-lg bg-[#004b93] flex items-center justify-center text-white font-bold text-xl shadow-xs mb-5">
                V
              </div>

              <h2 className="text-2xl font-bold text-[#1e293b] tracking-tight mb-2">
                {APP_TITLE}
              </h2>
              <p className="text-sm text-[#475569] max-w-lg mb-8 leading-relaxed">
                Задайте вопрос по регламентам, процедурам и стандартам компании.
                Ответы формируются строго на основании официальной базы знаний.
              </p>

              {/* Status Box */}
              <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-2xs flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-white border border-slate-200 text-[#004b93] flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1e293b] flex items-center gap-2">
                      <span>База знаний регламентов</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    </div>
                    <div className="text-[11px] text-[#64748b]">
                      {kbStats
                        ? `${kbStats.rowsCount} записей • Синхронизировано`
                        : "Загрузка регламентов..."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages List */
            <div className="py-4 space-y-2">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-4 sm:gap-5 px-6 sm:px-12 py-5">
                  <div className="w-9 h-9 rounded-full bg-[#004b93] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                    AI
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-semibold text-sm text-[#004b93] mb-2">{ASSISTANT_NAME}</p>
                    <div className="border-l-[3px] border-[#004b93] pl-4 sm:pl-5 py-1 text-xs text-[#64748b] flex items-center gap-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-[#004b93]" />
                      <span>{loadingStatusText || "Поиск в регламентах и формулирование ответа..."}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Bottom Chat Input */}
        <div className="shrink-0 bg-white border-t border-slate-100">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Modals */}
      <KnowledgeBaseModal
        isOpen={isKBModalOpen}
        onClose={() => setIsKBModalOpen(false)}
        kbStats={kbStats}
        kbLoading={kbLoading}
        onRefreshKB={() => fetchKnowledgeBase(true)}
        onSelectQuestion={(q) => {
          handleSendMessage(q);
        }}
      />

      <LogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        webhookUrl={settings.webhookUrl}
        sheetUrl={settings.sheetUrl}
        onSaveWebhookUrl={(newWebhookUrl) => {
          setSettings((prev) => ({ ...prev, webhookUrl: newWebhookUrl }));
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={{ ...settings, provider }}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          if (newSettings.provider) {
            setProvider(newSettings.provider);
          }
          setIsSettingsModalOpen(false);
        }}
        onClearAllSessions={handleClearAllSessions}
      />

      <ModelProtocolModal
        isOpen={isProtocolModalOpen}
        onClose={() => setIsProtocolModalOpen(false)}
        logs={modelProtocolLogs}
        onClearLogs={() => setModelProtocolLogs([])}
      />
    </div>
  );
}
