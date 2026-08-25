import React from "react";
import {
  Menu,
  Sparkles,
  Bot,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { AIProvider, KnowledgeBaseStats } from "../types";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
  kbStats: KnowledgeBaseStats | null;
  kbLoading: boolean;
  onRefreshKB: () => void;
  onOpenKBModal?: () => void;
  provider: AIProvider;
  onSelectProvider: (provider: AIProvider) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title,
  kbStats,
  kbLoading,
  onRefreshKB,
  provider,
  onSelectProvider,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-100 px-4 sm:px-8 flex items-center justify-between z-20 shrink-0 sticky top-0">
      <div className="flex items-center gap-3 truncate min-w-0">
        <button
          id="btn-header-toggle-sidebar"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          aria-label="Меню"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 truncate min-w-0">
          <h1 className="font-semibold text-[#475569] text-sm sm:text-base tracking-tight truncate max-w-[160px] xs:max-w-xs sm:max-w-md">
            {title && title !== "Новый диалог" ? title : "База знаний стандартов компании"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Back to Project Library Link */}
        <a
          id="btn-header-back-to-library"
          href="https://vivonline.ru/"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-[#004b93] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all shadow-2xs"
          title="Вернуться в библиотеку проектов vivonline.ru"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">В библиотеку проектов</span>
        </a>

        {/* Model Selection Segmented Control */}
        <div
          id="model-selector-group"
          className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shadow-2xs"
          role="group"
          aria-label="Выбор AI модели"
        >
          <button
            id="btn-model-openai"
            type="button"
            onClick={() => onSelectProvider("openai")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              provider === "openai"
                ? "bg-white text-[#004b93] shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
            title="Использовать OpenAI для формирования ответа"
          >
            <Bot className="w-3.5 h-3.5 text-[#004b93]" />
            <span>OpenAI</span>
          </button>

          <button
            id="btn-model-gemini"
            type="button"
            onClick={() => onSelectProvider("gemini")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              provider === "gemini"
                ? "bg-white text-[#004b93] shadow-xs"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
            title="Использовать Google Gemini API для формирования ответа"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#004b93]" />
            <span>Gemini</span>
          </button>
        </div>

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
