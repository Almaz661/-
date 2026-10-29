import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  X,
  Home,
  CheckCircle2,
  Lock,
  Globe,
  Coins,
  Building,
} from 'lucide-react';
import { useHousehold, CleanHouseholdOptions } from '../../context/HouseholdContext';

interface CleanStartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CleanStartModal: React.FC<CleanStartModalProps> = ({ isOpen, onClose }) => {
  const { startCleanHousehold, showToast, householdRegion } = useHousehold();

  // Выбор страны и валюты для независимой семьи
  const [selectedRegion, setSelectedRegion] = useState<'GR' | 'RU' | 'EU' | 'OTHER'>(() => {
    return householdRegion || 'RU';
  });
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'RUB' | 'USD'>('RUB');
  const [homeName, setHomeName] = useState('Наш дом');
  const [ownerName, setOwnerName] = useState('Я');

  if (!isOpen) return null;

  const handleSelectRegion = (region: 'GR' | 'RU' | 'EU' | 'OTHER') => {
    setSelectedRegion(region);
    if (region === 'GR' || region === 'EU') {
      setSelectedCurrency('EUR');
      setHomeName(region === 'GR' ? 'Наш дом в Греции' : 'Наш дом в Европе');
    } else if (region === 'RU') {
      setSelectedCurrency('RUB');
      setHomeName('Наш дом');
    } else {
      setSelectedCurrency('EUR');
      setHomeName('Наш дом');
    }
  };

  const handleCreateClean = () => {
    const options: CleanHouseholdOptions = {
      region: selectedRegion,
      currency: selectedCurrency,
      householdName: homeName.trim() || 'Наш дом',
      ownerName: ownerName.trim() || 'Я',
    };

    startCleanHousehold(options);
    localStorage.setItem('onehaus_start_choice_done', 'true');
    onClose();
  };

  const handleKeepDemo = () => {
    localStorage.setItem('onehaus_start_choice_done', 'true');
    showToast('Загружены демонстрационные примеры для ознакомления', 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E8E2D4] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Шапка модального окна */}
        <div className="p-6 bg-gradient-to-br from-[#FAF8F3] via-[#FFF8F5] to-[#F5F2EB] border-b border-[#E8E2D4] relative">
          <button
            onClick={handleKeepDemo}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone-200/60 text-stone-500 transition-colors cursor-pointer"
            title="Закрыть и оставить примеры"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E15A42] to-[#F28C38] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Home className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-[#1F1D1A]">
                Персональный дом для вашей семьи
              </h2>
              <p className="text-xs text-[#8A8477]">
                Полная автономность • Без объединения с другими семьями
              </p>
            </div>
          </div>

          {/* Плашка полной независимости данных */}
          <div className="mt-3 p-3 bg-white/90 border border-emerald-200/80 rounded-2xl shadow-2xs flex items-start space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#4A453C] leading-relaxed">
              <strong className="text-[#1F1D1A] block mb-0.5">
                Изолированное личное пространство:
              </strong>
              Это приложение работает независимо на вашем устройстве. Ваши родственники в Греции, РФ или других городах настраивают свои дома отдельно — данные <strong>никогда не смешиваются и не объединяются</strong>.
            </div>
          </div>
        </div>

        {/* Форма быстрой настройки под страну */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Шаг 1: Выбор региона и валюты */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#554F44] uppercase tracking-wider block">
              1. Страна и валюта вашего дома:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Греция / ЕС */}
              <button
                type="button"
                onClick={() => handleSelectRegion('GR')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedRegion === 'GR'
                    ? 'border-[#E15A42] bg-[#FFF5F2] ring-2 ring-[#E15A42]/20 shadow-xs'
                    : 'border-[#EAE6DD] bg-white hover:border-[#D0C9BD]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">🇬🇷</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    EUR (€)
                  </span>
                </div>
                <div className="font-bold text-xs text-[#1F1D1A]">Греция / Европа</div>
                <div className="text-[10px] text-[#7A746B] mt-0.5">
                  Тарифы в евро, супермаркеты Σκλαβενίτης/Lidl, экстренные службы 112/166 EKAB
                </div>
              </button>

              {/* Россия */}
              <button
                type="button"
                onClick={() => handleSelectRegion('RU')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedRegion === 'RU'
                    ? 'border-[#E15A42] bg-[#FFF5F2] ring-2 ring-[#E15A42]/20 shadow-xs'
                    : 'border-[#EAE6DD] bg-white hover:border-[#D0C9BD]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">🇷🇺</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    RUB (₽)
                  </span>
                </div>
                <div className="font-bold text-xs text-[#1F1D1A]">Россия</div>
                <div className="text-[10px] text-[#7A746B] mt-0.5">
                  Тарифы в рублях, супермаркеты Пятёрочка/ВкусВилл, службы 112/103/104
                </div>
              </button>
            </div>
          </div>

          {/* Шаг 2: Название и владелец */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#554F44]">
                Название пространства:
              </label>
              <input
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                placeholder="Например: Наш дом"
                className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#DDD7CB] rounded-xl text-xs font-bold text-[#1F1D1A] focus:outline-none focus:border-[#E15A42]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#554F44]">
                Ваше имя (владелец):
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Например: Ольга или Я"
                className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#DDD7CB] rounded-xl text-xs font-bold text-[#1F1D1A] focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          {/* Карточка главного действия */}
          <div className="p-4 rounded-2xl bg-[#FAF8F3] border-2 border-[#E15A42] shadow-xs space-y-3">
            <div className="flex items-start space-x-2.5">
              <Sparkles className="w-5 h-5 text-[#E15A42] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-[#1F1D1A]">
                  Создать чистое пространство с нуля
                </h3>
                <p className="text-xs text-[#6B6456] mt-0.5 leading-relaxed">
                  Будут удалены все чужие демонстрационные имена («Алексей, Елена, Михаил»), чужие старые показания счётчиков (186 м³), тестовые чеки и задачи. Приложение откроется идеально чистым для вашего дома.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateClean}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#E15A42] to-[#EA7038] hover:brightness-105 active:scale-98 text-white font-bold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center space-x-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Создать чистое пространство для моей семьи ({selectedCurrency})</span>
            </button>
          </div>

          {/* Вариант 2: Оставить примеры */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={handleKeepDemo}
              className="text-xs text-[#8A8477] hover:text-[#1F1D1A] hover:underline font-medium cursor-pointer"
            >
              Оставить демонстрационные шаблоны (посмотреть возможности)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
