import React, { useState } from "react";
import {
  X,
  Cpu,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Zap,
} from "lucide-react";
import { ModelProtocolEntry } from "../types";

interface ModelProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ModelProtocolEntry[];
  onClearLogs: () => void;
}

export const ModelProtocolModal: React.FC<ModelProtocolModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Filter logs
  const filteredLogs = logs.filter((item) => {
    if (filter === "all") return true;
    if (filter === "openai") return item.provider === "openai";
    if (filter === "gemini") return item.provider === "gemini";
    if (filter === "fallback") return item.status === "fallback";
    if (filter === "error") return item.status === "error";
    return true;
  });

  // Calculate session statistics
  const totalQueries = logs.length;
  const uniqueModels = Array.from(new Set(logs.map((l) => l.modelUsed))).filter(Boolean);
  const avgDuration =
    totalQueries > 0
      ? (logs.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0) / totalQueries).toFixed(2)
      : "0.00";
  const totalTokens = logs.reduce(
    (acc, curr) => acc + (curr.tokens?.totalTokens || 0),
    0
  );

  const handleCopyReport = () => {
    if (logs.length === 0) return;
    const reportText = logs
      .map(
        (l, i) =>
          `[#${logs.length - i}] ${l.timestamp} | Модель: ${l.modelUsed} (${l.provider.toUpperCase()}) | Длительность: ${l.durationSeconds}с | Токены: ${l.tokens?.totalTokens ?? "—"} | Статус: ${l.status}\nВопрос: ${l.question}\nОтвет: ${l.answerSnippet || l.errorMessage || "—"}\n`
      )
      .join("\n---\n\n");

    navigator.clipboard.writeText(
      `ПРОТОКОЛ ИСПОЛЬЗОВАНИЯ МОДЕЛЕЙ (СЕССИЯ)\nВсего запросов: ${totalQueries}\nИспользованные модели: ${uniqueModels.join(", ")}\n\n` +
        reportText
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJSON = () => {
    if (logs.length === 0) return;
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `model_protocol_session_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#004b93] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1e293b] truncate">
                  Протокол использования моделей
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-[#004b93] border border-slate-200 font-mono font-medium shrink-0">
                  {totalQueries} {totalQueries === 1 ? "запрос" : totalQueries > 1 && totalQueries < 5 ? "запроса" : "запросов"}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Журнал вызовов нейросетей в текущей сессии (хранится только на время работы, без БД)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#004b93]" />
              <span>Всего обращений</span>
            </div>
            <div className="text-lg font-bold text-slate-800 mt-1 font-mono">
              {totalQueries}
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Задействовано моделей</span>
            </div>
            <div className="text-lg font-bold text-slate-800 mt-1 font-mono">
              {uniqueModels.length}
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Ср. время ответа</span>
            </div>
            <div className="text-lg font-bold text-slate-800 mt-1 font-mono">
              {avgDuration} <span className="text-xs font-normal text-slate-500">сек</span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Всего токенов</span>
            </div>
            <div className="text-lg font-bold text-slate-800 mt-1 font-mono">
              {totalTokens > 0 ? totalTokens.toLocaleString() : "—"}
            </div>
          </div>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="p-3 sm:px-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-white shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-500 font-medium mr-1">Фильтр:</span>
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                filter === "all"
                  ? "bg-[#004b93] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Все ({logs.length})
            </button>
            <button
              onClick={() => setFilter("openai")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 whitespace-nowrap ${
                filter === "openai"
                  ? "bg-[#004b93] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Bot className="w-3 h-3" />
              <span>OpenAI ({logs.filter((l) => l.provider === "openai").length})</span>
            </button>
            <button
              onClick={() => setFilter("gemini")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 whitespace-nowrap ${
                filter === "gemini"
                  ? "bg-[#004b93] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Gemini ({logs.filter((l) => l.provider === "gemini").length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              disabled={logs.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition disabled:opacity-40"
              title="Скопировать текстовый отчет о сессии"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Копировать</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportJSON}
              disabled={logs.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition disabled:opacity-40"
              title="Скачать JSON протокола сессии"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Экспорт JSON</span>
            </button>

            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-rose-600 hover:bg-rose-50 text-xs font-medium transition disabled:opacity-40"
              title="Очистить протокол текущей сессии"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Очистить</span>
            </button>
          </div>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50/50 custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center px-4">
              <Cpu className="w-12 h-12 mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">
                {logs.length === 0
                  ? "Протокол сессии пуст"
                  : "По выбранному фильтру записей не найдено"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                {logs.length === 0
                  ? "Задайте любой вопрос в чате, переключая модели между OpenAI и Google Gemini в верхнем меню. Каждый реальный вызов модели будет сразу зафиксирован в этом протоколе с меткой времени, названием модели и временем отклика."
                  : "Попробуйте выбрать другой фильтр или переключить провайдера."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((entry, index) => {
                const isExpanded = expandedId === entry.id;
                const isGemini = entry.provider === "gemini";
                const isFallback = entry.status === "fallback";
                const isError = entry.status === "error";

                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition"
                  >
                    {/* Item Main Row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="p-3.5 sm:px-4 cursor-pointer flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 select-none hover:bg-slate-50/70 transition"
                    >
                      {/* Left: Index & Time */}
                      <div className="flex items-center gap-2.5 min-w-[170px]">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-mono text-[11px] flex items-center justify-center font-medium">
                          #{filteredLogs.length - index}
                        </span>
                        <div>
                          <div className="text-xs font-mono font-medium text-slate-700">
                            {entry.timestamp}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ID: {entry.id.replace("prot_", "")}
                          </div>
                        </div>
                      </div>

                      {/* Model & Provider Badge */}
                      <div className="flex items-center gap-2 min-w-[190px]">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            isGemini
                              ? "bg-purple-50 text-[#004b93] border-purple-200"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                          }`}
                        >
                          {isGemini ? (
                            <Sparkles className="w-3.5 h-3.5 text-[#004b93]" />
                          ) : (
                            <Bot className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          <span className="font-mono text-[12px]">{entry.modelUsed}</span>
                        </div>

                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          {entry.provider}
                        </span>
                      </div>

                      {/* Question Snippet */}
                      <div className="flex-1 min-w-[200px] truncate">
                        <span className="text-xs text-slate-800 font-medium truncate block">
                          «{entry.question}»
                        </span>
                        {entry.standardDescription && (
                          <span className="text-[11px] text-slate-400 truncate block">
                            Стандарт: {entry.standardDescription}
                          </span>
                        )}
                      </div>

                      {/* Status / Timing / Tokens */}
                      <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
                        {/* Status */}
                        {isError ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>Ошибка</span>
                          </span>
                        ) : isFallback ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <HelpCircle className="w-3 h-3" />
                            <span>Fallback KB</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Успешно</span>
                          </span>
                        )}

                        {/* Duration */}
                        <span className="flex items-center gap-1 font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {entry.durationSeconds}с
                        </span>

                        {/* Expand Chevron */}
                        <div className="text-slate-400 p-0.5">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs space-y-3 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[11px] text-slate-400 font-medium block">
                              Фактическая модель AI:
                            </span>
                            <span className="font-mono font-bold text-[#004b93] text-xs">
                              {entry.modelUsed}
                            </span>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[11px] text-slate-400 font-medium block">
                              Статус в базе знаний:
                            </span>
                            <span className="font-semibold text-slate-700">
                              {entry.foundInKB ? `Найдено (${entry.foundInKB})` : "Не проверялось"}
                            </span>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[11px] text-slate-400 font-medium block">
                              Токены (Prompt / Output / Total):
                            </span>
                            <span className="font-mono text-slate-700 font-semibold">
                              {entry.tokens
                                ? `${entry.tokens.promptTokens ?? "—"} / ${entry.tokens.completionTokens ?? "—"} / ${entry.tokens.totalTokens ?? "—"}`
                                : "Не возвращены API"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-500 font-semibold block mb-1">
                            Полный текст запроса:
                          </span>
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 font-medium">
                            {entry.question}
                          </div>
                        </div>

                        {entry.answerSnippet && (
                          <div>
                            <span className="text-[11px] text-slate-500 font-semibold block mb-1">
                              Сформированный ответ:
                            </span>
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {entry.answerSnippet}
                            </div>
                          </div>
                        )}

                        {entry.errorMessage && (
                          <div>
                            <span className="text-[11px] text-rose-600 font-semibold block mb-1">
                              Текст ошибки:
                            </span>
                            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-mono text-[11px]">
                              {entry.errorMessage}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px] text-slate-500">
            Данные хранятся только в памяти сеанса браузера (до перезагрузки страницы)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#1e293b] hover:bg-slate-800 text-white font-medium transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
