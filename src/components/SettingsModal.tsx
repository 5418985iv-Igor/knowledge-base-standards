import React, { useState } from "react";
import {
  X,
  Settings,
  Link,
  Webhook,
  Trash2,
  Save,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { AppSettings } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClearAllSessions: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllSessions,
}) => {
  const [sheetUrl, setSheetUrl] = useState(settings.sheetUrl);
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      sheetUrl: sheetUrl.trim(),
      webhookUrl: webhookUrl.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetDefaults = () => {
    const defaultSheet =
      import.meta.env.VITE_DEFAULT_SHEET_URL ||
      "https://docs.google.com/spreadsheets/d/1Uf1g3BcPntwg2aPvzg4urTo4knwmxAAFvtlcxUA3BTc/edit?gid=0#gid=0";
    setSheetUrl(defaultSheet);
    setWebhookUrl(import.meta.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL || "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#004b93] text-white flex items-center justify-center font-bold text-sm">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1e293b]">
                Настройки подключения и интеграций
              </h2>
              <p className="text-xs text-slate-500">
                Управление источником базы знаний и Webhook логирования
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Sheet URL input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-[#004b93]" />
              Ссылка на Google Таблицу (База знаний стандартов):
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#004b93] focus:bg-white focus:ring-1 focus:ring-[#004b93] font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Таблица должна быть открыта для чтения по ссылке.
            </p>
          </div>

          {/* Webhook URL input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-emerald-600" />
              URL Webhook Google Apps Script (для листа «Логи»):
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Если поле пустое, используется URL из переменных окружения или ведется локальный аудит-журнал.
            </p>
          </div>

          {/* Reset button */}
          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-slate-500 hover:text-[#004b93] flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить на значение по умолчанию</span>
            </button>
          </div>

          {/* Clear chat history */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-800">История диалогов</h4>
                <p className="text-[11px] text-slate-500">Очистить все локально сохраненные чаты</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Вы действительно хотите удалить все чаты?")) {
                    onClearAllSessions();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md text-xs font-medium transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить историю</span>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs text-slate-600 hover:bg-slate-100 font-medium transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#004b93] hover:bg-[#003c77] text-white rounded-md text-xs font-medium transition shadow-xs active:scale-95"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Сохранено!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Сохранить настройки</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
