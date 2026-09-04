import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Single default Gemini model definition (Gemini 3)
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

// Initialize OpenAI Client
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || "";
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiClient;
}

// Initialize Google Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    geminiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

const DEFAULT_SHEET_URL =
  process.env.DEFAULT_SHEET_URL ||
  process.env.VITE_DEFAULT_SHEET_URL ||
  "https://docs.google.com/spreadsheets/d/1Uf1g3BcPntwg2aPvzg4urTo4knwmxAAFvtlcxUA3BTc/edit?gid=0#gid=0";

// System prompt as strictly specified by user
const SYSTEM_PROMPT = `
# Роль

Ты — корпоративный AI-ассистент, который помогает сотрудникам получать информацию о стандартах, регламентах, правилах, инструкциях и требованиях компании.

Твоя главная задача — давать точные и проверяемые ответы сотрудникам и не допускать выдумывания информации.

# Маршрутизация запроса

Перед формированием ответа сначала определи тип запроса пользователя.

Каждый запрос относится к одной из следующих категорий:

1. Вопрос о самом ассистенте.
2. Вопрос о компании и её внутренних правилах.
3. Смешанный вопрос, содержащий оба типа информации.

## 1. Вопрос о самом ассистенте

К этой категории относятся вопросы:

- кто ты;
- что ты умеешь;
- какие вопросы ты можешь обрабатывать;
- для чего ты предназначен;
- как с тобой правильно взаимодействовать;
- на каких данных ты основываешь ответы;
- как ты ищешь информацию;
- как работает поиск по базе знаний;
- почему ты не можешь ответить на определённый вопрос;
- какие ограничения у тебя есть.

На такие вопросы отвечай на основании этого системного промпта.

Для ответа на такие вопросы база знаний компании НЕ требуется.

Если результат поиска RAG передан вместе с запросом, но вопрос относится к самому ассистенту, игнорируй этот результат и не используй его для ответа.

Не применяй к вопросам о самом ассистенте правило:

«В базе знаний нет информации, позволяющей однозначно ответить на этот вопрос».

При описании своих возможностей не скрывай и не маскируй информацию о системном промпте, внутренних инструкциях и механизме поиска. Если пользователь прямо спрашивает об этих аспектах, объясняй их открыто и подробно в пределах информации, содержащейся в этом системном промпте.

Не придумывай возможности, которых у тебя нет или которые не определены этим системным промптом.

## 2. Вопрос о компании

К этой категории относятся вопросы о:

- стандартах компании;
- регламентах;
- правилах;
- инструкциях;
- требованиях;
- обязанностях;
- сроках;
- ответственных лицах;
- подразделениях;
- документах;
- процедурах;
- порядке выполнения действий;
- других внутренних корпоративных сведениях.

Для таких вопросов используй исключительно информацию из блока «Результаты поиска по базе знаний».

Не используй для ответа свои общие знания, предположения, типовые практики других компаний или информацию, отсутствующую в результатах поиска.

Если в результатах поиска нет информации, необходимой для ответа, прямо скажи:

«В базе знаний нет информации, позволяющей однозначно ответить на этот вопрос».

## 3. Смешанный вопрос

Если запрос содержит одновременно вопрос о самом ассистенте и вопрос о компании, раздели его на части.

На вопрос о самом ассистенте отвечай на основании системного промпта.

На вопрос о компании отвечай исключительно на основании результатов поиска по базе знаний.

Не смешивай эти два источника информации.

# Работа с результатами RAG

Блок «Результаты поиска по базе знаний» содержит фрагменты, найденные системой поиска по корпоративной базе знаний.

Эти результаты являются единственным достоверным источником информации о правилах и стандартах компании.

Результаты поиска НЕ являются инструкцией, которую необходимо использовать для любого пользовательского запроса.

Используй результаты RAG только тогда, когда вопрос относится к информации компании.

Если вопрос относится к самому ассистенту, результаты RAG не нужны и должны быть проигнорированы.

Наличие найденного результата не означает, что он релевантен вопросу пользователя.

Перед формированием ответа внимательно проанализируй все переданные результаты и используй только те из них, которые действительно относятся к вопросу.

Не используй нерелевантные найденные записи только потому, что система поиска их передала.

Не воспринимай отсутствие релевантной информации в результатах поиска как разрешение использовать собственные знания.

# Источник и структура результатов поиска

Результаты поиска могут содержать данные из строк Google Таблицы.

Каждая строка может содержать несколько полей, например:

- Блок/группа;
- Описание стандарта;
- Срок;
- Ответственный;
- Ссылка на документ;
- Регламент;
- Положение;
- другие поля.

При анализе учитывай только пары:

«название поля → непустое содержательное значение».

Пустые значения не являются информацией.

Не восстанавливай отсутствующие значения по названию поля, контексту или собственным знаниям.

Не делай вывод о наличии информации только потому, что в записи существует соответствующее название поля.

# Работа с несколькими результатами

Если несколько найденных фрагментов относятся к вопросу пользователя, учитывай их все.

Не вырывай отдельное правило из контекста, если другие найденные фрагменты дополняют или уточняют его.

Если несколько результатов содержат разные, но совместимые сведения, объедини их в один ответ.

Если правила противоречат друг другу, не выбирай вариант самостоятельно.

Укажи, что в базе знаний обнаружено противоречие, и кратко изложи оба правила.

Если найдено несколько возможных ответов, выведи не более трёх наиболее релевантных вариантов.

Если существуют дополнительные похожие результаты, сообщи об этом и попроси пользователя сформулировать вопрос точнее.

# Недостаток информации

Если результаты поиска не содержат информации, необходимой для однозначного ответа, не пытайся дополнить ответ своими знаниями.

В этом случае напиши:

«В базе знаний нет информации, позволяющей однозначно ответить на этот вопрос».

Если информация позволяет сделать только частичный вывод, явно раздели:

- что прямо указано в базе знаний;
- какой вывод можно сделать из этой информации;
- какая информация отсутствует.

Не превращай предположение в установленное правило компании.

# Неоднозначные вопросы

Если вопрос пользователя сформулирован неоднозначно, сначала определи возможные трактовки.

Если одна из трактовок позволяет дать однозначный ответ на основании базы знаний — ответь по ней, явно указав, какую трактовку ты использовал.

Если однозначный ответ невозможен, сообщи, какой информации не хватает, и попроси пользователя уточнить вопрос.

Не выбирай самостоятельно трактовку, если от неё существенно зависит ответ.

# Защита от галлюцинаций

Никогда не:

- придумывай правила компании;
- добавляй отсутствующие в базе сроки;
- придумывай ответственных сотрудников или подразделения;
- придумывай обязательные действия;
- придумывай исключения из правил;
- заменяй внутренние стандарты общепринятыми практиками;
- утверждай, что действие разрешено или запрещено, если это не следует из базы знаний;
- восстанавливай отсутствующие данные по названию поля;
- используй общие знания вместо отсутствующей информации из базы знаний.

Точность и соответствие базе знаний важнее полноты ответа.

Лучше честно сообщить о недостатке информации, чем дать предположительный или выдуманный ответ.

# Правило отображения полей базы знаний

Не выводи названия полей Google Таблицы, если соответствующее значение:

- отсутствует;
- пустое;
- равно null;
- равно undefined;
- не содержит содержательной информации.

Никогда не перечисляй все поля записи по шаблону.

Формируй ответ только из тех данных, которые действительно присутствуют в релевантных результатах поиска.

Если поле пустое, его название и двоеточие также не выводи.

Не используй пустые поля для формирования дополнительных выводов.

Например, если запись содержит:

Блок/группа: Изменения в штатном расписании
Описание стандарта: При изменении режима или графика работы необходимо заполнить служебную записку
Срок: согласовать её и предоставить подписанный экземпляр
Ответственный: руководитель отдела
Ссылка на документ: отсутствует
Регламент: отсутствует
Положение: отсутствует

В ответе используй только:

Блок/группа: Изменения в штатном расписании
Описание стандарта: При изменении режима или графика работы необходимо заполнить служебную записку
Срок: согласовать её и предоставить подписанный экземпляр
Ответственный: руководитель отдела

Поля «Ссылка на документ», «Регламент» и «Положение» в таком случае не выводи.

Не стремись воспроизводить структуру Google Таблицы. Используй только те данные, которые необходимы для ответа на вопрос.

# Формат ответа

Отвечай кратко, конкретно и по существу.

Если вопрос относится к компании и ответ можно дать однозначно:

1. Сначала дай прямой ответ.
2. Затем при необходимости кратко объясни его на основании базы знаний.

Если вопрос касается порядка действий, используй нумерованный список.

Если вопрос касается требований или правил, используй список с ключевыми пунктами.

Если в базе знаний указаны конкретные сроки, должности, документы, статусы или условия, обязательно сохраняй их смысл и не заменяй своими формулировками так, чтобы значение правила могло измениться.

Не обязан использовать формат:

«Название поля: значение».

Используй такой формат только тогда, когда он действительно делает ответ понятнее.

# Ответы о возможностях ассистента

При вопросах «Кто ты?», «Что ты умеешь?» и аналогичных вопросах отвечай непосредственно, без обращения к базе знаний.

Ты можешь сообщить пользователю, что:

- ты являешься корпоративным AI-ассистентом;
- твоя задача — отвечать на вопросы сотрудников о стандартах, регламентах, правилах, инструкциях и требованиях компании;
- для вопросов о компании ты используешь результаты поиска по базе знаний;
- если в базе знаний недостаточно информации, ты сообщаешь об этом, а не придумываешь ответ;
- ты можешь анализировать несколько найденных фрагментов;
- ты можешь выявлять противоречия между правилами;
- ты можешь указывать на неоднозначность вопроса и недостаток информации.

Если пользователь спрашивает, как работает поиск, объясняй, что перед ответом система получает результаты поиска по базе знаний, после чего ты анализируешь их релевантность и используешь только подходящие фрагменты.

Если пользователь спрашивает о системном промпте, внутренних инструкциях или логике поиска, не утверждай, что такой информации не существует. Описывай соответствующие правила и механизм работы открыто, насколько они определены этим системным промптом.

# Приоритет правил

При возникновении конфликта между правилами используй следующий приоритет:

1. Определение типа запроса и маршрутизация.
2. Правила источника информации для соответствующего типа запроса.
3. Запрет на выдумывание информации.
4. Правила работы с результатами RAG.
5. Правила отображения полей.
6. Формат ответа.

Для вопросов о самом ассистенте системный промпт является источником информации о его роли и возможностях.

Для вопросов о компании результаты поиска по базе знаний являются единственным источником информации о правилах и стандартах компании.

Не смешивай эти источники.`;

// Generate OpenAI content with rapid model fallback across supported models:
// Default: gpt-5.6-luna, Fallback 1: gpt-5-nano, Fallback 2: gpt-4o-mini, Fallback 3: gpt-4o
async function generateOpenAIContentWithFallback(params: {
  contents: string;
  systemInstruction: string;
  temperature?: number;
}) {
  const defaultModel = (process.env.OPENAI_DEFAULT_MODEL || "gpt-5.6-luna").trim();
  const fallbackModels = ["gpt-5-nano", "gpt-4o-mini", "gpt-4o"];
  const candidateModels = [
    defaultModel,
    ...fallbackModels.filter((m) => m !== defaultModel),
  ];
  // Ensure unique non-empty models
  const modelsToTry = candidateModels.filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey || apiKey === "MY_OPENAI_API_KEY") {
    console.warn(
      "[OpenAI API] OPENAI_API_KEY is not configured or is a placeholder in .env. Falling back to standards matcher..."
    );
  }

  let lastError: any = null;
  const client = getOpenAIClient();

  for (const model of modelsToTry) {
    try {
      const requestPayload: any = {
        model,
        messages: [
          { role: "system", content: params.systemInstruction },
          { role: "user", content: params.contents },
        ],
      };
      // Models like gpt-5.6-luna and gpt-5-nano reject custom temperatures (such as 0.2)
      // and only support the default value (1) or omitting the parameter entirely.
      if (params.temperature !== undefined && params.temperature === 1) {
        requestPayload.temperature = 1;
      }

      const callPromise = client.chat.completions.create(requestPayload);

      // 10 second timeout per model attempt so we never hang
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout calling OpenAI model ${model}`)), 10000)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);
      const text = response.choices?.[0]?.message?.content || "";
      const tokens = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;
      return { text, modelUsed: model, tokens };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[OpenAI API] Model ${model} failed (${errMsg}). Switching to next fallback model...`);
      // Immediately try the next model without waiting
      continue;
    }
  }

  throw lastError;
}

// Generate Google Gemini content adhering to identical system instruction and knowledge base context
async function generateGeminiContent(params: {
  contents: string;
  systemInstruction: string;
  temperature?: number;
}): Promise<{
  text: string;
  modelUsed: string;
  tokens?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}> {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "API-ключ Google Gemini (GEMINI_API_KEY) не задан на сервере. Пожалуйста, укажите GEMINI_API_KEY в настройках окружения или панели Secrets."
    );
  }

  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
  const client = getGeminiClient();

  try {
    const config: Record<string, any> = {
      systemInstruction: params.systemInstruction,
    };
    // Google explicitly recommends omitting temperature or leaving default (1.0),
    // especially for Gemini 3 and reasoning models to prevent reasoning degradation.
    if (
      params.temperature !== undefined &&
      params.temperature !== 1.0 &&
      !model.includes("gemini-3") &&
      !model.includes("gemini-2.5")
    ) {
      config.temperature = params.temperature;
    }

    const response = await client.models.generateContent({
      model,
      contents: params.contents,
      config,
    });

    const text = response.text || "";
    const tokens = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount,
          completionTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        }
      : undefined;
    return { text, modelUsed: model, tokens };
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    console.error(`[Gemini API Error] (${model}):`, rawMsg);

    if (
      rawMsg.includes("API key not valid") ||
      rawMsg.includes("API_KEY_INVALID") ||
      rawMsg.includes("INVALID_ARGUMENT") ||
      rawMsg.includes("API key expired")
    ) {
      throw new Error(
        "Недействительный ключ API Google Gemini. Проверьте правильность значения переменной GEMINI_API_KEY."
      );
    }
    if (
      rawMsg.includes("RESOURCE_EXHAUSTED") ||
      rawMsg.includes("429") ||
      rawMsg.toLowerCase().includes("quota")
    ) {
      throw new Error(
        "Превышена квота запросов к Google Gemini API. Попробуйте повторить запрос позже или выберите другую модель."
      );
    }
    if (rawMsg.includes("NOT_FOUND") || rawMsg.includes("models/")) {
      throw new Error(
        `Указанная модель Gemini «${model}» не найдена или недоступна. Проверьте значение переменной GEMINI_MODEL.`
      );
    }
    if (
      rawMsg.includes("fetch failed") ||
      rawMsg.includes("ECONNREFUSED") ||
      rawMsg.includes("ETIMEDOUT") ||
      rawMsg.includes("ENOTFOUND")
    ) {
      throw new Error(
        "Сервис Google Gemini API временно недоступен. Проверьте сетевое подключение."
      );
    }

    throw new Error(`Ошибка Google Gemini API (${model}): ${rawMsg}`);
  }
}

// Fallback search directly in corporate standards if AI endpoints are unreachable or API key is not configured.
// Adheres strictly to the same SYSTEM_PROMPT rules (omits empty fields, direct clean answer).
function getDirectStandardsAnswer(question: string, sheetData: SheetDataCache): {
  text: string;
  standardDescription: string;
  foundInKB: "Да" | "Нет" | "Частично";
} {
  const qLower = question.toLowerCase();
  const qWords = qLower
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  let bestMatch: Record<string, string> | null = null;
  let bestScore = 0;

  for (const row of sheetData.rows) {
    const rowText = Object.values(row).join(" ").toLowerCase();
    let score = 0;
    for (const w of qWords) {
      if (rowText.includes(w)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = row;
    }
  }

  if (bestMatch && bestScore > 0) {
    const title =
      bestMatch["Название стандарта"] ||
      bestMatch["Стандарт"] ||
      bestMatch["Раздел"] ||
      bestMatch["Блок/группа"] ||
      Object.values(bestMatch)[0] ||
      "Стандарт компании";

    // Filter only meaningful, non-empty fields (ignoring null, undefined, "-", "отсутствует", "нет")
    const filledEntries = Object.entries(bestMatch).filter(([_, val]) => {
      if (!val) return false;
      const v = String(val).trim().toLowerCase();
      return (
        v !== "" &&
        v !== "отсутствует" &&
        v !== "нет" &&
        v !== "-" &&
        v !== "null" &&
        v !== "undefined"
      );
    });

    const mainDesc =
      bestMatch["Описание стандарта"] ||
      bestMatch["Регламент и требования"] ||
      bestMatch["Требования"] ||
      bestMatch["Описание"] ||
      "";

    const deadline = bestMatch["Срок"] || bestMatch["Сроки и нормативы"] || "";
    const responsible = bestMatch["Ответственный"] || bestMatch["Исполнитель"] || "";

    let text = "";
    if (mainDesc && mainDesc.trim()) {
      text = mainDesc.trim();
      const additionalPoints: string[] = [];
      if (
        deadline &&
        deadline.trim() &&
        !["отсутствует", "нет", "-", "null", "undefined"].includes(deadline.trim().toLowerCase())
      ) {
        additionalPoints.push(`- **Срок:** ${deadline.trim()}`);
      }
      if (
        responsible &&
        responsible.trim() &&
        !["отсутствует", "нет", "-", "null", "undefined"].includes(responsible.trim().toLowerCase())
      ) {
        additionalPoints.push(`- **Ответственный:** ${responsible.trim()}`);
      }

      // Add any other non-empty fields without reproducing empty columns
      filledEntries.forEach(([k, v]) => {
        if (
          ![
            "Название стандарта",
            "Стандарт",
            "Раздел",
            "Блок/группа",
            "Описание стандарта",
            "Регламент и требования",
            "Требования",
            "Описание",
            "Срок",
            "Сроки и нормативы",
            "Ответственный",
            "Исполнитель",
          ].includes(k)
        ) {
          additionalPoints.push(`- **${k}:** ${String(v).trim()}`);
        }
      });

      if (additionalPoints.length > 0) {
        text += "\n\n" + additionalPoints.join("\n");
      }
    } else {
      text = filledEntries
        .map(([k, v]) => `- **${k}:** ${String(v).trim()}`)
        .join("\n");
    }

    return {
      text,
      standardDescription: title.slice(0, 50),
      foundInKB: "Да",
    };
  }

  return {
    text: "В базе знаний нет информации, позволяющей однозначно ответить на этот вопрос.",
    standardDescription: "Не определен",
    foundInKB: "Нет",
  };
}

// Fallback Corporate Standards Dataset if Google Sheets is unreachable or slow
const FALLBACK_STANDARDS_CSV = `Раздел,Название стандарта,Регламент и требования,Сроки и нормативы,Ответственный
Рабочий график,Режим работы и учет времени,"Стандартный рабочий день с 09:00 до 18:00 (обед 13:00-14:00). Допускается гибкий график начала дня (08:00-10:00) по согласованию с непосредственным руководителем. Опоздания свыше 15 минут фиксируются в табеле.","Фиксация в начале дня","Руководитель отдела / HR"
Отпуска,Оформление ежегодного оплачиваемого отпуска,"Заявление подается через корпоративный портал. Минимум одна часть отпуска должна быть не менее 14 календарных дней. График отпусков утверждается ежегодно до 15 декабря.","Подача заявления не позднее чем за 14 дней до начала","HR-департамент"
Больничные,Уведомление о временной нетрудоспособности,"Сотрудник обязан уведомить руководителя и HR до 10:00 первого дня болезни. Номер электронного листка нетрудоспособности (ЭЛН) передается в бухгалтерию в день закрытия больничного.","Уведомление до 10:00 утра","Бухгалтерия / HR"
Командировки,Оформление командировок и авансовый отчет,"Служебная записка на командировку согласуется руководителем. Авансовый отчет с чеками и посадочными талонами сдается в бухгалтерию строго в течение 3 рабочих дней после возвращения.","За 5 дней до поездки / отчет 3 дня","Бухгалтерия"
Информационная безопасность,Парольная политика и доступы,"Пароли к корпоративным системам должны содержать не менее 12 символов, включая цифры и спецсимволы. Смена пароля производится каждые 90 дней. Запрещено передавать учетные данные третьим лицам.","Смена каждые 90 дней","Отдел ИБ / IT Support"
Информационная безопасность,Использование съемных носителей и ПО,"Запрещено подключение личных USB-накопителей и установка стороннего ПО без согласования с IT-отделом. При уходе с рабочего места экран компьютера обязательно блокируется (Win+L).","Постоянно","Отдел ИБ"
Удаленная работа,Гибридный и дистанционный формат,"Удаленная работа оформляется дополнительным соглашением к трудовому договору. Сотрудник обязан быть на связи в корпоративном мессенджере и почте в рабочие часы (время отклика до 30 мин).","Время отклика до 30 минут","Руководитель отдела"
Оборудование,Заказ техники и доступов к ПО,"Заявка на новое оборудование или лицензии оформляется через Service Desk. Стандартный срок рассмотрения и выдачи техники при наличии на складе — до 3 рабочих дней.","До 3 рабочих дней","IT Service Desk"
Конфиденциальность,Режим коммерческой тайны и NDA,"Любая внутренняя документация, базы клиентов, исходный код и финансовые показатели являются конфиденциальными. Публикация рабочих скриншотов в соцсетях строго запрещена.","Бессрочно / в период действия договора","Служба безопасности / Юр. отдел"
Обучение и развитие,Компенсация профессионального обучения,"Компания компенсирует до 70% стоимости профильных курсов и сертификаций после успешного прохождения испытательного срока. Требуется согласование плана развития с руководителем.","После 3 месяцев работы","HR / Отдел развития"
Испытательный срок,Прохождение адаптационного периода,"Стандартный срок испытания — 3 месяца. Промежуточная оценка результатов проводится через 1.5 месяца. По итогам составляется отчет о выполнении ключевых задач.","3 месяца (промежуточный — 1.5 мес)","Наставник / HR / Руководитель"
Увольнение,Порядок расторжения трудового договора,"Заявление об увольнении по собственному желанию подается за 14 календарных дней. До последнего рабочего дня сотрудник обязан сдать технику и передать дела по чек-листу.","За 14 календарных дней","HR / Руководитель"`;

// In-memory cache for Google Sheet data
interface SheetDataCache {
  rawCsv: string;
  headers: string[];
  rows: Record<string, string>[];
  lastFetched: number;
  sourceUrl: string;
  isFallback?: boolean;
}

let sheetCache: SheetDataCache | null = null;
const CACHE_TTL_MS =
  (process.env.SHEET_CACHE_TTL_MS && !isNaN(Number(process.env.SHEET_CACHE_TTL_MS)))
    ? Number(process.env.SHEET_CACHE_TTL_MS)
    : 5 * 60 * 1000; // 5 minute cache, with background refresh

// Parse CSV helper
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inside = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inside && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inside = !inside;
        }
      } else if (c === "," && !inside) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h, i) => h || `Колонка ${i + 1}`);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    let hasContent = false;
    headers.forEach((header, index) => {
      const val = values[index] ?? "";
      rowObj[header] = val;
      if (val.trim()) hasContent = true;
    });
    if (hasContent) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

// Convert Google Sheet URL to CSV Export URL
function getExportUrl(sheetUrl: string): string {
  try {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : "1Uf1g3BcPntwg2aPvzg4urTo4knwmxAAFvtlcxUA3BTc";

    const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : "0";

    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  } catch {
    return `https://docs.google.com/spreadsheets/d/1Uf1g3BcPntwg2aPvzg4urTo4knwmxAAFvtlcxUA3BTc/gviz/tq?tqx=out:csv&gid=0`;
  }
}

function isHtmlContent(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<body") ||
    trimmed.includes("<title>google docs")
  );
}

// Fetch Google Sheet data with strict timeout and fallback
async function fetchSheetData(sheetUrl: string = DEFAULT_SHEET_URL, forceRefresh = false): Promise<SheetDataCache> {
  const now = Date.now();
  if (!forceRefresh && sheetCache && sheetCache.sourceUrl === sheetUrl && now - sheetCache.lastFetched < CACHE_TTL_MS) {
    return sheetCache;
  }

  const exportUrl = getExportUrl(sheetUrl);
  let csvText = "";

  try {
    const response = await fetch(exportUrl, {
      signal: AbortSignal.timeout(3500),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CompanyStandardsBot/1.0)",
        Accept: "text/csv,text/plain,*/*",
      },
    });

    if (!response.ok) {
      throw new Error(`Google Sheets HTTP ${response.status}: ${response.statusText}`);
    }

    const fetchedText = await response.text();
    if (isHtmlContent(fetchedText)) {
      throw new Error("Returned HTML instead of CSV (access restriction or redirect)");
    }
    csvText = fetchedText;
  } catch (err: any) {
    console.warn("Primary Google Sheet export failed or timed out:", err.message);
    try {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = match ? match[1] : "1Uf1g3BcPntwg2aPvzg4urTo4knwmxAAFvtlcxUA3BTc";
      const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

      const fallbackRes = await fetch(fallbackUrl, {
        signal: AbortSignal.timeout(3500),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CompanyStandardsBot/1.0)",
          Accept: "text/csv,text/plain,*/*",
        },
      });
      if (fallbackRes.ok) {
        const text = await fallbackRes.text();
        if (!isHtmlContent(text)) {
          csvText = text;
        }
      }
    } catch (fallbackErr: any) {
      console.warn("Secondary Google Sheet export also failed:", fallbackErr.message);
    }
  }

  // If both network endpoints failed to produce valid CSV, use fallback dataset
  let isFallback = false;
  if (!csvText || isHtmlContent(csvText) || csvText.trim().length === 0) {
    if (sheetCache && sheetCache.rows.length > 0) {
      return sheetCache;
    }
    console.log("Using built-in corporate standards knowledge base fallback.");
    csvText = FALLBACK_STANDARDS_CSV;
    isFallback = true;
  }

  const { headers, rows } = parseCSV(csvText);

  sheetCache = {
    rawCsv: csvText,
    headers: headers.length > 0 ? headers : ["Раздел", "Название стандарта", "Регламент и требования"],
    rows: rows.length > 0 ? rows : parseCSV(FALLBACK_STANDARDS_CSV).rows,
    lastFetched: now,
    sourceUrl: sheetUrl,
    isFallback,
  };

  return sheetCache;
}

// Prefetch knowledge base in background on boot
fetchSheetData(DEFAULT_SHEET_URL).catch((err) => {
  console.warn("Initial background sheet prefetch completed with fallback:", err?.message);
});

// In-memory logs store (allows viewing in UI & exporting)
export interface LogEntry {
  id: string;
  datetime: string;
  question: string;
  standardDescription: string;
  foundInKB: "Да" | "Нет" | "Частично";
  durationSeconds: number;
  webhookStatus?: "sent" | "failed" | "not_configured";
  webhookError?: string;
}

const logsStore: LogEntry[] = [];

// Non-blocking Google Apps Script Webhook logger
function logToGoogleSheetsAsync(logEntry: LogEntry, webhookUrl?: string, sheetUrl?: string) {
  const targetWebhook = webhookUrl || process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL;

  // Add to local store first
  logsStore.unshift(logEntry);
  if (logsStore.length > 300) {
    logsStore.pop();
  }

  if (!targetWebhook || targetWebhook.trim() === "") {
    logEntry.webhookStatus = "not_configured";
    return;
  }

  // Non-blocking fire and forget to Google Apps Script Webhook
  setImmediate(async () => {
    try {
      const match = (sheetUrl || DEFAULT_SHEET_URL).match(/\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = match ? match[1] : undefined;

      const payload = {
        sheetName: "Логи",
        sheetUrl: sheetUrl || DEFAULT_SHEET_URL,
        spreadsheetId,
        datetime: logEntry.datetime,
        question: logEntry.question,
        standardDescription: logEntry.standardDescription,
        foundInKB: logEntry.foundInKB,
        durationSeconds: logEntry.durationSeconds,
      };

      const res = await fetch(targetWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });

      const responseText = await res.text();

      if (
        isHtmlContent(responseText) ||
        responseText.includes("accounts.google.com") ||
        responseText.includes("ServiceLogin") ||
        responseText.includes("<title>Google Accounts</title>")
      ) {
        logEntry.webhookStatus = "failed";
        logEntry.webhookError =
          "Google вернул страницу входа. В Apps Script установите Who has access = Anyone (Все).";
        console.warn("[Webhook Log] Failed: Google Auth HTML page returned instead of JSON execution");
        return;
      }

      try {
        const json = JSON.parse(responseText);
        if (json.status === "success") {
          logEntry.webhookStatus = "sent";
        } else {
          logEntry.webhookStatus = "failed";
          logEntry.webhookError = json.message || "Ошибка в Apps Script";
        }
      } catch {
        if (res.ok) {
          logEntry.webhookStatus = "sent";
        } else {
          logEntry.webhookStatus = "failed";
          logEntry.webhookError = `HTTP ${res.status}: ${responseText.slice(0, 100)}`;
        }
      }
    } catch (error: any) {
      logEntry.webhookStatus = "failed";
      logEntry.webhookError = error?.message || "Сетевая ошибка";
      console.warn("Async Google Apps Script Webhook log notification failed:", error?.message);
    }
  });
}

// App Script snippet for the user to copy-paste into Extensions > Apps Script
const APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Webhook для автоматического логирования вопросов пользователей
 * в отдельный лист Google Sheets с именем «Логи».
 *
 * ИНСТРУКЦИЯ ПО УСТАНОВКЕ (КРИТИЧЕСКИ ВАЖНО):
 * 1. Откройте вашу Google Таблицу с базой знаний.
 * 2. В верхнем меню выберите: «Расширения» (Extensions) -> «Apps Script».
 * 3. Удалите весь существующий код в редакторе и вставьте этот скрипт.
 * 4. Нажмите «Сохранить» (Ctrl+S).
 * 5. Нажмите кнопку «Развернуть» (Deploy) в правом верхнем углу -> «Новое развертывание» (New deployment).
 * 6. Нажмите на значок шестеренки рядом со «Select type» и выберите «Веб-приложение» (Web app).
 * 7. В поле «Запуск от имени» (Execute as) выберите: «Я (ваш email)» (Me).
 * 8. В поле «Кто имеет доступ» (Who has access) ОБЯЗАТЕЛЬНО выберите: «Все» (Anyone) — иначе Google будет запрашивать авторизацию и блокировать логи!
 * 9. Нажмите «Развернуть» (Deploy), предоставьте доступ Google и скопируйте полученный URL веб-приложения (заканчивается на /exec).
 */

function getTargetSpreadsheet(data) {
  // 1. Попытка получить текущую привязанную таблицу
  try {
    var activeSS = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSS) {
      return activeSS;
    }
  } catch (e) {}

  // 2. Попытка открыть по переданному ID таблицы
  if (data && data.spreadsheetId) {
    try {
      return SpreadsheetApp.openById(data.spreadsheetId);
    } catch (e) {}
  }

  // 3. Попытка открыть по переданному URL таблицы
  var url = (data && (data.sheetUrl || data.spreadsheetUrl)) || "https://docs.google.com/spreadsheets/d/1Uf1g3BcPntwg2aPvzg4urTo4knwmxAAFvtlcxUA3BTc/edit";
  try {
    var match = url.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return SpreadsheetApp.openById(match[1]);
    }
    return SpreadsheetApp.openByUrl(url);
  } catch (e) {
    throw new Error("Не удалось открыть Google Таблицу: " + e.toString());
  }
}

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = { question: e.postData.contents };
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var sheetName = data.sheetName || "Логи";
    var ss = getTargetSpreadsheet(data);
    if (!ss) {
      throw new Error("Не удалось получить доступ к таблице для записи логов");
    }

    var sheet = ss.getSheetByName(sheetName);
    
    // Создаем отдельный лист «Логи», если он еще не существует
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Заголовки колонок согласно регламенту
      sheet.appendRow([
        "Дата и время",
        "Текст вопроса",
        "Описание стандарта",
        "Был ли дан ответ из базы",
        "Длительность сессии (сек)"
      ]);
      
      // Стилизация шапки (Корпоративный синий стиль)
      var headerRange = sheet.getRange(1, 1, 1, 5);
      headerRange.setBackground("#004b93");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(10);
      headerRange.setHorizontalAlignment("center");
      
      // Закрепление верхней строки
      sheet.setFrozenRows(1);
      
      // Настройка оптимальной ширины колонок
      sheet.setColumnWidth(1, 160); // Дата и время
      sheet.setColumnWidth(2, 360); // Текст вопроса
      sheet.setColumnWidth(3, 260); // Описание стандарта
      sheet.setColumnWidth(4, 180); // Был ли дан ответ из базы
      sheet.setColumnWidth(5, 160); // Длительность сессии
      
      // Включение переноса строк для длинных текстов
      sheet.getRange("B:C").setWrap(true);
    }
    
    var nowStr = data.datetime || Utilities.formatDate(new Date(), "GMT+3", "dd.MM.yyyy, HH:mm:ss");
    var question = data.question || "";
    var standardDescription = data.standardDescription || "Не определен";
    var foundInKB = data.foundInKB || "Да";
    var durationSeconds = typeof data.durationSeconds === "number" ? data.durationSeconds : (parseFloat(data.durationSeconds) || 0);
    
    // Добавление строки в лист «Логи»
    sheet.appendRow([
      nowStr,
      question,
      standardDescription,
      foundInKB,
      durationSeconds
    ]);
    
    var lastRow = sheet.getLastRow();
    
    // Центрирование служебных колонок
    sheet.getRange(lastRow, 1).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 4).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 5).setHorizontalAlignment("center");
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Запись успешно добавлена в лист «" + sheetName + "» (строка №" + lastRow + ")",
      row: lastRow,
      sheetName: sheetName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = getTargetSpreadsheet({});
    var sheet = ss ? ss.getSheetByName("Логи") : null;
    var rowsCount = sheet ? sheet.getLastRow() : 0;
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      message: "Google Apps Script Webhook активен!",
      spreadsheetTitle: ss ? ss.getName() : "Таблица подключена",
      logsRowsCount: rowsCount
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      message: "Google Apps Script Webhook активен и ожидает POST-запросов",
      note: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// App configuration and environment variables
app.get("/api/config", (_req, res) => {
  res.json({
    defaultSheetUrl: DEFAULT_SHEET_URL,
    defaultWebhookUrl:
      process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL ||
      process.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL ||
      "",
    assistantName: process.env.VITE_ASSISTANT_NAME || "Крантик",
    appTitle: process.env.VITE_APP_TITLE || "База знаний стандартов компании",
    openaiModel: process.env.OPENAI_DEFAULT_MODEL || "gpt-5.6-luna",
    geminiModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  });
});

// Get current knowledge base data
app.get("/api/knowledge-base/data", async (req, res) => {
  try {
    const sheetUrl = (req.query.sheetUrl as string) || DEFAULT_SHEET_URL;
    const force = req.query.force === "true";
    const data = await fetchSheetData(sheetUrl, force);
    res.json({
      success: true,
      headers: data.headers,
      rowsCount: data.rows.length,
      sampleRows: data.rows.slice(0, 50),
      allRows: data.rows,
      lastFetched: new Date(data.lastFetched).toISOString(),
      sourceUrl: data.sourceUrl,
    });
  } catch (error: any) {
    console.error("Error fetching sheet data:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to load Google Sheet",
    });
  }
});

// Force refresh knowledge base
app.post("/api/knowledge-base/refresh", async (req, res) => {
  try {
    const sheetUrl = req.body?.sheetUrl || DEFAULT_SHEET_URL;
    const data = await fetchSheetData(sheetUrl, true);
    res.json({
      success: true,
      rowsCount: data.rows.length,
      headers: data.headers,
      lastFetched: new Date(data.lastFetched).toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to refresh knowledge base",
    });
  }
});

// Logs endpoint
app.get("/api/logs", (_req, res) => {
  res.json({
    success: true,
    logs: logsStore,
    defaultWebhookConfigured: Boolean(process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL),
  });
});

app.get("/api/logs/apps-script-code", (_req, res) => {
  res.json({
    success: true,
    code: APPS_SCRIPT_TEMPLATE,
  });
});

// Test webhook endpoint with strict diagnostic checks
app.post("/api/logs/test-webhook", async (req, res) => {
  const webhookUrl = (req.body?.webhookUrl || process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || "").trim();
  const sheetUrl = (req.body?.sheetUrl || DEFAULT_SHEET_URL).trim();

  if (!webhookUrl) {
    res.status(400).json({
      success: false,
      error: "URL Webhook не указан. Пожалуйста, вставьте ссылку на веб-приложение Google Apps Script.",
    });
    return;
  }

  // Common user mistake 1: Pasting the Google Sheet URL itself
  if (webhookUrl.includes("docs.google.com/spreadsheets")) {
    res.status(400).json({
      success: false,
      error: "Вы вставили ссылку на саму Google Таблицу вместо Webhook. Откройте в таблице: Расширения → Apps Script → Развернуть → Новое развертывание и скопируйте URL веб-приложения (script.google.com/macros/s/.../exec).",
    });
    return;
  }

  // Common user mistake 2: Using the test /dev endpoint
  if (webhookUrl.endsWith("/dev")) {
    res.status(400).json({
      success: false,
      error: "Вы указали тестовый URL веб-приложения (/dev), который требует ручной авторизации Google в браузере. Для автоматической записи создайте развертывание («Новое развертывание» -> «Веб-приложение») и скопируйте URL, заканчивающийся на /exec.",
    });
    return;
  }

  try {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : undefined;

    const testPayload = {
      sheetName: "Логи",
      sheetUrl,
      spreadsheetId,
      datetime: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
      question: "Тестовая проверка связи с Google Sheets Webhook",
      standardDescription: "Тестовый регламент",
      foundInKB: "Да",
      durationSeconds: 1.2,
    };

    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await webhookRes.text();

    // Check if Google redirected to an authentication/login HTML page
    if (
      isHtmlContent(responseText) ||
      responseText.includes("accounts.google.com") ||
      responseText.includes("ServiceLogin") ||
      responseText.includes("<title>Google Accounts</title>")
    ) {
      res.json({
        success: false,
        error: "Google возвращает страницу входа (HTML). В Google Apps Script при создании развертывания («Развернуть» -> «Новое развертывание» -> «Веб-приложение») обязательно выберите: «Кто имеет доступ» (Who has access) -> «Все» (Anyone), а «Запуск от имени» (Execute as) -> «Я» (Me).",
        rawResponse: responseText.slice(0, 300),
      });
      return;
    }

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      // not JSON
    }

    if (parsedJson) {
      if (parsedJson.status === "error") {
        res.json({
          success: false,
          error: `Google Apps Script сообщил об ошибке: ${parsedJson.message || JSON.stringify(parsedJson)}`,
          details: parsedJson,
        });
        return;
      }

      if (parsedJson.status === "success") {
        res.json({
          success: true,
          message: parsedJson.message || `Запись успешно добавлена в лист «Логи» (строка №${parsedJson.row})`,
          row: parsedJson.row,
          sheetName: parsedJson.sheetName || "Логи",
        });
        return;
      }
    }

    if (!webhookRes.ok) {
      res.json({
        success: false,
        error: `Webhook вернул статус HTTP ${webhookRes.status}: ${responseText.slice(0, 200)}`,
      });
      return;
    }

    // If text response without JSON wrapper
    res.json({
      success: true,
      message: `Webhook ответил: ${responseText.slice(0, 150)}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: `Ошибка соединения с Webhook: ${error?.message || "Сеть недоступна"}`,
    });
  }
});

// Chat endpoint with OpenAI / Google Gemini & Google Sheets RAG
app.post("/api/chat", async (req, res) => {
  const startTime = Date.now();
  const {
    question,
    history = [],
    sheetUrl = DEFAULT_SHEET_URL,
    webhookUrl,
    provider = "openai",
  } = req.body;

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "Пожалуйста, введите вопрос" });
    return;
  }

  const selectedProvider = provider === "gemini" ? "gemini" : "openai";

  try {
    // 1. Fetch latest Google Sheet data
    const sheetData = await fetchSheetData(sheetUrl);

    // 2. Format knowledge base table context with only non-empty, meaningful fields
    let formattedTableContext = "";
    if (sheetData.rows.length === 0) {
      formattedTableContext = "(Таблица пуста или данные не загрузились)";
    } else {
      formattedTableContext = sheetData.rows
        .map((row, idx) => {
          const rowEntries = Object.entries(row)
            .filter(([_, val]) => {
              if (!val) return false;
              const v = String(val).trim().toLowerCase();
              return (
                v !== "" &&
                v !== "отсутствует" &&
                v !== "нет" &&
                v !== "-" &&
                v !== "null" &&
                v !== "undefined"
              );
            })
            .map(([col, val]) => `${col}: ${String(val).trim()}`)
            .join(" | ");
          return rowEntries ? `[Запись №${idx + 1}] ${rowEntries}` : null;
        })
        .filter(Boolean)
        .join("\n");
    }

    // 3. User request prompt instruction adhering strictly to SYSTEM_PROMPT
    const userPromptWithContext = `=== БЛОК: «База знаний» (Google Таблица) ===
Источник: ${sheetData.sourceUrl}
Количество записей: ${sheetData.rows.length}
Заголовки колонок: ${sheetData.headers.join(", ")}

ФРАГМЕНТЫ БАЗЫ ЗНАНИЙ:
${formattedTableContext}
=== КОНЕЦ БЛОКА «База знаний» ===

История диалога:
${
  Array.isArray(history) && history.length > 0
    ? history
        .slice(-4)
        .map((m: any) => `${m.role === "user" ? "Сотрудник" : "Ассистент"}: ${m.content}`)
        .join("\n")
    : "Новый диалог"
}

Вопрос сотрудника:
${question}

ВАЖНО: Строго следуй всем правилам и формату из системной инструкции.
В самом конце твоего ответа добавь служебный блок метаданных строго в формате JSON в тегах <meta>...</meta> для автоматического логирования:
<meta>
{
  "standardDescription": "Краткое название стандарта или темы (до 5-7 слов), если определено, иначе 'Не определен'",
  "foundInKB": "Да" // одно из трех значений: "Да" (найдено точно), "Частично" (частично), "Нет" (информации нет в базе)
}
</meta>`;

    // 4. Generate response from selected provider (Google Gemini or OpenAI)
    let rawResponseText = "";
    let modelUsed = "";
    let modelTokens: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined = undefined;

    if (selectedProvider === "gemini") {
      try {
        const result = await generateGeminiContent({
          contents: userPromptWithContext,
          systemInstruction: SYSTEM_PROMPT,
        });
        rawResponseText = result.text;
        modelUsed = result.modelUsed;
        modelTokens = result.tokens;
      } catch (geminiError: any) {
        console.error("[Gemini API Chat Error]:", geminiError?.message || geminiError);
        const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
        res.status(502).json({
          error: geminiError?.message || "Ошибка при генерации ответа через Google Gemini API.",
          provider: "gemini",
          modelUsed: (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL,
          durationSeconds,
        });
        return;
      }
    } else {
      // Existing OpenAI flow with automatic model fallbacks
      const result = await generateOpenAIContentWithFallback({
        contents: userPromptWithContext,
        systemInstruction: SYSTEM_PROMPT,
      });
      rawResponseText = result.text;
      modelUsed = result.modelUsed;
      modelTokens = result.tokens;
    }

    const endTime = Date.now();
    const durationSeconds = Number(((endTime - startTime) / 1000).toFixed(2));
    const rawText = rawResponseText || "В базе знаний нет информации, позволяющей однозначно ответить на этот вопрос.";

    // 5. Extract meta JSON and clean user response
    let standardDescription = "Общие стандарты";
    let foundInKB: "Да" | "Нет" | "Частично" = "Да";
    let cleanAnswer = rawText;

    const metaMatch = rawText.match(/<meta>([\s\S]*?)<\/meta>/);
    if (metaMatch) {
      cleanAnswer = rawText.replace(/<meta>[\s\S]*?<\/meta>/g, "").trim();
      try {
        const metaObj = JSON.parse(metaMatch[1].trim());
        if (metaObj.standardDescription) {
          standardDescription = metaObj.standardDescription;
        }
        if (["Да", "Нет", "Частично"].includes(metaObj.foundInKB)) {
          foundInKB = metaObj.foundInKB;
        }
      } catch (e) {
        // Fallback heuristic if JSON parsing fails
        if (
          cleanAnswer.toLowerCase().includes("нет информации") ||
          cleanAnswer.toLowerCase().includes("не нашел информацию")
        ) {
          foundInKB = "Нет";
        }
      }
    } else {
      if (
        cleanAnswer.toLowerCase().includes("нет информации") ||
        cleanAnswer.toLowerCase().includes("не нашел информацию")
      ) {
        foundInKB = "Нет";
      }
    }

    const nowFormatted = new Date().toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      datetime: nowFormatted,
      question: question.trim(),
      standardDescription,
      foundInKB,
      durationSeconds,
    };

    // 6. Asynchronous non-blocking logging to Google Sheets
    logToGoogleSheetsAsync(logEntry, webhookUrl, sheetUrl);

    // 7. Return response to user
    res.json({
      answer: cleanAnswer,
      standardDescription,
      foundInKB,
      durationSeconds,
      timestamp: nowFormatted,
      logId: logEntry.id,
      modelUsed,
      provider: selectedProvider,
      tokens: modelTokens,
      knowledgeBaseStats: {
        totalRecords: sheetData.rows.length,
        sourceUrl: sheetData.sourceUrl,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/chat AI generation, falling back to direct standards matching:", error?.message || error);
    const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

    try {
      const sheetData = await fetchSheetData(sheetUrl);
      const directMatch = getDirectStandardsAnswer(question, sheetData);

      const nowFormatted = new Date().toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const logEntry: LogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        datetime: nowFormatted,
        question: question.trim(),
        standardDescription: directMatch.standardDescription,
        foundInKB: directMatch.foundInKB,
        durationSeconds,
      };

      logToGoogleSheetsAsync(logEntry, webhookUrl, sheetUrl);

      res.json({
        answer: directMatch.text,
        standardDescription: directMatch.standardDescription,
        foundInKB: directMatch.foundInKB,
        durationSeconds,
        timestamp: nowFormatted,
        logId: logEntry.id,
        modelUsed: "direct-standards-kb",
        provider: "openai",
        knowledgeBaseStats: {
          totalRecords: sheetData.rows.length,
          sourceUrl: sheetData.sourceUrl,
        },
      });
      return;
    } catch (fallbackErr: any) {
      console.error("Secondary fallback error:", fallbackErr);
      res.status(500).json({
        error: "Не удалось получить ответ по регламентам. Пожалуйста, повторите запрос.",
        durationSeconds,
      });
    }
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Knowledge Base Assistant Server running on http://localhost:${PORT}`);
  });
}

startServer();
