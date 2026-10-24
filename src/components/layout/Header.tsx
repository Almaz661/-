import React from 'react';
import { Calendar, CloudSun, Plus, Sparkles, X } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MemberAvatar } from '../common/MemberAvatar';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenQuickCapture: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenQuickCapture,
  onPrimaryAction,
  primaryActionLabel,
}) => {
  const { activeMemberId, setActiveMemberId, members } = useHousehold();

  const activeMember = members.find((m) => m.id === activeMemberId);

  // Форматирование сегодняшней даты на русском
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  return (
    <header className="h-18 px-8 bg-[#FCFBF8] border-b border-[#EBE7DF] flex items-center justify-between shrink-0 select-none">
      <div>
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-[#1F1D1A] tracking-tight">{title}</h2>
          {activeMember && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white border-stone-200 shadow-2xs">
              <MemberAvatar member={activeMember} size="xs" />
              <span>Показаны данные: {activeMember.name}</span>
              <button
                onClick={() => setActiveMemberId(null)}
                className="text-stone-400 hover:text-stone-700 ml-1"
                title="Показать все"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-[#8A8477] font-medium mt-0.5">
          {subtitle || capitalizedDate}
        </p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Погода / Настроение дома */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#F4F0E8] text-xs text-[#6B6456]">
          <CloudSun className="w-4 h-4 text-amber-500" />
          <span>+19°C • Дома тепло и порядок</span>
        </div>

        {/* Кнопка установки PWA */}
        <PWAInstallButton variant="outline" className="hidden sm:flex" />

        {/* Быстрое действие текущей страницы */}
        {onPrimaryAction && primaryActionLabel && (
          <button
            onClick={onPrimaryAction}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E3DFD5] text-[#1F1D1A] text-xs font-semibold hover:bg-[#F7F5EE] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#E15A42]" />
            <span>{primaryActionLabel}</span>
          </button>
        )}

        {/* Кнопка умного ввода в шапке */}
        <button
          onClick={onOpenQuickCapture}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E15A42] to-[#EA7038] text-white text-xs font-semibold shadow-xs hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Умный ввод</span>
        </button>
      </div>
    </header>
  );
};
