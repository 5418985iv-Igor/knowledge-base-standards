import React from "react";
import {
  Menu,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { KnowledgeBaseStats } from "../types";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
  kbStats: KnowledgeBaseStats | null;
  kbLoading: boolean;
  onRefreshKB: () => void;
  onOpenKBModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title,
  kbStats,
  kbLoading,
  onRefreshKB,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-100 px-6 sm:px-8 flex items-center justify-between z-20 shrink-0 sticky top-0">
      <div className="flex items-center gap-3 truncate">
        <button
          id="btn-header-toggle-sidebar"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          aria-label="Меню"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 truncate">
          <h1 className="font-semibold text-[#475569] text-sm sm:text-base tracking-tight truncate max-w-xs sm:max-w-md">
            {title && title !== "Новый диалог" ? title : "База знаний стандартов компании"}
          </h1>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#004b93]/10 text-[#004b93] shrink-0">
            <Sparkles className="w-3 h-3 text-[#004b93]" />
            OpenAI Model
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Sync button */}
        <button
          id="btn-header-refresh"
          onClick={onRefreshKB}
          disabled={kbLoading}
          className="p-2 rounded-md text-slate-400 hover:text-[#004b93] hover:bg-slate-100 transition disabled:opacity-50"
          title="Синхронизировать базу знаний"
        >
          <RefreshCw className={`w-4 h-4 ${kbLoading ? "animate-spin text-[#004b93]" : ""}`} />
        </button>
      </div>
    </header>
  );
};
