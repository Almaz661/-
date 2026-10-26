import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { parseWithRuleEngine } from './src/services/aiService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Вспомогательная функция для вызова Gemini с автоматическим каскадом моделей
// при временной недоступности (503, 429 или таймаут)
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    preferredModels?: string[];
    timeoutMs?: number;
  }
) {
  const models = options.preferredModels || [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ];
  let lastError: any = null;

  for (const model of models) {
    try {
      const timeoutMs = options.timeoutMs || 25000;
      const callPromise = ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms for ${model}`)),
          timeoutMs
        )
      );

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      if (response && response.text) {
        return { response, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Модель ${model} вернула ошибку:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Все модели Gemini оказались временно недоступны');
}

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Лимит 50mb для поддержки фото чеков высокого разрешения с современных смартфонов
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Серверный endpoint для автоматического определения геолокации по IP (fallback для iframe и браузеров)
  app.get('/api/detect-location', async (req, res) => {
    try {
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
      const cleanIp = rawIp && !rawIp.includes('127.0.0.1') && !rawIp.includes('::1') ? rawIp : '';

      const queryUrl = cleanIp ? `https://ipwho.is/${cleanIp}?lang=ru` : 'https://ipwho.is/?lang=ru';
      const ipRes = await fetch(queryUrl, {
        headers: { 'User-Agent': 'OneHausFamilyApp/1.0' },
        signal: AbortSignal.timeout(4500),
      });

      if (ipRes.ok) {
        const data = await ipRes.json();
        if (data && data.success !== false && data.latitude && data.longitude) {
          return res.json({
            id: `server_geo_${Date.now()}`,
            name: data.city || data.region || 'Определённый город',
            country: data.country || '',
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      }
    } catch (err: any) {
      console.warn('[Server detect-location] Предупреждение при запросе к ipwho.is:', err?.message || err);
    }

    // Резервный безопасный ответ (Амстердам)
    return res.json({
      id: 'ams',
      name: 'Амстердам',
      country: 'Нидерланды',
      latitude: 52.374,
      longitude: 4.89,
    });
  });

  // Серверный endpoint для интеллектуального разбора Gemini API
  app.post('/api/ai/parse', async (req, res) => {
    const { text, members = [], imageBase64 } = req.body;

    if (!text && !imageBase64) {
      return res.status(400).json({ error: 'Text or image is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Если ключа нет или он плейсхолдер — мгновенный возврат через эвристический парсер
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackResult = parseWithRuleEngine(text || '', members);
      return res.json(fallbackResult);
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const membersList = members
        .map((m: any) => `${m.id}: ${m.name} (${m.role})`)
        .join(', ');

      const prompt = `Ты — встроенный интеллектуальный ассистент домашнего органайзера «Дом без хаоса» (OneHaus «Send it in»).
Пользователь передал команду, голосовую заметку или фото чека (на русском, греческом (Ελληνικά) или английском языке). Твоя цель — извлечь структурированные действия:
- shopping: позиции в список покупок (title: название товара (если чек на греческом/английском, переведи на понятный русский или оставь понятное название), category: produce|dairy|meat|bakery|pantry|household|pharmacy|drinks|other, quantity: количество, listId: 'list-supermarket')
  ВАЖНО: Если пользователь говорит «Добавь в список покупок — соль», создай РОВНО ОДНУ позицию с title: "Соль", category: "pantry". Не создавай лишних задач или дубликатов!
  Если это чек из супермаркета (в т.ч. греческих Sklavenitis, AB Vassilopoulos, Lidl, MyMarket), извлеки купленные товары и разложи по категориям.
- task: бытовые задачи (title, zone, dueDate, priority, assigneeId)
- calendar: события календаря (title, date, startTime, endTime, category, memberIds)
- doc: документы (title, category, documentNumber, expiryDate)
- contact: мастера и службы (name, specialty, category, phone)

Члены семьи:
${membersList}

Сегодняшняя дата: ${new Date().toISOString().split('T')[0]}

Верни ТОЛЬКО валидный JSON (без markdown блоков \`\`\`json) со следующей структурой:
{
  "summary": "Краткое дружелюбное резюме на русском языке",
  "actions": [
    {
      "type": "shopping" | "task" | "calendar" | "doc" | "contact",
      "title": "Краткое понятное название",
      "details": "Подробности (дата, категория, зона)",
      "data": { ... }
    }
  ]
}

Входные данные:
"${text || ''}"`;

      let contents: any;
      if (imageBase64) {
        const mimeType = imageBase64.startsWith('data:image/png')
          ? 'image/png'
          : 'image/jpeg';
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        contents = [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ];
      } else {
        contents = prompt;
      }

      const { response } = await callGeminiWithFallback(ai, {
        contents,
        timeoutMs: 12000,
        preferredModels: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
      });

      const rawText = response.text || '';
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to rule engine:', err?.message || err);
      // При любой ошибке API или сети возвращаем резервный результат без сбоя
      const fallbackResult = parseWithRuleEngine(text || '', members);
      return res.json(fallbackResult);
    }
  });

  // Серверный endpoint для интеллектуального распознавания и категоризации чеков через Gemini API
  app.post('/api/ai/parse-receipt', async (req, res) => {
    const { imageBase64, rawText, languageHint } = req.body;

    if (!imageBase64 && !rawText) {
      return res.status(400).json({ error: 'Изображение или текст чека обязательны' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({ error: 'GEMINI_API_KEY не настроен' });
    }

    const receiptPrompt = `Ты — универсальная интеллектуальная система компьютерного зрения и финансового анализа кассовых чеков.
Перед тобой реальный кассовый чек из ЛЮБОГО магазина, супермаркета, аптеки, строительного маркета, кафе или сервиса в любой стране мира (Нидерланды, Германия, Франция, Россия, Польша, Великобритания, США, Испания, Италия, Греция и др.).

Твоя цель — безупречно, математически точно извлечь все данные чека с первого раза:

1. МАГАЗИН И ДАТА:
   - storeName: Чистое, лаконичное общепринятое название сети или магазина (например Jumbo, Albert Heijn, REWE, ALDI, Lidl, ВкусВилл, Пятёрочка, Biedronka, Carrefour, SPAR, Kruidvat, Action, dm, Rossmann и т.д.). Без юридических форм (B.V., GmbH, ООО).
   - date: Дата покупки в формате YYYY-MM-DD.
   - time: Время чека в формате HH:mm.
   - currency: Валюта чека (EUR, USD, RUB, PLN, GBP, GEL, KZT и др.).
   - language: Код языка чека (nld, deu, rus, pol, eng, fra, spa, ell и др.).

2. МАТЕМАТИЧЕСКАЯ ТОЧНОСТЬ ИТОГОВ (totalAmount, taxAmount, discountTotal):
   - totalAmount: ФАКТИЧЕСКАЯ ИТОГОВАЯ СУММА К ОПЛАТЕ / ОПЛАЧЕННАЯ СУММА (строки Totaal, Total, Summe, Gesamtbetrag, Итого, К оплате, Razem, Do zapłaty, PIN, Betaald, Transactie, Card, Cash).
   - ВНИМАНИЕ: Если на чеке указан промежуточный подытог (Subtotaal / Subtotal / Zwischensumme / Netto) и скидки (Korting / Bonus / Rabatt), то totalAmount — это ФИНАЛЬНАЯ сумма к оплате ПОСЛЕ вычета всех скидок!
   - КРИТИЧНО: Никогда не путай итоговую сумму с налогами (BTW, VAT, MwSt, НДС), номерами касс или количеством позиций (Aantal artikelen).
   - Сумма цен всех товаров items обязана математически сходиться с totalAmount с точностью до цента!

3. ТОВАРЫ (items) — ПОСТРОЧНЫЙ АНАЛИЗ БЕЗ ПРОПУСКОВ И БЕЗ МУСОРА:
   - Извлеки ВСЕ реально купленные товары и услуги.
   - Поддерживай любые форматы строк:
     * Обычные товары: "НАЗВАНИЕ ЦЕНА"
     * Множители: "2 x 1.25" или "2 Stk x 0.65" (quantity: 2, unitPrice: 1.25, totalPrice: 2.50)
     * Весовой товар: "0.450 kg x 4.99/kg" (quantity: 0.45, unit: "кг", unitPrice: 4.99, totalPrice: 2.25)
     * Скидки: если к товару относится скидка (Korting, Bonus, Rabatt), укажи discount и скорректируй totalPrice строки
     * Залог за бутылки / тару: Statiegeld, Pfand, Kaucja -> категория "other"
   - СТРОГИЙ ЗАПРЕТ: НИ В КОЕМ СЛУЧАЕ НЕ ДОБАВЛЯЙ В ITEMS СЛУЖЕБНЫЕ СТРОКИ:
     Totaal, Subtotaal, Pin, Betaald, BTW/VAT, MwSt, Kassa, Filiaal, Datum, Tijd, Bon, Kvk, Bedankt, Tot ziens, Terminal, Aantal artikelen.

4. РУССКОЯЗЫЧНЫЕ НАИМЕНОВАНИЯ И КАТЕГОРИИ:
   - normalizedTitle: Сформируй чистое, понятное название на РУССКОМ ЯЗЫКЕ для семейного списка покупок (например: "Молоко 1.5% 1 л", "Бананы", "Сыр Гауда молодой", "Фарш говяжий", "Стиральный порошок", "Хлеб цельнозерновой"). Убери внутренние артикулы и технические префиксы.
   - category: Автоматически определи одну из 10 категорий:
     * produce (овощи, фрукты, ягоды, зелень, грибы, картофель)
     * dairy (молоко, сыр, масло сливочное, творог, йогурт, яйца, сливки)
     * meat (мясо, птица, фарш, колбаса, сосиски, ветчина, рыба, морепродукты)
     * bakery (хлеб, булки, багет, выпечка, тосты, круассаны)
     * pantry (бакалея, масло растительное, макароны, крупы, сахар, мука, кофе, чай, специи, консервы)
     * sweets (сладости, шоколад, печенье, десерты, конфеты, мороженое, снеки)
     * drinks (вода, соки, лимонады, пиво, вино, напитки)
     * household (бытовая химия, моющие средства, салфетки, туалетная бумага, губки)
     * pharmacy (аптека, витамины, лекарства, пластыри)
     * other (залог за тару Statiegeld/Pfand, пакеты, прочее)
   - unit: "шт", "кг", "г", "л", "уп", "бут".
${rawText ? `OCR текст чека (дополнительно):\n${rawText}\n` : ''}`;

    const receiptSchema = {
      type: Type.OBJECT,
      properties: {
        storeName: {
          type: Type.STRING,
          description: 'Название магазина (например Jumbo, Albert Heijn, REWE, ВкусВилл, ALDI)',
        },
        date: {
          type: Type.STRING,
          description: 'Дата чека в формате YYYY-MM-DD',
        },
        time: {
          type: Type.STRING,
          description: 'Время чека в формате HH:mm',
        },
        totalAmount: {
          type: Type.NUMBER,
          description: 'Фактическая итоговая сумма к оплате (Totaal, PIN, Betaald, Summe, Итого)',
        },
        taxAmount: {
          type: Type.NUMBER,
          description: 'Сумма налога (BTW, MwSt, НДС)',
        },
        discountTotal: {
          type: Type.NUMBER,
          description: 'Сумма скидки (Korting, Actie, Rabatt)',
        },
        currency: {
          type: Type.STRING,
          description: 'Валюта (EUR, RUB, PLN, USD, GBP)',
        },
        language: {
          type: Type.STRING,
          description: 'Языковой код чека (nld, deu, rus, pol, ell, eng)',
        },
        items: {
          type: Type.ARRAY,
          description: 'Список купленных товаров',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              originalText: { type: Type.STRING, description: 'Оригинальная строка из чека' },
              normalizedTitle: { type: Type.STRING, description: 'Понятное русскоязычное название товара' },
              quantity: { type: Type.NUMBER, description: 'Количество' },
              unit: { type: Type.STRING, description: 'Единица измерения (шт, кг, г, л, уп)' },
              unitPrice: { type: Type.NUMBER, description: 'Цена за единицу' },
              totalPrice: { type: Type.NUMBER, description: 'Итоговая стоимость строки' },
              discount: { type: Type.NUMBER, description: 'Скидка на позицию' },
              currency: { type: Type.STRING, description: 'Валюта' },
              category: {
                type: Type.STRING,
                description: 'Категория: produce, dairy, meat, bakery, pantry, sweets, drinks, household, pharmacy, other',
              },
              confidence: { type: Type.NUMBER, description: 'Оценка уверенности 0-100' },
            },
            required: ['normalizedTitle', 'totalPrice', 'category'],
          },
        },
      },
      required: ['storeName', 'totalAmount', 'items'],
    };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contents: any[] = [];
      if (imageBase64) {
        const mimeType = imageBase64.startsWith('data:image/png')
          ? 'image/png'
          : 'image/jpeg';
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        contents.push({
          role: 'user',
          parts: [
            { text: receiptPrompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: receiptPrompt }],
        });
      }

      const { response, modelUsed } = await callGeminiWithFallback(ai, {
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: receiptSchema,
        },
        timeoutMs: 25000,
        preferredModels: ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
      });

      const rawResponseText = response.text || '';
      const cleanJson = rawResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);

      console.log(`[Gemini Receipt] Успешно распознан чек через модель ${modelUsed}: магазин "${parsedData.storeName}", сумма ${parsedData.totalAmount} ${parsedData.currency || 'EUR'}, товаров: ${parsedData.items?.length || 0}`);

      return res.json(parsedData);
    } catch (err: any) {
      console.error('Ошибка Gemini при разборе чека:', err?.message || err);
      return res.status(500).json({
        error: 'Не удалось разобрать чек через Gemini API: ' + (err?.message || 'ошибка сети'),
      });
    }
  });

  // Серверный endpoint для автоматического скачивания и AI-структурирования рецептов с любых сайтов/соцсетей
  app.post('/api/ai/import-recipe', async (req, res) => {
    const { url, rawText } = req.body;

    if (!url && !rawText) {
      return res.status(400).json({ error: 'Укажите ссылку или текст рецепта' });
    }

    let scrapedText = rawText || '';
    let metaImage = '';
    let pageTitle = '';

    // Если передан URL — пытаемся скачать страницу и извлечь meta теги, OpenGraph и Recipe Schema JSON-LD
    if (url && typeof url === 'string' && url.startsWith('http')) {
      try {
        const pageRes = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,el;q=0.8,en;q=0.7',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (pageRes.ok) {
          const html = await pageRes.text();

          // OpenGraph фото
          const ogImageMatch =
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
          if (ogImageMatch && ogImageMatch[1]) {
            metaImage = ogImageMatch[1];
          }

          // Заголовок страницы
          const ogTitleMatch =
            html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (ogTitleMatch && ogTitleMatch[1]) {
            pageTitle = ogTitleMatch[1].trim();
          }

          // Поиск schema.org/Recipe JSON-LD
          const jsonLdMatches = html.match(
            /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
          );
          let extractedRecipeJson = '';
          if (jsonLdMatches) {
            for (const block of jsonLdMatches) {
              const inner = block.replace(/<script[^>]*>|<\/script>/gi, '').trim();
              if (
                inner.includes('"Recipe"') ||
                inner.includes('recipeIngredient') ||
                inner.includes('recipeInstructions')
              ) {
                extractedRecipeJson = inner;
                break;
              }
            }
          }

          // Очистка от скриптов/стилей
          const textWithoutScripts = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          scrapedText = `${
            extractedRecipeJson ? 'Schema JSON-LD:\n' + extractedRecipeJson + '\n\n' : ''
          }Заголовок: ${pageTitle}\nСодержимое страницы:\n${textWithoutScripts.slice(
            0,
            7500
          )}\nПользовательские заметки: ${rawText || ''}`;
        }
      } catch (scrapeErr: any) {
        console.warn('[Recipe Scrape Warning]:', scrapeErr?.message || scrapeErr);
        scrapedText = `URL источника: ${url}\n${rawText || ''}`;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Резервный парсер если нет ключа
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackRecipe = fallbackParseRecipe(scrapedText, url, pageTitle, metaImage);
      return res.json(fallbackRecipe);
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Ты — профессиональный кулинарный шеф и структуризатор семейных рецептов.
Пользователь передал ссылку на сайт / YouTube / Instagram или скопированный текст кулинарного рецепта.
Твоя цель — безупречно извлечь или воссоздать понятный, аппетитный, структурированный рецепт на русском языке.

Входные данные:
Ссылка: ${url || 'Не указана'}
Контент / Описание / Текст:
${scrapedText.slice(0, 7500)}

Требования к структуре JSON:
1. title: Аппетитное, точное название блюда (например: «Греческий салат Хориатики», «Паста карбонара с пармезаном»).
2. description: Лаконичное описание из 1-2 предложений (в чём изюминка блюда, с чем подавать).
3. category: Одно из: "breakfast" (завтрак) | "lunch" (обед) | "dinner" (ужин) | "snack" (перекус/десерт).
4. prepTimeMinutes: Время подготовки в минутах (число, например 15).
5. cookTimeMinutes: Время варки/жарки в минутах (число, например 20).
6. servings: Количество порций (число, по умолчанию 4).
7. calories: Примерная калорийность на 1 порцию (ккал, число, например 380).
8. image: URL фотографии блюда, если найден валидный адрес в тексте или метатегах (${metaImage ? `"${metaImage}"` : ''}). Если нет — пустая строка "".
9. tags: Массив из 3-5 актуальных тегов (например: ["Ужин", "Быстро", "Греция", "Семейное"]).
10. ingredients: Массив ингредиентов. У каждого:
    - name: понятное название продукта на русском языке (например: "Сыр Фета", "Спагетти", "Оливковое масло Extra Virgin").
    - amount: количество и единицы (например: "200 г", "2 шт.", "3 ст. л.", "по вкусу").
    - category: одна из категорий покупок: "produce" (овощи/фрукты/зелень) | "dairy" (молочное, сыры, яйца) | "meat" (мясо, птица, рыба) | "bakery" (хлеб, мука) | "pantry" (крупы, масло, паста, специи, соусы) | "household" | "drinks" | "other".
11. steps: Массив пошаговых инструкций приготовления на русском языке (1-я строка, 2-я строка... лаконичные, понятные действия).

Верни ТОЛЬКО валидный JSON (без markdown блоков \`\`\`json):
{
  "title": "...",
  "description": "...",
  "category": "dinner",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 20,
  "servings": 4,
  "calories": 380,
  "image": "...",
  "tags": ["..."],
  "ingredients": [
    { "name": "...", "amount": "...", "category": "produce" }
  ],
  "steps": [
    "..."
  ]
}`;

      const { response } = await callGeminiWithFallback(ai, {
        contents: prompt,
        timeoutMs: 25000,
        preferredModels: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
      });

      const raw = response.text || '';
      const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (!parsed.image && metaImage) {
        parsed.image = metaImage;
      }

      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini Recipe Import Warning:', err?.message || err);
      const fallback = fallbackParseRecipe(scrapedText, url, pageTitle, metaImage);
      return res.json(fallback);
    }
  });

  const httpServer = http.createServer(app);

  // Настройка Vite в dev режиме или раздача статики в prod
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

function fallbackParseRecipe(
  scrapedText: string,
  url?: string,
  pageTitle?: string,
  metaImage?: string
) {
  const lines = (scrapedText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const cleanTitle = pageTitle ? pageTitle.replace(/[-|].*$/, '').trim() : '';
  const title = cleanTitle || (lines[0] ? lines[0].slice(0, 60) : 'Вкусное домашнее блюдо');

  const ingredients: Array<{ name: string; amount: string; category: string }> = [];
  const steps: string[] = [];

  for (const line of lines) {
    if (
      line.includes('-') ||
      line.includes(':') ||
      line.includes(' г') ||
      line.includes(' мл') ||
      line.includes(' шт') ||
      line.includes(' ст. л.') ||
      line.includes(' ч. л.')
    ) {
      const parts = line.split(/[-:]/);
      if (parts.length >= 2) {
        ingredients.push({
          name: parts[0].trim().replace(/^[*•-]\s*/, ''),
          amount: parts[1].trim(),
          category: 'produce',
        });
      }
    } else if (/^\d+[\.\)]/.test(line)) {
      steps.push(line.replace(/^\d+[\.\)]\s*/, ''));
    }
  }

  return {
    title: title || 'Новый рецепт из интернета',
    description: 'Импортировано из источника: ' + (url || 'интернет-рецепт'),
    category: 'dinner',
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    calories: 380,
    image:
      metaImage ||
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    tags: ['Рецепт из сети', 'Семейное'],
    ingredients:
      ingredients.length > 0
        ? ingredients.slice(0, 15)
        : [
            { name: 'Свежие овощи', amount: '300 г', category: 'produce' },
            { name: 'Оливковое масло', amount: '2 ст. л.', category: 'pantry' },
            { name: 'Специи и соль', amount: 'по вкусу', category: 'pantry' },
          ],
    steps:
      steps.length > 0
        ? steps.slice(0, 10)
        : [
            'Подготовить ингредиенты, нарезать овощи.',
            'Приготовить согласно рекомендациям автора и подать к семейному столу.',
          ],
  };
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

