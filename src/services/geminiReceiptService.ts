import { ScannedReceipt, ReceiptItemLine, ReceiptLanguage } from '../types';
import { parseReceiptText } from './receiptParser';
import { runLocalOCR } from './ocrService';

export interface GeminiReceiptResponse {
  storeName?: string;
  date?: string;
  time?: string;
  totalAmount: number;
  taxAmount?: number;
  discountTotal?: number;
  currency: string;
  language: ReceiptLanguage;
  items: ReceiptItemLine[];
  error?: string;
}

/**
 * Отправляет чек на серверный эндпоинт с Gemini API для интеллектуального
 * распознавания и автоматической категоризации (продукты, бытовая химия и т.д.)
 * без жестких шаблонов.
 */
export async function parseReceiptWithGemini(
  imageBase64: string,
  rawText?: string,
  languageHint?: string
): Promise<ScannedReceipt> {
  const receiptId = 'receipt_' + Date.now().toString(36);

  try {
    const res = await fetch('/api/ai/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        rawText,
        languageHint,
      }),
    });

    if (res.ok) {
      const data: GeminiReceiptResponse = await res.json();
      if (data && data.items && data.items.length > 0) {
        // Подсчет сходимости
        const sumItems = data.items.reduce((s, it) => s + (it.totalPrice || 0), 0);
        const diff = Math.round(Math.abs(sumItems - (data.totalAmount || 0)) * 100) / 100;

        return {
          id: receiptId,
          storeName: data.storeName || 'Супермаркет',
          rawStoreName: data.storeName,
          date: data.date || new Date().toISOString().split('T')[0],
          time: data.time || new Date().toTimeString().slice(0, 5),
          totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : sumItems,
          taxAmount: data.taxAmount,
          discountTotal: data.discountTotal,
          currency: data.currency || 'EUR',
          rawText: rawText || '',
          language: data.language || (languageHint as ReceiptLanguage) || 'nld',
          images: imageBase64 ? [imageBase64] : [],
          items: data.items.map((it, idx) => ({
            id: it.id || `gemini_item_${idx}_${Date.now().toString(36)}`,
            originalText: it.originalText || it.normalizedTitle,
            normalizedTitle: it.normalizedTitle || it.originalText,
            quantity: it.quantity || 1,
            unit: it.unit || 'шт',
            unitPrice: it.unitPrice || it.totalPrice,
            totalPrice: it.totalPrice || 0,
            discount: it.discount,
            currency: it.currency || data.currency || 'EUR',
            category: it.category || 'other',
            confidence: it.confidence || 95,
            status: 'verified',
            isDoubtful: false,
          })),
          scannedAt: new Date().toISOString(),
          matchedSumDiff: diff,
        };
      }
    }
    console.warn('Серверный Gemini API вернул неполные данные или ошибку, применяем резервный разбор.');
  } catch (err) {
    console.warn('Ошибка вызова Gemini API на сервере:', err);
  }

  // Резервный локальный разбор: если текст не был передан, пробуем локальный OCR
  let textToParse = rawText;
  if (!textToParse && imageBase64) {
    try {
      const ocr = await runLocalOCR(imageBase64, (languageHint as ReceiptLanguage) || 'nld');
      textToParse = ocr?.text || '';
    } catch (ocrErr) {
      console.warn('Локальный OCR fallback не удался:', ocrErr);
    }
  }

  const fallbackData = parseReceiptText(textToParse || '', (languageHint as ReceiptLanguage) || undefined);
  return {
    id: receiptId,
    storeName: fallbackData.storeName || 'Покупки',
    rawStoreName: fallbackData.rawStoreName,
    date: fallbackData.date || new Date().toISOString().split('T')[0],
    time: fallbackData.time,
    totalAmount: fallbackData.totalAmount,
    taxAmount: fallbackData.taxAmount,
    discountTotal: fallbackData.discountTotal,
    currency: fallbackData.currency || 'EUR',
    rawText: textToParse || '',
    language: fallbackData.detectedLanguage || (languageHint as ReceiptLanguage) || 'nld',
    images: imageBase64 ? [imageBase64] : [],
    items: fallbackData.items,
    scannedAt: new Date().toISOString(),
    matchedSumDiff: fallbackData.matchedSumDiff,
  };
}
