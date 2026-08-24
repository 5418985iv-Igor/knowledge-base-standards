import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  FileText,
  Settings,
  Search,
  RefreshCw,
  Pin,
  PinOff,
  ChevronLeft,
} from "lucide-react";
import { ChatSession, KnowledgeBaseStats } from "../types";

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onTogglePinSession: (id: string, e: React.MouseEvent) => void;
  onOpenKBModal?: () => void;
  onOpenLogsModal: () => void;
  onOpenSettingsModal: () => void;
  kbStats: KnowledgeBaseStats | null;
  kbLoading: boolean;
  onRefreshKB: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onTogglePinSession,
  onOpenKBModal,
  onOpenLogsModal,
  onOpenSettingsModal,
  kbStats,
  kbLoading,
  onRefreshKB,
  isOpen,
  onToggleOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter((s) => s.pinned);
  const unpinnedSessions = filteredSessions.filter((s) => !s.pinned);

  // Group unpinned sessions by date
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const todaySessions = unpinnedSessions.filter(
    (s) => now - s.updatedAt < oneDay
  );
  const previousWeekSessions = unpinnedSessions.filter(
    (s) => now - s.updatedAt >= oneDay && now - s.updatedAt < 7 * oneDay
  );
  const olderSessions = unpinnedSessions.filter(
    (s) => now - s.updatedAt >= 7 * oneDay
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
          onClick={onToggleOpen}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col bg-white text-slate-800 w-72 border-r border-slate-200 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-72"
        }`}
      >
        {/* Header / Brand */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-[#004b93] flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              V
            </div>
            <div className="flex flex-col truncate">
              <span className="font-bold text-[#004b93] tracking-tight text-base truncate">
                Ассистент Крантик
              </span>
              <span className="text-[11px] text-slate-500 font-medium truncate">
                База знаний стандартов
              </span>
            </div>
          </div>

          <button
            id="btn-close-sidebar"
            onClick={onToggleOpen}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Закрыть меню"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            id="btn-new-chat"
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#004b93] hover:bg-[#003c77] active:scale-[0.99] text-white text-sm font-medium transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Новый вопрос</span>
          </button>
        </div>

        {/* Search */}
        {sessions.length > 3 && (
          <div className="px-3 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-history-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по истории..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#004b93] focus:ring-1 focus:ring-[#004b93]"
              />
            </div>
          </div>
        )}

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4 py-2 custom-scrollbar">
          {/* Pinned Chats */}
          {pinnedSessions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Pin className="w-3 h-3 text-amber-500" />
                <span>Закрепленные</span>
              </div>
              <div className="space-y-1 mt-1">
                {pinnedSessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={(e) => onDeleteSession(session.id, e)}
                    onTogglePin={(e) => onTogglePinSession(session.id, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          {todaySessions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Сегодня
              </div>
              <div className="space-y-1 mt-1">
                {todaySessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={(e) => onDeleteSession(session.id, e)}
                    onTogglePin={(e) => onTogglePinSession(session.id, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Previous 7 days */}
          {previousWeekSessions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Предыдущие 7 дней
              </div>
              <div className="space-y-1 mt-1">
                {previousWeekSessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={(e) => onDeleteSession(session.id, e)}
                    onTogglePin={(e) => onTogglePinSession(session.id, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Older */}
          {olderSessions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                История запросов
              </div>
              <div className="space-y-1 mt-1">
                {olderSessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={(e) => onDeleteSession(session.id, e)}
                    onTogglePin={(e) => onTogglePinSession(session.id, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredSessions.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-400 text-xs">
              {searchQuery ? "Ничего не найдено" : "История диалогов пуста"}
            </div>
          )}
        </div>

        {/* Knowledge Base Status Card */}
        <div className="p-3 mx-3 my-1 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs">База знаний подключена</span>
            </div>
            <button
              id="btn-sidebar-refresh-kb"
              onClick={onRefreshKB}
              disabled={kbLoading}
              title="Обновить базу знаний"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${kbLoading ? "animate-spin text-[#004b93]" : ""}`} />
            </button>
          </div>
          <div className="text-[11px] text-slate-500 pt-0.5">
            <span>
              {kbStats ? `${kbStats.rowsCount} регламентов загружено` : "Синхронизация..."}
            </span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-3 border-t border-slate-100 space-y-0.5 text-xs">
          <button
            id="nav-logs-modal"
            onClick={onOpenLogsModal}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <div className="flex items-center justify-between flex-1">
              <span>Логи запросов</span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono">
                Sheets
              </span>
            </div>
          </button>

          <button
            id="nav-settings-modal"
            onClick={onOpenSettingsModal}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Настройки подключения</span>
          </button>
        </div>
      </aside>
    </>
  );
};

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onDelete,
  onTogglePin,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-[6px] text-xs cursor-pointer transition-all ${
        isActive
          ? "bg-[#f1f5f9] text-[#1e293b] font-semibold border-l-[3px] border-[#004b93] pl-2.5"
          : "text-[#64748b] hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <div className="flex items-center gap-2 truncate pr-6">
        <MessageSquare
          className={`w-3.5 h-3.5 shrink-0 ${
            isActive ? "text-[#004b93]" : "text-slate-400"
          }`}
        />
        <span className="truncate">{session.title || "Новый диалог"}</span>
      </div>

      <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity bg-gradient-to-l from-slate-50 via-slate-50 pl-2">
        <button
          onClick={onTogglePin}
          title={session.pinned ? "Открепить" : "Закрепить"}
          className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-slate-200"
        >
          {session.pinned ? (
            <PinOff className="w-3 h-3 text-amber-500" />
          ) : (
            <Pin className="w-3 h-3" />
          )}
        </button>
        <button
          onClick={onDelete}
          title="Удалить диалог"
          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
