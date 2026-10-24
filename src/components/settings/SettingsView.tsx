import React, { useState, useRef } from 'react';
import {
  Users,
  Home,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Camera,
  X,
  Check,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  HardDrive,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MemberAvatar } from '../common/MemberAvatar';
import { processAndResizeImage, getMemberInitials } from '../../utils/imageUtils';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const SettingsView: React.FC = () => {
  const {
    householdName,
    setHouseholdName,
    members,
    addMember,
    updateMember,
    deleteMember,
    updateMemberPhoto,
    exportBackupJson,
    importBackupJson,
    resetToDefaultData,
    isOffline,
    offlineStats,
    syncOfflineData,
    showToast,
  } = useHousehold();

  const [isSyncingIDB, setIsSyncingIDB] = useState(false);

  const [nameInput, setNameInput] = useState(householdName);
  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);

  // Добавление нового участника
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberHex, setNewMemberHex] = useState('#EC4899');
  const [newMemberPhoto, setNewMemberPhoto] = useState<string | undefined>(undefined);

  // Редактирование существующего участника
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState('');
  const [editMemberHex, setEditMemberHex] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newMemberPhotoInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const startEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setEditMemberName(member.name);
    setEditMemberRole(member.role);
    setEditMemberHex(member.color.hex);
  };

  const handleSaveMemberEdit = (id: string) => {
    if (!editMemberName.trim()) return;
    updateMember(id, {
      name: editMemberName.trim(),
      role: editMemberRole.trim() || 'Член семьи',
      color: {
        bg: 'bg-stone-50',
        text: 'text-stone-700',
        border: 'border-stone-200',
        hex: editMemberHex,
        badgeBg: 'bg-stone-100 text-stone-800',
      },
    });
    setEditingMemberId(null);
    showToast('Профиль участника обновлён', 'success');
  };

  const triggerMemberPhotoUpload = (memberId: string) => {
    const el = document.getElementById(`photo_upload_${memberId}`) as HTMLInputElement | null;
    el?.click();
  };

  const handleSaveHouseholdName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setHouseholdName(nameInput.trim());
    setIsEditingHouseholdName(false);
    showToast('Название дома обновлено', 'success');
  };

  const handleNewMemberPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await processAndResizeImage(file, 320);
        setNewMemberPhoto(base64);
        showToast('Фотография выбрана', 'info');
      } catch (err) {
        showToast('Не удалось загрузить изображение', 'error');
      }
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    addMember({
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Член семьи',
      avatar: newMemberPhoto,
      color: {
        bg: 'bg-pink-50',
        text: 'text-pink-700',
        border: 'border-pink-200',
        hex: newMemberHex,
        badgeBg: 'bg-pink-100 text-pink-800',
      },
    });

    setNewMemberName('');
    setNewMemberRole('');
    setNewMemberPhoto(undefined);
    setIsAddingMember(false);
  };

  const handleUploadPhotoForMember = async (memberId: string, file: File) => {
    try {
      const base64 = await processAndResizeImage(file, 320);
      updateMemberPhoto(memberId, base64);
    } catch (err) {
      showToast('Ошибка при загрузке фотографии', 'error');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          importBackupJson(content);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto select-none">
      {/* 1. Название домохозяйства */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-[#F0ECE1]">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1F1D1A]">Профиль дома</h3>
            <p className="text-xs text-[#8A8477]">
              Название и настройки общего пространства семьи
            </p>
          </div>
        </div>

        {isEditingHouseholdName ? (
          <form onSubmit={handleSaveHouseholdName} className="flex items-center space-x-3">
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-stone-300 text-sm font-semibold"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#E15A42] text-white text-xs font-bold"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setIsEditingHouseholdName(false)}
              className="px-3 py-2 rounded-xl text-stone-500 hover:bg-stone-100 text-xs"
            >
              Отмена
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-[#8A8477]">Название:</span>
              <h4 className="text-lg font-bold text-[#1F1D1A]">{householdName}</h4>
            </div>
            <button
              onClick={() => {
                setNameInput(householdName);
                setIsEditingHouseholdName(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Изменить</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Члены семьи / Профили */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1F1D1A]">Члены семьи</h3>
              <p className="text-xs text-[#8A8477]">
                Вы можете загрузить собственную фотографию из галереи устройства или использовать нейтральный аватар с инициалами
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingMember(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F3] border border-[#E3DFD5] text-[#1F1D1A] text-xs font-semibold hover:bg-[#F3EFE6]"
          >
            <Plus className="w-3.5 h-3.5 text-[#E15A42]" />
            <span>Добавить</span>
          </button>
        </div>

        {/* Форма добавления участника */}
        {isAddingMember && (
          <form
            onSubmit={handleAddMember}
            className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#EBE7DF] space-y-3 animate-in fade-in"
          >
            <div className="flex items-center space-x-3">
              {/* Превью аватара нового участника */}
              <div className="relative">
                <MemberAvatar
                  name={newMemberName || 'Новый'}
                  avatarUrl={newMemberPhoto}
                  colorHex={newMemberHex}
                  size="xl"
                />
                <button
                  type="button"
                  onClick={() => newMemberPhotoInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#E15A42] text-white shadow-xs hover:brightness-110"
                  title="Загрузить фото"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input
                  ref={newMemberPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewMemberPhotoChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Имя (напр: Бабушка Оля)"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Роль (напр: Бабушка)"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-stone-500 font-medium">Цвет метки:</span>
                  <input
                    type="color"
                    value={newMemberHex}
                    onChange={(e) => setNewMemberHex(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-stone-200"
                  />

                  {newMemberPhoto && (
                    <button
                      type="button"
                      onClick={() => setNewMemberPhoto(undefined)}
                      className="text-[11px] text-stone-500 hover:text-rose-600 underline ml-2"
                    >
                      Удалить фото
                    </button>
                  )}

                  <div className="flex-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMember(false);
                      setNewMemberPhoto(undefined);
                    }}
                    className="px-3 py-1.5 text-xs text-stone-500"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#E15A42] text-white text-xs font-bold shadow-xs"
                  >
                    Создать
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Список участников с управлением фото */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {members.map((member) => {
            const hasPhoto = Boolean(
              member.avatar &&
              member.avatar.trim() !== '' &&
              !member.avatar.startsWith('http://') &&
              !member.avatar.startsWith('https://') &&
              !member.avatar.includes('unsplash.com')
            );
            const inputId = `photo_upload_${member.id}`;
            const isEditing = editingMemberId === member.id;

            if (isEditing) {
              return (
                <div
                  key={member.id}
                  className="p-4 rounded-2xl bg-[#FAF8F3] border-2 border-[#E15A42]/40 shadow-xs space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <MemberAvatar
                        member={{
                          ...member,
                          name: editMemberName || member.name,
                          color: { ...member.color, hex: editMemberHex },
                        }}
                        size="xl"
                      />
                      <button
                        type="button"
                        onClick={() => triggerMemberPhotoUpload(member.id)}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#E15A42] text-white shadow-xs hover:brightness-110"
                        title={hasPhoto ? 'Заменить фото' : 'Загрузить фото'}
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        required
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        placeholder="Имя"
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        value={editMemberRole}
                        onChange={(e) => setEditMemberRole(e.target.value)}
                        placeholder="Роль (напр: Мама)"
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-stone-500 font-medium">Цвет:</span>
                      <input
                        type="color"
                        value={editMemberHex}
                        onChange={(e) => setEditMemberHex(e.target.value)}
                        className="w-6 h-6 rounded-lg cursor-pointer border border-stone-200"
                      />
                      {hasPhoto && (
                        <button
                          type="button"
                          onClick={() => updateMemberPhoto(member.id, undefined)}
                          className="text-[11px] text-rose-600 hover:underline ml-2"
                        >
                          Удалить фото
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="px-3 py-1 text-xs text-stone-500 hover:bg-stone-100 rounded-lg"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveMemberEdit(member.id)}
                        className="px-3 py-1 bg-[#E15A42] text-white text-xs font-bold rounded-lg shadow-xs"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={member.id}
                className="p-4 rounded-2xl bg-[#FAF9F6] border border-stone-200 flex flex-col justify-between space-y-3 shadow-2xs hover:border-[#E15A42]/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    {/* Аватар участника с индикатором статуса и кнопкой загрузки */}
                    <div className="relative group">
                      <MemberAvatar member={member} size="xl" className="ring-2 ring-white shadow-xs" />
                      <button
                        type="button"
                        onClick={() => triggerMemberPhotoUpload(member.id)}
                        className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        title={hasPhoto ? 'Заменить фотографию' : 'Загрузить фотографию из галереи'}
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-[#1F1D1A]">{member.name}</h4>
                        <span
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-white"
                          style={{ backgroundColor: member.color.hex }}
                        />
                      </div>
                      <p className="text-xs text-[#8A8477] mt-0.5">{member.role}</p>
                      
                      <div className="mt-1">
                        {hasPhoto ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-2.5 h-2.5" />
                            <span>Фото из галереи</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                            <span>Инициалы: {getMemberInitials(member.name)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => startEditMember(member)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                      title="Редактировать данные участника"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteMember(member.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Удалить участника"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Блок управления фотографией участника */}
                <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between text-xs">
                  {/* Скрытый input для выбора файла из галереи устройства (iPad/iPhone/ПК) */}
                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadPhotoForMember(member.id, file);
                        e.target.value = ''; // Сброс для возможности повторной загрузки
                      }
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => triggerMemberPhotoUpload(member.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-[#FAF8F3] text-stone-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#E15A42]" />
                    <span>{hasPhoto ? 'Заменить фото' : 'Загрузить фото'}</span>
                  </button>

                  {hasPhoto && (
                    <button
                      type="button"
                      onClick={() => updateMemberPhoto(member.id, undefined)}
                      className="text-stone-400 hover:text-rose-600 text-xs font-medium hover:underline flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Удалить фото</span>
                    </button>
                  )}
                  {!hasPhoto && (
                    <span className="text-[11px] text-stone-400 italic">
                      Нейтральный аватар
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Автономная оффлайн-работа (PWA и IndexedDB) */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0ECE1]">
          <div>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-[#E15A42]" />
              <h3 className="font-bold text-sm text-[#1F1D1A]">
                Автономная работа: Service Worker и IndexedDB
              </h3>
            </div>
            <p className="text-xs text-[#8A8477] mt-0.5">
              Центр управления домом работает даже при полном отсутствии интернета. Задачи и календарь сохраняются локально.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                !isOffline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {!isOffline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{!isOffline ? 'Подключено к сети' : 'Оффлайн-режим'}</span>
            </span>
          </div>
        </div>

        {/* Сводка хранилищ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Блок IndexedDB */}
          <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E2D4] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-[#E15A42]" />
                <span className="text-xs font-bold text-[#1F1D1A]">База данных IndexedDB</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                Активна
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-[#5C564B]">
              <div className="flex justify-between py-0.5 border-b border-[#EDE7DB]">
                <span>Задач сохранено в IndexedDB:</span>
                <strong className="text-[#1F1D1A]">{offlineStats ? offlineStats.taskCount : '...'}</strong>
              </div>
              <div className="flex justify-between py-0.5 border-b border-[#EDE7DB]">
                <span>Событий календаря в базе:</span>
                <strong className="text-[#1F1D1A]">{offlineStats ? offlineStats.eventCount : '...'}</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Последняя синхронизация:</span>
                <span className="text-[11px] text-[#8C867D]">
                  {offlineStats?.lastTasksSaved
                    ? new Date(offlineStats.lastTasksSaved).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Только что'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setIsSyncingIDB(true);
                try {
                  await syncOfflineData();
                } finally {
                  setIsSyncingIDB(false);
                }
              }}
              disabled={isSyncingIDB}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-white border border-[#E3DFD5] hover:border-[#E15A42] text-xs font-semibold text-[#1F1D1A] hover:text-[#E15A42] transition-all cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingIDB ? 'animate-spin text-[#E15A42]' : ''}`} />
              <span>{isSyncingIDB ? 'Синхронизация...' : 'Синхронизировать задачи и календарь'}</span>
            </button>
          </div>

          {/* Блок Service Worker & PWA */}
          <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E2D4] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-[#E15A42]" />
                  <span className="text-xs font-bold text-[#1F1D1A]">Кеш ресурсов (Service Worker)</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  Установлен
                </span>
              </div>
              <p className="text-xs text-[#5C564B] mt-2 leading-relaxed">
                Все скрипты, шрифты, стили интерфейса и компоненты закешированы через Workbox. Приложение мгновенно открывается даже без сотовой связи и Wi-Fi.
              </p>
            </div>

            <div className="pt-2">
              <PWAInstallButton variant="primary" className="w-full justify-center" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Резервное копирование и сброс */}
      <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-4">
        <div className="pb-3 border-b border-[#F0ECE1]">
          <h3 className="font-bold text-sm text-[#1F1D1A]">
            Резервное копирование и управление данными
          </h3>
          <p className="text-xs text-[#8A8477]">
            Все ваши задачи, рецепты, документы и списки хранятся в браузере (LocalStorage). Вы можете выгрузить или восстановить их в любой момент.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Экспорт */}
          <button
            onClick={exportBackupJson}
            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-[#FAF8F3] border border-[#E3DFD5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#1F1D1A] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Экспорт в JSON</span>
          </button>

          {/* Импорт */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-[#FAF8F3] border border-[#E3DFD5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#1F1D1A] transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Импорт из JSON</span>
          </button>

          {/* Сброс */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-rose-50/50 border border-rose-200 hover:bg-rose-100/50 text-xs font-semibold text-rose-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Сброс к демо</span>
          </button>
        </div>

        {/* Конфиденциальность OneHaus */}
        <div className="mt-4 p-4 rounded-2xl bg-[#FAF8F3] border border-[#EADFCF] flex items-center space-x-3 text-xs text-[#5C564B]">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Конфиденциальность:</strong> Данные вашего дома принадлежат исключительно вам. Никаких платных подписок, трекеров или передачи информации третьим лицам.
          </span>
        </div>
      </div>

      {/* Модальное окно подтверждения сброса к демо */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F1E1C]">Сбросить все данные?</h3>
              <p className="text-xs text-[#7A746B] mt-1">
                Все задачи, списки покупок, чеки и рецепты будут возвращены к исходному демонстрационному состоянию.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-[#DDD8CD] text-xs font-semibold text-[#5A554D] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDefaultData();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
