import React, { useState, useMemo } from 'react';
import {
  Gauge,
  Droplets,
  Zap,
  Flame,
  Plus,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  Calendar,
  History,
  Trash2,
  Edit2,
  X,
  FileSpreadsheet,
  ArrowUpRight,
  Calculator,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useHousehold } from '../../context/HouseholdContext';
import { UtilityMeter, UtilityMeterType, UtilityReading } from '../../types';

const METER_ICONS: Record<UtilityMeterType, { icon: any; color: string; bg: string }> = {
  cold_water: { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  hot_water: { icon: Droplets, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  electricity_day: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  electricity_night: { icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  electricity_single: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  gas: { icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  heating: { icon: Flame, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

const METER_TYPE_LABELS: Record<UtilityMeterType, string> = {
  cold_water: 'Холодная вода',
  hot_water: 'Горячая вода',
  electricity_day: 'Электричество День (Т1)',
  electricity_night: 'Электричество Ночь (Т2)',
  electricity_single: 'Электричество (одноставочный)',
  gas: 'Газ',
  heating: 'Отопление / Теплосчётчик',
};

export const UtilitiesView: React.FC = () => {
  const {
    meters,
    addMeter,
    updateMeter,
    deleteMeter,
    addMeterReading,
    toggleReadingSubmitted,
    showToast,
  } = useHousehold();

  // Текущий месяц в формате YYYY-MM
  const currentMonth = new Date().toISOString().substring(0, 7); // '2026-10'
  const todayStr = new Date().toISOString().split('T')[0];

  // Временные значения инпутов для быстрой подачи показаний
  const [readingInputs, setReadingInputs] = useState<Record<string, string>>({});
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'current' | 'analytics' | 'meters'>('current');
  const [isAddMeterModalOpen, setIsAddMeterModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<UtilityMeter | null>(null);

  // Проверка статуса подачи показаний за текущий месяц
  const currentMonthStatus = useMemo(() => {
    let unsubmittedCount = 0;
    let totalCostThisMonth = 0;

    meters.forEach((meter) => {
      const curReading = meter.readings.find((r) => r.month === currentMonth);
      if (!curReading || !curReading.submitted) {
        unsubmittedCount++;
      }
      if (curReading && curReading.cost) {
        totalCostThisMonth += curReading.cost;
      }
    });

    return {
      unsubmittedCount,
      isAllSubmitted: unsubmittedCount === 0 && meters.length > 0,
      totalCostThisMonth: Math.round(totalCostThisMonth * 100) / 100,
    };
  }, [meters, currentMonth]);

  // Данные для сравнительного графика расхода за последние 6 месяцев
  const chartData = useMemo(() => {
    // Получаем последние 6 месяцев
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const monthNames: Record<string, string> = {
      '2026-05': 'Май',
      '2026-06': 'Июнь',
      '2026-07': 'Июль',
      '2026-08': 'Авг',
      '2026-09': 'Сен',
      '2026-10': 'Окт',
    };

    return months.map((m) => {
      const row: any = { month: monthNames[m] || m, totalCost: 0 };
      meters.forEach((meter) => {
        const reading = meter.readings.find((r) => r.month === m);
        const diff = reading ? reading.difference : 0;
        const cost = reading ? reading.cost || 0 : 0;
        row[meter.id] = diff;
        row.totalCost += cost;
      });
      row.totalCost = Math.round(row.totalCost);
      return row;
    });
  }, [meters]);

  // Обработка записи показания
  const handleSaveReading = (meterId: string) => {
    const rawVal = readingInputs[meterId];
    if (!rawVal) return;
    const num = parseFloat(rawVal);
    if (isNaN(num) || num < 0) {
      showToast('Введите корректное числовое значение показаний', 'error');
      return;
    }

    addMeterReading(meterId, num, todayStr);
    setReadingInputs((prev) => ({ ...prev, [meterId]: '' }));
  };

  // Копирование сводки показаний для отправки в УК или чат-бот
  const handleCopySummary = () => {
    const lines: string[] = [];
    lines.push(`Показания счётчиков за ${new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}:`);

    meters.forEach((m) => {
      const reading = m.readings.find((r) => r.month === currentMonth);
      const val = reading ? reading.value : (readingInputs[m.id] ? readingInputs[m.id] : '—');
      lines.push(`• ${m.name}${m.serialNumber ? ` (${m.serialNumber})` : ''}: ${val} ${m.unit}`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSuccess(true);
    showToast('Показания скопированы в буфер обмена для отправки в УК', 'success');
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Верхний информационный дашборд */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Статус подачи показаний */}
        <div
          className={`rounded-3xl p-5 border shadow-xs transition-all flex items-center justify-between ${
            currentMonthStatus.isAllSubmitted
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867D]">
              Период подачи: 15–25 число
            </span>
            <h3 className="text-xl font-bold">
              {currentMonthStatus.isAllSubmitted
                ? 'Все показания переданы ✓'
                : `Осталось передать: ${currentMonthStatus.unsubmittedCount} счётчика`}
            </h3>
            <p className="text-xs text-[#6B655B]">
              Октябрь 2026 • Управляющая компания и МосОблЕИРЦ / ТНС
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              currentMonthStatus.isAllSubmitted
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {currentMonthStatus.isAllSubmitted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6 animate-pulse" />
            )}
          </div>
        </div>

        {/* Сумма коммуналки по счётчикам */}
        <div className="bg-white rounded-3xl p-5 border border-[#E8E2D4] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#8C867D]">Расход по тарифам (Октябрь)</span>
            <div className="text-2xl font-black text-[#1F1E1C]">
              {currentMonthStatus.totalCostThisMonth.toLocaleString('ru-RU')} ₽
            </div>
            <p className="text-[11px] text-[#8C867D]">
              Вода, электричество Т1/Т2 и тепло
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#E15A42] flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
        </div>

        {/* Сроки поверок счётчиков */}
        <div className="bg-white rounded-3xl p-5 border border-[#E8E2D4] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#8C867D]">Очередная поверка</span>
            <div className="text-lg font-bold text-[#1F1E1C]">ГВ: Апрель 2027</div>
            <p className="text-[11px] text-emerald-600 font-medium">
              Все приборы учёта сертифицированы
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Навигационные вкладки режима: Текущие показания / Графики / Настройка счётчиков */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E8E2D4]">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setSelectedTab('current')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTab === 'current'
                ? 'bg-[#E15A42] text-white shadow-xs'
                : 'text-[#5C564B] hover:bg-[#F2EFE9]'
            }`}
          >
            Ввод показаний за Октябрь
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTab === 'analytics'
                ? 'bg-[#E15A42] text-white shadow-xs'
                : 'text-[#5C564B] hover:bg-[#F2EFE9]'
            }`}
          >
            Графики расхода (6 мес.)
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('meters')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedTab === 'meters'
                ? 'bg-[#E15A42] text-white shadow-xs'
                : 'text-[#5C564B] hover:bg-[#F2EFE9]'
            }`}
          >
            Мои счётчики и тарифы ({meters.length})
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EFEAE0] border border-[#DDD7CB] text-[#1F1E1C] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Скопировать текст показаний для отправки в УК или бот"
          >
            {copiedSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#E15A42]" />
            )}
            <span>{copiedSuccess ? 'Скопировано!' : 'Скопировать для УК'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingMeter(null);
              setIsAddMeterModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#1F1E1C] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Счётчик</span>
          </button>
        </div>
      </div>

      {/* 3. ВКЛАДКА 1: ТЕКУЩИЕ ПОКАЗАНИЯ ЗА МЕСЯЦ */}
      {selectedTab === 'current' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meters.map((meter) => {
              const iconCfg = METER_ICONS[meter.type] || METER_ICONS.cold_water;
              const Icon = iconCfg.icon;

              // Текущее показание за Октябрь
              const curReading = meter.readings.find((r) => r.month === currentMonth);

              // Предыдущее показание
              const sorted = [...meter.readings].sort((a, b) => a.date.localeCompare(b.date));
              const prevReading =
                sorted.length > 1 ? sorted[sorted.length - 2] : sorted[0] || null;
              const prevVal = curReading && prevReading ? prevReading.value : meter.initialValue;

              return (
                <div
                  key={meter.id}
                  className={`bg-white rounded-3xl p-5 border shadow-xs transition-all space-y-4 relative ${
                    curReading?.submitted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-[#E8E2D4]'
                  }`}
                >
                  {/* Верхняя строка: Название и номер счётчика */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${iconCfg.bg}`}>
                        <Icon className={`w-5 h-5 ${iconCfg.color}`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1F1E1C]">{meter.name}</h4>
                        <div className="flex items-center space-x-2 text-[11px] text-[#8C867D]">
                          <span>{meter.serialNumber || 'Без номера'}</span>
                          <span>•</span>
                          <span>{meter.location || 'Дом'}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700">
                      {meter.tariffRate} ₽/{meter.unit}
                    </span>
                  </div>

                  {/* Блок значений: Прошлое, Новое, Расход */}
                  <div className="grid grid-cols-3 gap-2 bg-[#FAF7F2] p-3 rounded-2xl border border-[#EDE7DB] text-center">
                    <div>
                      <span className="text-[10px] text-[#8C867D] block">Прошлое</span>
                      <strong className="text-sm font-bold text-[#4A453C]">
                        {prevVal} {meter.unit}
                      </strong>
                    </div>

                    <div className="border-x border-[#EDE7DB]">
                      <span className="text-[10px] text-[#8C867D] block">Текущее</span>
                      <strong className="text-sm font-black text-[#1F1E1C]">
                        {curReading ? `${curReading.value} ${meter.unit}` : 'Не введено'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#8C867D] block">Расход (дельта)</span>
                      <strong className="text-sm font-bold text-[#E15A42]">
                        {curReading ? `+${curReading.difference} ${meter.unit}` : '—'}
                      </strong>
                    </div>
                  </div>

                  {/* Блок стоимости и кнопка отправки / подтверждения */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-[#8C867D] block">Начисление по тарифу:</span>
                      <strong className="text-sm font-bold text-[#1F1E1C]">
                        {curReading?.cost ? `${curReading.cost.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                      </strong>
                    </div>

                    {curReading ? (
                      <button
                        type="button"
                        onClick={() => toggleReadingSubmitted(meter.id, curReading.id)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          curReading.submitted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-emerald-50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{curReading.submitted ? 'Передано в УК' : 'Отметить переданным'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-lg">
                        Ожидает ввода
                      </span>
                    )}
                  </div>

                  {/* Инпут быстрого обновления показания */}
                  <div className="pt-2 border-t border-[#F0ECE1] flex items-center space-x-2">
                    <input
                      type="number"
                      step="any"
                      placeholder={`Новое показание (${meter.unit})...`}
                      value={readingInputs[meter.id] || ''}
                      onChange={(e) =>
                        setReadingInputs({ ...readingInputs, [meter.id]: e.target.value })
                      }
                      className="flex-1 px-3 py-2 text-xs bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveReading(meter.id)}
                      className="px-3.5 py-2 bg-[#E15A42] hover:bg-[#D04E37] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Записать
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ВКЛАДКА 2: ГРАФИКИ И АНАЛИТИКА ПОТРЕБЛЕНИЯ */}
      {selectedTab === 'analytics' && (
        <div className="space-y-6">
          {/* График общей суммы коммунальных расходов по месяцам */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D4] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-[#1F1E1C]">
                  Динамика расходов на ресурсы (₽ в месяц)
                </h4>
                <p className="text-xs text-[#8C867D]">
                  Суммарная стоимость воды, электроэнергии и тепла за последние полгода
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-[#8C867D]">
                <span className="w-3 h-3 rounded-full bg-[#E15A42]" />
                <span>Итоговая сумма по тарифам</span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E15A42" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#E15A42" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C867D' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8C867D' }} unit=" ₽" />
                  <Tooltip
                    formatter={(val: any) => [`${val.toLocaleString('ru-RU')} ₽`, 'Начислено']}
                    contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '1rem', border: '1px solid #E5DFD3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalCost"
                    stroke="#E15A42"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#costGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* График потребления воды (Холодная vs Горячая в м³) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-[#E8E2D4] shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-sm text-[#1F1E1C]">Потребление воды (м³ / месяц)</h4>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C867D' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C867D' }} unit=" м³" />
                    <Tooltip contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '1rem', border: '1px solid #E5DFD3' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="meter-water-cold" name="Холодная вода" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="meter-water-hot" name="Горячая вода" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* График потребления электроэнергии (День vs Ночь в кВт⋅ч) */}
            <div className="bg-white rounded-3xl p-6 border border-[#E8E2D4] shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-sm text-[#1F1E1C]">Электроэнергия Т1 / Т2 (кВт⋅ч)</h4>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C867D' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C867D' }} unit=" кВт" />
                    <Tooltip contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '1rem', border: '1px solid #E5DFD3' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="meter-elec-day" name="День (Т1)" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="meter-elec-night" name="Ночь (Т2)" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ВКЛАДКА 3: МОИ СЧЁТЧИКИ, ТАРИФЫ И ИСТОРИЯ */}
      {selectedTab === 'meters' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meters.map((meter) => {
              const iconCfg = METER_ICONS[meter.type] || METER_ICONS.cold_water;
              const Icon = iconCfg.icon;

              return (
                <div
                  key={meter.id}
                  className="bg-white rounded-3xl p-5 border border-[#E8E2D4] shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${iconCfg.bg}`}>
                        <Icon className={`w-5 h-5 ${iconCfg.color}`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1F1E1C]">{meter.name}</h4>
                        <span className="text-[11px] text-[#8C867D]">{meter.serialNumber || 'Без номера'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMeter(meter);
                          setIsAddMeterModalOpen(true);
                        }}
                        className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMeter(meter.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#5C564B] bg-[#FAF7F2] p-3 rounded-2xl border border-[#EFECE4]">
                    <div>
                      <span className="text-[#8C867D] block text-[10px]">Тариф:</span>
                      <strong className="text-[#1F1E1C]">
                        {meter.tariffRate} ₽ / {meter.unit}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8C867D] block text-[10px]">Дата поверки:</span>
                      <strong className="text-[#1F1E1C]">
                        {meter.verificationDate
                          ? new Date(meter.verificationDate).toLocaleDateString('ru-RU')
                          : 'Не указана'}
                      </strong>
                    </div>
                  </div>

                  {/* История последних 4 показаний */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#8C867D] uppercase">История записей:</span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {meter.readings.slice(-4).reverse().map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-stone-50 text-xs text-[#4A453C]"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">{r.month}:</span>
                            <span>{r.value} {meter.unit}</span>
                            <span className="text-[11px] text-[#E15A42] font-medium">
                              (+{r.difference})
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#1F1E1C]">{r.cost || 0} ₽</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                r.submitted ? 'bg-emerald-500' : 'bg-amber-400'
                              }`}
                              title={r.submitted ? 'Передано' : 'Не передано'}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Модальное окно добавления/редактирования счётчика */}
      {isAddMeterModalOpen && (
        <MeterModal
          isOpen={isAddMeterModalOpen}
          meter={editingMeter}
          onClose={() => setIsAddMeterModalOpen(false)}
          onSave={(data) => {
            if (editingMeter) {
              updateMeter(editingMeter.id, data);
            } else {
              addMeter(data);
            }
            setIsAddMeterModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ СЧЁТЧИКА
// ==========================================

interface MeterModalProps {
  isOpen: boolean;
  meter: UtilityMeter | null;
  onClose: () => void;
  onSave: (data: Omit<UtilityMeter, 'id' | 'readings'>) => void;
}

const MeterModal: React.FC<MeterModalProps> = ({ isOpen, meter, onClose, onSave }) => {
  const [name, setName] = useState(meter?.name || '');
  const [type, setType] = useState<UtilityMeterType>(meter?.type || 'cold_water');
  const [serialNumber, setSerialNumber] = useState(meter?.serialNumber || '');
  const [location, setLocation] = useState(meter?.location || 'Санузел');
  const [unit, setUnit] = useState(meter?.unit || 'м³');
  const [tariffRate, setTariffRate] = useState(meter?.tariffRate ? String(meter.tariffRate) : '50.93');
  const [verificationDate, setVerificationDate] = useState(meter?.verificationDate || '2028-12-31');
  const [initialValue, setInitialValue] = useState(meter?.initialValue ? String(meter.initialValue) : '0');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      type,
      serialNumber: serialNumber.trim() || undefined,
      location: location.trim() || undefined,
      unit: unit.trim() || 'м³',
      tariffRate: parseFloat(tariffRate) || 0,
      verificationDate: verificationDate || undefined,
      initialValue: parseFloat(initialValue) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full border border-[#E5DFD3] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D4]">
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-[#E15A42]" />
            <h3 className="font-bold text-base text-[#1F1E1C]">
              {meter ? 'Редактировать счётчик' : 'Добавить счётчик ресурса'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-[#1F1E1C]">Название счётчика</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Холодная вода (Санузел)..."
              className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Тип ресурса</label>
              <select
                value={type}
                onChange={(e) => {
                  const t = e.target.value as UtilityMeterType;
                  setType(t);
                  if (t.includes('water')) setUnit('м³');
                  else if (t.includes('elec')) setUnit('кВт⋅ч');
                  else if (t === 'heating') setUnit('Гкал');
                  else if (t === 'gas') setUnit('м³');
                }}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              >
                {Object.entries(METER_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Единица измерения</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Тариф (₽ за единицу)</label>
              <input
                type="number"
                step="any"
                required
                value={tariffRate}
                onChange={(e) => setTariffRate(e.target.value)}
                placeholder="50.93"
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Заводской номер</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="№ 1234567"
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Дата очередной поверки</label>
              <input
                type="date"
                value={verificationDate}
                onChange={(e) => setVerificationDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Расположение</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Сантехнический шкаф, Кухня..."
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-3 border-t border-[#E8E2D4]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#DDD7CB] hover:bg-[#F2ECE1] text-[#5C564B] font-semibold transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#E15A42] hover:bg-[#D04E37] text-white font-bold transition-all shadow-xs cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
