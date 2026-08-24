import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  User,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  HelpCircle,
} from "lucide-react";
import { Message } from "../types";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if ("speechSynthesis" in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = "ru-RU";
      utterance.rate = 1.0;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end px-4 sm:px-12 py-3 hover:bg-slate-50/40 transition-colors">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] min-w-0">
          {message.timestamp && (
            <div className="flex items-center mb-1 px-1">
              <span className="text-[11px] text-[#94a3b8]">{message.timestamp}</span>
            </div>
          )}
          <div className="bg-[#004b93] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-[14px] sm:text-[15px] leading-relaxed shadow-2xs whitespace-pre-wrap text-left break-words">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message
  const getBadgeStyle = () => {
    switch (message.foundInKB) {
      case "Да":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <FileCheck className="w-3.5 h-3.5 text-emerald-600" />,
          text: "Найдено в стандартах компании",
        };
      case "Частично":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <HelpCircle className="w-3.5 h-3.5 text-amber-600" />,
          text: "Рекомендация на основе похожих записей",
        };
      case "Нет":
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" />,
          text: "Прямой регламент в базе отсутствует",
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div className="flex gap-4 sm:gap-5 px-6 sm:px-12 py-5 hover:bg-slate-50/50 transition-colors">
      {/* Assistant Avatar */}
      <div className="w-9 h-9 rounded-full bg-[#004b93] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 mt-0.5">
        AI
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <p className="font-semibold text-sm text-[#004b93]">Крантик</p>
            {message.foundInKB && (
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg}`}
              >
                {badge.icon}
                <span>{badge.text}</span>
              </div>
            )}
          </div>

          {message.standardDescription && message.standardDescription !== "Не определен" && (
            <span
              className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[240px]"
              title={message.standardDescription}
            >
              📋 {message.standardDescription}
            </span>
          )}
        </div>

        {/* Formatted Content with Left Accent Border */}
        <div className="border-l-[3px] border-[#004b93] pl-4 sm:pl-5 py-0.5 text-[#334155]">
          <div className="prose prose-slate max-w-none text-[#334155] text-[15px] leading-relaxed break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Bottom info & Actions */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-[#94a3b8]">
            <div className="flex items-center gap-3">
              {message.durationSeconds !== undefined && (
                <span className="flex items-center gap-1 text-[11px] text-[#64748b] font-mono">
                  <Clock className="w-3 h-3 text-[#94a3b8]" />
                  {message.durationSeconds}с
                </span>
              )}
              <span className="text-[11px] text-[#94a3b8]">{message.timestamp}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSpeak}
                title={isPlaying ? "Остановить чтение" : "Озвучить ответ"}
                className={`p-1.5 rounded-md transition ${
                  isPlaying
                    ? "text-[#004b93] bg-[#004b93]/10"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                {isPlaying ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={handleCopy}
                title="Скопировать ответ"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] text-emerald-600 font-medium">
                      Скопировано
                    </span>
                  </>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
