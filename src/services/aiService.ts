import { FamilyMember, ParsedAIResponse } from '../types';

// Резервный и автономный интеллектуальный парсер на правилах
export function parseWithRuleEngine(text: string, members: FamilyMember[]): ParsedAIResponse {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const actions: ParsedAIResponse['actions'] = [];

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Поиск упоминания члена семьи
  const matchedMember = members.find((m) => lower.includes(m.name.toLowerCase()));
  const memberId = matchedMember ? matchedMember.id : null;

  // Распознавание даты
  let targetDate = todayStr;
  if (lower.includes('завтра')) {
    targetDate = tomorrowStr;
  } else if (lower.includes('послезавтра')) {
    const dayAfter = new Date();
    dayAfter.setDate(today.getDate() + 2);
    targetDate = dayAfter.toISOString().split('T')[0];
  } else if (lower.includes('в субботу') || lower.includes('суббота')) {
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    targetDate = d.toISOString().split('T')[0];
  } else if (lower.includes('в воскресенье') || lower.includes('воскресенье')) {
    const d = new Date();
    const day = d.getDay();
    const diff = (7 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    targetDate = d.toISOString().split('T')[0];
  }

  // Распознавание времени
  const timeMatch = text.match(/(\d{1,2})[:.](\d{2})/) || text.match(/в (\d{1,2})\s*(часов|часа|утра|вечера)?/);
  let parsedTime = '12:00';
  if (timeMatch) {
    if (timeMatch[2] === 'вечера' && parseInt(timeMatch[1], 10) < 12) {
      parsedTime = `${parseInt(timeMatch[1], 10) + 12}:00`;
    } else if (timeMatch[2] && timeMatch[2].length === 2) {
      parsedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    } else {
      parsedTime = `${timeMatch[1].padStart(2, '0')}:00`;
    }
  }

  // 1. Покупки (список покупок, в покупки, купить, докупить, пачка, кг, литр)
  const isShoppingIntent =
    lower.includes('список покупок') ||
    lower.includes('списке покупок') ||
    lower.includes('в покупки') ||
    lower.includes('в покупках') ||
    lower.includes('купить') ||
    lower.includes('докупить') ||
    lower.includes('взять в магазине') ||
    /^купи\b/i.test(trimmed) ||
    /^докупи\b/i.test(trimmed);

  if (isShoppingIntent) {
    // Очищаем вводные командные фразы: "Добавь в список покупок — соль", "Запиши в покупки: молоко"
    let cleanPayload = trimmed
      .replace(
        /^(пожалуйста[, ]*)?(добавь(те)?|запиши(те)?|внеси(те)?|положи(те)?|скинь(те)?)\s+(в\s+)?(список\s+покупок|списке\s+покупок|покупки|покупках)\s*[:—–-]?\s*/i,
        ''
      )
      .replace(/^(в\s+)?(список\s+покупок|покупки)\s*[:—–-]?\s*/i, '')
      .replace(/^(купить|докупить|взять\s+в\s+магазине|купи|докупи)\s*[:—–-]?\s*/i, '')
      .replace(/^[-—–:.\s]+/, '')
      .trim();

    // Разделяем элементы списка ТОЛЬКО по запятым, точкам с запятой, переводам строк или союзу "и" как отдельному слову
    const rawItems = cleanPayload
      .split(/[,;\n\r]+|\s+(?:и|да|а\s+также)\s+/i)
      .map((s) => s.replace(/^[-—–:.\s]+|[-—–:.\s]+$/g, '').trim())
      .filter(Boolean);

    rawItems.forEach((itemText) => {
      let category: any = 'other';
      const itemLower = itemText.toLowerCase();

      // Определение категории товара
      if (
        /яблок|банан|огур|помидор|картоф|морков|зелен|салат|фрукт|овощ|ягод|лимон|апельсин|чеснок|лук|перец болгар/i.test(
          itemLower
        )
      ) {
        category = 'produce';
      } else if (
        /молок|сыр|творог|сметан|масло слив|йогурт|кефир|сливк|ряженк|яйц/i.test(
          itemLower
        )
      ) {
        category = 'dairy';
      } else if (
        /мяс|куриц|индейк|рыб|лосос|форел|фарш|говядин|свинин|колбас|сосиск|ветчин/i.test(
          itemLower
        )
      ) {
        category = 'meat';
      } else if (/хлеб|багет|булоч|лаваш|круассан|батон|пирог/i.test(itemLower)) {
        category = 'bakery';
      } else if (
        /макарон|рис|гречк|мук|масло оливк|масло подсолнеч|сахар|сол[ьия]|кофе|чай|овсянк|круп|соус|кетчуп|специ/i.test(
          itemLower
        )
      ) {
        category = 'pantry';
      } else if (
        /таблетк|порошок|мыл|бумаг|салфетк|шампун|губк|фольг|пакет|паста зубн/i.test(
          itemLower
        )
      ) {
        category = 'household';
      } else if (
        /витамин|пластыр|капли|спрей|лекарств|нурофен|бинт|аспирин/i.test(
          itemLower
        )
      ) {
        category = 'pharmacy';
      } else if (/вод[аы]|сок|морс|лимонад|комбуч|квас/i.test(itemLower)) {
        category = 'drinks';
      }

      // Выделение количества (например, "2 пачки", "1 кг", "3 шт")
      let quantity = '1 шт.';
      let finalTitle = itemText;
      const qtyMatch = itemText.match(
        /(\d+(?:[.,]\d+)?\s*(?:пачк[аиу]?|кг|килограмм[а-я]*|г|грамм[а-я]*|л|литр[а-я]*|шт|штук[а-я]*|бутылк[а-я]*|уп|упаковк[а-я]*))/i
      );
      if (qtyMatch) {
        quantity = qtyMatch[1];
        finalTitle = itemText.replace(qtyMatch[0], '').trim();
      }

      if (!finalTitle) finalTitle = itemText;
      const capitalizedTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);

      actions.push({
        type: 'shopping',
        title: capitalizedTitle,
        details: `Категория: ${category}, в список «Супермаркет»`,
        data: {
          listId: 'list-supermarket',
          title: capitalizedTitle,
          category,
          quantity,
          completed: false,
          addedBy: memberId,
        },
      });
    });
  }

  // 2. Событие календаря (встреча, приём, секция, школа, врач, собрание, др, день рождения, поезд, рейс)
  // Проверяем только если это не была чисто команда покупок
  const isCalendarIntent =
    !isShoppingIntent &&
    (lower.includes('встреч') ||
      lower.includes('врач') ||
      lower.includes('педиатр') ||
      lower.includes('секци') ||
      lower.includes('тренировк') ||
      lower.includes('собрани') ||
      lower.includes('приём') ||
      lower.includes('день рождени') ||
      lower.includes('гост') ||
      (timeMatch && !isShoppingIntent));

  if (isCalendarIntent) {
    let cat: any = 'family';
    if (lower.includes('врач') || lower.includes('педиатр') || lower.includes('больниц')) cat = 'health';
    else if (lower.includes('школ') || lower.includes('секци') || lower.includes('детск') || lower.includes('тренировк')) cat = 'kids';
    else if (lower.includes('мастер') || lower.includes('сантехник') || lower.includes('уборк')) cat = 'home';

    actions.push({
      type: 'calendar',
      title: text.length > 50 ? text.substring(0, 47) + '...' : text,
      details: `Дата: ${targetDate}, время: ${parsedTime}, категория: ${cat}`,
      data: {
        title: text.length > 50 ? text.substring(0, 47) + '...' : text,
        date: targetDate,
        startTime: parsedTime,
        endTime: `${parseInt(parsedTime.split(':')[0], 10) + 1}:00`,
        allDay: !timeMatch,
        category: cat,
        memberIds: memberId ? [memberId] : members.map((m) => m.id),
        reminderMinutes: 60,
      },
    });
  }

  // 3. Бытовая задача (помыть, убрать, пропылесосить, заменить, проверить, полить, починить)
  const isTaskIntent =
    !isShoppingIntent &&
    (lower.includes('помыть') ||
      lower.includes('убрать') ||
      lower.includes('починить') ||
      lower.includes('заменить') ||
      lower.includes('полить') ||
      lower.includes('протереть') ||
      lower.includes('сдать показания') ||
      lower.includes('напомни') ||
      lower.includes('задача'));

  if (isTaskIntent) {
    let zone: any = 'Весь дом';
    if (lower.includes('посуд') || lower.includes('кухн') || lower.includes('холодильник') || lower.includes('плит')) zone = 'Кухня';
    else if (lower.includes('ванн') || lower.includes('душ') || lower.includes('стирк')) zone = 'Ванная';
    else if (lower.includes('машин') || lower.includes('авто') || lower.includes('колес')) zone = 'Авто';
    else if (lower.includes('детск') || lower.includes('игрушк')) zone = 'Детская';
    else if (lower.includes('цвет') || lower.includes('раст')) zone = 'Гостиная';

    actions.push({
      type: 'task',
      title: text.length > 50 ? text.substring(0, 47) + '...' : text,
      details: `Зона: ${zone}, Исполнитель: ${matchedMember?.name || 'Любой'}, Срок: ${targetDate}`,
      data: {
        title: text.length > 50 ? text.substring(0, 47) + '...' : text,
        zone,
        assigneeId: memberId,
        isRotation: false,
        recurrence: 'none',
        dueDate: targetDate,
        dueTime: parsedTime,
        priority: lower.includes('срочно') ? 'high' : 'medium',
        completed: false,
        points: 15,
      },
    });
  }

  // Если ничего не подошло конкретно, оформляем как задачу по умолчанию
  if (actions.length === 0) {
    actions.push({
      type: 'task',
      title: text,
      details: `Создано как бытовое поручение на ${targetDate}`,
      data: {
        title: text,
        zone: 'Весь дом',
        assigneeId: memberId,
        isRotation: false,
        recurrence: 'none',
        dueDate: targetDate,
        priority: 'medium',
        completed: false,
        points: 10,
      },
    });
  }

  return {
    summary: `Распознано действий: ${actions.length}. Готово к сохранению в соответствующие разделы.`,
    actions,
  };
}

// Запрос к серверному endpoint Gemini API с плавным fallback
export async function parseWithGemini(
  text: string,
  members: FamilyMember[],
  imageBase64?: string
): Promise<ParsedAIResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('/api/ai/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        members,
        imageBase64,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.actions) && data.actions.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend Gemini API call error or timeout, applying rule engine fallback:', err);
  }

  // Автономный надёжный разбор без падений
  return parseWithRuleEngine(text, members);
}
