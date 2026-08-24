import React, { useState } from "react";
import {
  X,
  Table,
  RefreshCw,
  ExternalLink,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { KnowledgeBaseStats } from "../types";

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  kbStats: KnowledgeBaseStats | null;
  kbLoading: boolean;
  onRefreshKB: () => void;
  onSelectQuestion: (question: string) => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  kbStats,
  kbLoading,
  onRefreshKB,
  onSelectQuestion,
}) => {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const rows = kbStats?.allRows || [];
  const headers = kbStats?.headers || [];

  const filteredRows = rows.filter((row) =>
    Object.values(row).some((val) =>
      val.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#004b93] text-white flex items-center justify-center font-bold text-sm">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1e293b] flex items-center gap-2">
                База знаний стандартов компании
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-[#004b93] border border-slate-200 font-mono font-medium">
                  {rows.length} записей
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Синхронизировано с Google Sheets (актуализируется автоматически)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshKB}
              disabled={kbLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${kbLoading ? "animate-spin text-[#004b93]" : ""}`}
              />
              <span>Обновить</span>
            </button>

            {kbStats?.sourceUrl && (
              <a
                href={kbStats.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#004b93]/10 text-[#004b93] hover:bg-[#004b93]/20 text-xs font-medium transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Открыть Google Таблицу</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по регламентам, стандартам и ключевым словам..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-[#1e293b] placeholder-slate-400 focus:outline-hidden focus:border-[#004b93] focus:ring-1 focus:ring-[#004b93] transition"
            />
          </div>

          <div className="text-xs text-slate-500">
            Показано записей: <span className="font-semibold text-slate-800">{filteredRows.length}</span> из {rows.length}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
          {rows.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
              <Layers className="w-12 h-12 mb-3 text-slate-300 animate-pulse" />
              <p className="font-medium text-slate-600 text-sm">Загрузка данных из Google Sheets...</p>
              <p className="text-xs text-slate-400 mt-1">Пожалуйста, подождите или проверьте доступ к таблице</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-[#004b93] text-white uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 border-r border-blue-800/40 w-12 text-center">№</th>
                      {headers.map((h, idx) => (
                        <th key={idx} className="px-4 py-3 border-r border-blue-800/40">
                          {h}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center w-28">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, rIdx) => {
                      const firstVal = Object.values(row)[0] || "";
                      return (
                        <tr
                          key={rIdx}
                          className="hover:bg-blue-50/60 transition group"
                        >
                          <td className="px-4 py-3 text-center text-slate-400 font-mono border-r border-slate-100 font-medium">
                            {rIdx + 1}
                          </td>
                          {headers.map((h, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-4 py-3 border-r border-slate-100 align-top max-w-sm"
                            >
                              <span className="line-clamp-4 text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {row[h] || "—"}
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center align-middle">
                            <button
                              onClick={() => {
                                onSelectQuestion(`Расскажи подробнее про стандарт: "${firstVal}"`);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-md bg-[#004b93]/10 text-[#004b93] hover:bg-[#004b93] hover:text-white text-[11px] font-medium transition"
                            >
                              Спросить
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Таблица:{" "}
            <code className="text-slate-700 font-mono text-[11px] bg-slate-200/80 px-1.5 py-0.5 rounded">
              1Uf1g3BcPntwg2aPvzg4urTo4knwmxAAFvtlcxUA3BTc
            </code>
          </div>
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
