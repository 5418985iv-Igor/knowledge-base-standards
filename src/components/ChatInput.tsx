import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Mic, MicOff, AlertCircle } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

// Browser SpeechRecognition interface type definitions
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

/**
 * Detect mobile devices (Android / iOS) where speech recognition and IME
 * voice typing require specific configuration to avoid word duplication.
 */
const isMobileDevice = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouch =
    typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  return isMobileUA || (isTouch && /Macintosh|Linux/i.test(ua));
};

/**
 * Deduplicates voice typing glitches where words are repeated either
 * glued together without spaces (e.g. "блокировкаблокировка" -> "блокировка")
 * or separated by whitespace (e.g. "блокировка блокировка" -> "блокировка").
 */
export function cleanVoiceDuplicates(input: string): string {
  if (!input) return "";

  // 1. Fix glued duplicate words (e.g. "блокировкаблокировка" -> "блокировка", "пользователейпользователей" -> "пользователей")
  // Detects words where a sequence of 4+ letters/digits is repeated back-to-back
  let cleaned = input.replace(
    /(?<!\p{L})([\p{L}0-9]{4,})\1+(?!\p{L})/gui,
    "$1"
  );

  // 2. Fix consecutive duplicate words separated by spaces (e.g. "блокировка блокировка" -> "блокировка")
  cleaned = cleaned.replace(
    /(?<!\p{L})([\p{L}0-9]{3,})(?:\s+\1)+(?!\p{L})/gui,
    "$1"
  );

  return cleaned;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
}) => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // Check speech recognition support on mount
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSpeechSupported(false);
    }
  }, []);

  // Adjust textarea height on text change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [text]);

  // Stop speech recognition helper
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  // Force abort speech recognition helper
  const abortListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore if already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Toggle voice recognition
  const toggleListening = () => {
    setSpeechError(null);

    const win = window as unknown as IWindow;
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError("Ваш браузер не поддерживает голосовой ввод (Web Speech API).");
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    if (isListening || isListeningRef.current) {
      stopListening();
      return;
    }

    try {
      const isMobile = isMobileDevice();

      const recognition = new SpeechRecognitionClass();
      recognition.lang = "ru-RU";
      // Android Chrome has a known Chromium bug (issue 40272768) where interimResults: true
      // emits duplicate intermediate results as finalized chunks, concatenating identical words
      // together without spaces (e.g. "блокировкаблокировка пользователейпользователей").
      // Disabling interimResults and continuous on mobile ensures clean, single-pass speech recognition.
      recognition.continuous = !isMobile;
      recognition.interimResults = !isMobile;
      recognition.maxAlternatives = 1;

      // Base text before speech recognition started
      const baseText = text ? text.trim() : "";

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        if (!isListeningRef.current) return;

        // Collect and deduplicate speech segments from event.results
        const segments: string[] = [];

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (!item || !item[0]) continue;

          const transcript = (item[0].transcript || "").trim();
          if (!transcript) continue;

          // Skip if exact duplicate of the previous segment
          if (
            segments.length > 0 &&
            segments[segments.length - 1].toLowerCase() === transcript.toLowerCase()
          ) {
            continue;
          }

          // If current transcript already starts with the previous segment, replace with the longer version
          if (
            segments.length > 0 &&
            transcript.toLowerCase().startsWith(segments[segments.length - 1].toLowerCase())
          ) {
            segments[segments.length - 1] = transcript;
            continue;
          }

          // If the previous segment already ends with this transcript, skip
          if (
            segments.length > 0 &&
            segments[segments.length - 1].toLowerCase().endsWith(transcript.toLowerCase())
          ) {
            continue;
          }

          segments.push(transcript);
        }

        const rawSpoken = segments.join(" ").trim();
        const currentSpoken = cleanVoiceDuplicates(rawSpoken);

        if (currentSpoken && isListeningRef.current) {
          let combined = currentSpoken;
          if (baseText) {
            if (currentSpoken.toLowerCase().startsWith(baseText.toLowerCase())) {
              combined = currentSpoken;
            } else {
              combined = `${baseText} ${currentSpoken}`;
            }
          }
          setText(cleanVoiceDuplicates(combined));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechError(
            "Доступ к микрофону заблокирован. Разрешите доступ в настройках браузера."
          );
        } else if (event.error === "no-speech") {
          // Silent timeout, keep listening or stop gracefully
        } else if (event.error === "network") {
          setSpeechError("Ошибка сети при распознавании голоса.");
        } else {
          setSpeechError(`Ошибка голосового ввода: ${event.error}`);
        }
        setIsListening(false);
        isListeningRef.current = false;
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setSpeechError("Не удалось запустить микрофон. Проверьте разрешения.");
      setIsListening(false);
      isListeningRef.current = false;
      setTimeout(() => setSpeechError(null), 5000);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Abort speech recognition immediately so in-flight speech events don't overwrite empty field
    abortListening();

    const rawTrimmed = text.trim();
    const trimmedText = cleanVoiceDuplicates(rawTrimmed).trim();
    if (!trimmedText || isLoading) return;

    // Clear input state immediately
    setText("");
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }

    onSendMessage(trimmedText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto px-3 sm:px-12 pt-2 pb-3.5 sm:pb-4"
      style={{
        paddingBottom: "max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px))",
      }}
    >
      {/* Speech error banner */}
      {speechError && (
        <div
          id="speech-error-alert"
          className="mb-2.5 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1">{speechError}</span>
          <button
            onClick={() => setSpeechError(null)}
            className="text-rose-500 hover:text-rose-800 font-bold text-sm px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Active listening indicator bar */}
      {isListening && (
        <div
          id="voice-listening-indicator"
          className="mb-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-2 text-rose-700 text-xs font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
            <span>Идет запись... Говорите вопрос (нажмите микрофон для завершения)</span>
          </div>
          <button
            type="button"
            onClick={stopListening}
            className="text-xs text-rose-700 hover:text-rose-900 font-semibold px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 transition"
          >
            Остановить
          </button>
        </div>
      )}

      {/* Main input card */}
      <form
        onSubmit={handleSubmit}
        className={`relative bg-white border-[1.5px] rounded-[12px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] transition-all p-2.5 sm:p-3 flex items-center gap-2 ${
          isListening
            ? "border-rose-400 ring-2 ring-rose-400/20"
            : "border-[#e2e8f0] focus-within:border-[#004b93] focus-within:ring-2 focus-within:ring-[#004b93]/10"
        }`}
      >
        <textarea
          id="chat-textarea-input"
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            // Clean glued duplicate words immediately in case mobile keyboard voice input inserted them
            const val = e.target.value;
            const cleaned = val.replace(
              /(?<!\p{L})([\p{L}0-9]{4,})\1+(?!\p{L})/gui,
              "$1"
            );
            setText(cleaned);
          }}
          onBlur={() => {
            setText((prev) => cleanVoiceDuplicates(prev));
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? "Слушаю ваш вопрос..."
              : "Задайте вопрос по стандартам компании..."
          }
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent text-[#1e293b] placeholder-[#94a3b8] text-[15px] px-2 py-1.5 resize-none focus:outline-hidden max-h-44 disabled:opacity-50"
        />

        {/* Voice Input Button */}
        <button
          id="btn-voice-input"
          type="button"
          onClick={toggleListening}
          disabled={isLoading}
          title={
            !isSpeechSupported
              ? "Голосовой ввод не поддерживается в этом браузере"
              : isListening
              ? "Остановить голосовой ввод"
              : "Голосовой ввод (нажмите и говорите)"
          }
          className={`w-10 h-10 rounded-[8px] flex items-center justify-center transition-all shrink-0 ${
            isListening
              ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs animate-pulse"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isListening ? (
            <MicOff className="w-4 h-4 text-white" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Send Button */}
        <button
          id="btn-send-message"
          type="submit"
          disabled={!text.trim() || isLoading}
          className={`w-10 h-10 rounded-[8px] flex items-center justify-center transition-all shrink-0 ${
            text.trim() && !isLoading
              ? "bg-[#004b93] hover:bg-[#003c77] text-white shadow-xs active:scale-95"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
          title="Отправить вопрос"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#004b93]" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      </div>
  );
};
