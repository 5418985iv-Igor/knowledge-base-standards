import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Copy,
  Check,
  Code2,
  ExternalLink,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
} from "lucide-react";
import { LogItem } from "../types";

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  sheetUrl?: string;
  onSaveWebhookUrl?: (url: string) => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  sheetUrl,
  onSaveWebhookUrl,
}) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"logs" | "script">("logs");
  const [scriptCode, setScriptCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [customWebhookInput, setCustomWebhookInput] = useState(webhookUrl || "");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  useEffect(() => {
    setCustomWebhookInput(webhookUrl || "");
  }, [webhookUrl]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchScriptCode = async () => {
    try {
      const res = await fetch("/api/logs/apps-script-code");
      const data = await res.json();
      if (data.success) {
        setScriptCode(data.code);
      }
    } catch (e) {
      console.error("Failed to fetch script code:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      fetchScriptCode();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.foundInKB === filter;
  });

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTestWebhook = async () => {
    const urlToTest = customWebhookInput.trim() || webhookUrl;
    if (!urlToTest) {
      setTestResult({
        success: false,
        message: "Введите URL Webhook Google Apps Script для проверки",
      });
      return;
    }

    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/logs/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: urlToTest,
          sheetUrl: sheetUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || "Webhook успешно ответил и записал тестовую строку в лист «Логи»!",
          details: data,
        });
        if (onSaveWebhookUrl && urlToTest !== webhookUrl) {
          onSaveWebhookUrl(urlToTest);
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || "Не удалось отправить запрос к Webhook",
          details: data,
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Сетевая ошибка: ${e?.message || "Не удалось связаться с сервером"}`,
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const header = [
      "Дата и время",
      "Текст вопроса",
      "Описание стандарта",
      "Был ли дан ответ из базы",
      "Длительность сессии (сек)",
      "Статус Webhook",
    ];
    const rows = logs.map((l) => [
      `"${l.datetime}"`,
      `"${l.question.replace(/"/g, '""')}"`,
      `"${l.standardDescription.replace(/"/g, '""')}"`,
      `"${l.foundInKB}"`,
      l.durationSeconds,
      `"${l.webhookStatus === "sent" ? "Записано" : l.webhookStatus === "failed" ? "Ошибка: " + (l.webhookError || "") : "Не настроен"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [header.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `logi_standartov_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#004b93] text-white flex items-center justify-center font-bold text-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1e293b] flex items-center gap-2">
                Журнал логирования («Логи»)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-[#004b93] border border-slate-200 font-mono font-medium">
                  {logs.length} записей
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Автоматическая синхронизация вопросов сотрудников в Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md text-xs font-medium border border-slate-200">
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === "logs"
                    ? "bg-[#004b93] text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Журнал записей
              </button>
              <button
                onClick={() => setActiveTab("script")}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1 ${
                  activeTab === "script"
                    ? "bg-[#004b93] text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Настройка Webhook & Скрипт</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === "logs" ? (
          <>
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#64748b] font-medium">Статус ответа:</span>
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    filter === "all"
                      ? "bg-[#004b93] text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Все ({logs.length})
                </button>
                <button
                  onClick={() => setFilter("Да")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    filter === "Да"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  Да ({logs.filter((l) => l.foundInKB === "Да").length})
                </button>
                <button
                  onClick={() => setFilter("Частично")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    filter === "Частично"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  Частично ({logs.filter((l) => l.foundInKB === "Частично").length})
                </button>
                <button
                  onClick={() => setFilter("Нет")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    filter === "Нет"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  }`}
                >
                  Нет ({logs.filter((l) => l.foundInKB === "Нет").length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#004b93]" : ""}`} />
                  <span>Обновить</span>
                </button>

                <button
                  onClick={exportCSV}
                  disabled={logs.length === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#004b93]/10 hover:bg-[#004b93]/20 text-[#004b93] text-xs font-medium transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Экспорт CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
              {filteredLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
                  <FileText className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="font-medium text-slate-600 text-sm">Логи пока отсутствуют</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Задайте вопрос в чате — он автоматически запишется в журнал и отправится в Google Sheets!
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-[#004b93] text-white uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 border-r border-blue-800/40 w-36">Дата и время</th>
                          <th className="px-4 py-3 border-r border-blue-800/40">Текст вопроса</th>
                          <th className="px-4 py-3 border-r border-blue-800/40">Описание стандарта</th>
                          <th className="px-4 py-3 border-r border-blue-800/40 text-center w-32">
                            Ответ из базы
                          </th>
                          <th className="px-4 py-3 border-r border-blue-800/40 text-center w-24">Время</th>
                          <th className="px-4 py-3 text-center w-40">Google Sheets</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px] border-r border-slate-100 whitespace-nowrap">
                              {log.datetime}
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-900 max-w-sm">
                              {log.question}
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-700">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {log.standardDescription || "Не определен"}
                              </span>
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  log.foundInKB === "Да"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : log.foundInKB === "Частично"
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-rose-100 text-rose-800 border border-rose-300"
                                }`}
                              >
                                {log.foundInKB}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-slate-600 border-r border-slate-100">
                              {log.durationSeconds}с
                            </td>
                            <td className="px-4 py-3 text-center">
                              {log.webhookStatus === "sent" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Записано</span>
                                </span>
                              ) : log.webhookStatus === "failed" ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 cursor-help"
                                  title={log.webhookError || "Ошибка отправки в Webhook"}
                                >
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Ошибка записи</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  Не настроен
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Google Apps Script tab */
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Guide box */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 space-y-1.5">
                <p className="font-bold text-sm text-amber-900">
                  Почему в таблице могут не появляться записи (Главные причины):
                </p>
                <ul className="list-disc list-inside space-y-1 text-amber-900">
                  <li>
                    <strong>Права доступа:</strong> В окне развертывания Apps Script в поле <strong>«Кто имеет доступ» (Who has access)</strong> обязательно должно быть выбрано <strong>«Все» (Anyone)</strong>. Если выбрать «Только я», Google возвращает страницу входа вместо выполнения скрипта.
                  </li>
                  <li>
                    <strong>Запуск от имени:</strong> В поле <strong>«Запуск от имени» (Execute as)</strong> должно быть выбрано <strong>«Я» (Me)</strong>.
                  </li>
                  <li>
                    <strong>Рабочий URL:</strong> Используйте URL, оканчивающийся на <code>/exec</code> (не тестовый <code>/dev</code>).
                  </li>
                </ul>
              </div>
            </div>

            {/* Test Webhook Card with editable input */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">
                  Проверка подключения Webhook Google Apps Script
                </h4>
                <p className="text-[11px] text-slate-500 mb-2">
                  Вставьте URL вашего развертывания веб-приложения и нажмите «Отправить тестовый лог»
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customWebhookInput}
                    onChange={(e) => setCustomWebhookInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:border-[#004b93] focus:ring-1 focus:ring-[#004b93]"
                  />
                  <button
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !customWebhookInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-xs disabled:opacity-50 shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 ${testingWebhook ? "animate-spin" : ""}`} />
                    <span>{testingWebhook ? "Проверка..." : "Отправить тестовый лог"}</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-lg text-xs flex items-start gap-2.5 border leading-relaxed ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-rose-50 text-rose-900 border-rose-200"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.details?.row && (
                      <p className="text-[11px] text-emerald-700">
                        В таблицу добавлен лист «{testResult.details.sheetName || "Логи"}», новая строка №{testResult.details.row}.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Instruction Steps */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-blue-950 mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#004b93]" />
                Пошаговая инструкция по развертыванию скрипта:
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-900 leading-relaxed">
                <li>Откройте вашу Google Таблицу с базой знаний.</li>
                <li>В верхнем меню выберите: <strong>«Расширения» → «Apps Script»</strong>.</li>
                <li>Скопируйте код из блока ниже и вставьте в редактор Apps Script вместо имеющегося кода.</li>
                <li>Нажмите <strong>Сохранить (Ctrl+S)</strong>.</li>
                <li>
                  В правом верхнем углу нажмите <strong>«Развернуть» (Deploy) → «Новое развертывание» (New deployment)</strong>.
                </li>
                <li>
                  Тип развертывания: <strong>Веб-приложение (Web app)</strong>.
                </li>
                <li>
                  <strong>Запуск от имени (Execute as):</strong> выберите <strong>«Я» (Me)</strong>.
                </li>
                <li>
                  <strong>Кто имеет доступ (Who has access):</strong> ОБЯЗАТЕЛЬНО выберите <strong>«Все» (Anyone)</strong>.
                </li>
                <li>
                  Нажмите <strong>«Развернуть» (Deploy)</strong>, предоставьте разрешения и скопируйте полученный URL.
                </li>
              </ol>
            </div>

            {/* Code Snippet */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  Код для Google Apps Script (doPost Webhook):
                </span>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 px-3 py-1 bg-[#004b93] hover:bg-[#003c77] text-white rounded-md text-xs font-medium transition shadow-2xs"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Скопировать код</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                {scriptCode}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Лист «Логи» создается и форматируется автоматически при первом запросе
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
