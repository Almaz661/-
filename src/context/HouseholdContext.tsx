import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  CalendarEvent,
  DocumentItem,
  FamilyMember,
  HouseholdContact,
  InventoryItem,
  MealPlanDay,
  Recipe,
  ShoppingItem,
  ShoppingList,
  TaskItem,
  TaskPack,
  ScannedReceipt,
  ReceiptItemLine,
  MedicineItem,
  UtilityMeter,
  UtilityReading,
  HouseholdProperty,
  PropertyId,
  PetEmergencyInfo,
  AccidentGuidance,
  MedicalMemberInfo,
} from '../types';
import {
  INITIAL_CONTACTS,
  INITIAL_DOCS,
  INITIAL_EVENTS,
  INITIAL_INVENTORY,
  INITIAL_MEAL_PLAN,
  INITIAL_MEMBERS,
  INITIAL_RECIPES,
  INITIAL_SHOPPING_ITEMS,
  INITIAL_SHOPPING_LISTS,
  INITIAL_TASKS,
  INITIAL_TASK_PACKS,
  INITIAL_RECEIPTS,
  INITIAL_MEDICINES,
  INITIAL_UTILITY_METERS,
  INITIAL_PROPERTIES,
  INITIAL_PET_EMERGENCY,
  INITIAL_ACCIDENT_DATA,
  INITIAL_MEDICAL_EMERGENCY,
} from '../data/initialData';
import {
  saveReceiptPhotosToIDB,
  getAllReceiptPhotosMap,
  deleteReceiptPhotosFromIDB,
} from '../services/receiptStorage';
import {
  loadTasksFromIDB,
  saveAllTasksToIDB,
  loadEventsFromIDB,
  saveAllEventsToIDB,
  getOfflineDbStats,
  OfflineDbStats,
} from '../services/offlineDatabase';
import { normalizeProductTitle } from '../utils/receiptNormalizer';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface HouseholdContextType {
  // Offline & IndexedDB State
  isOffline: boolean;
  offlineStats: OfflineDbStats | null;
  syncOfflineData: () => Promise<void>;
  householdName: string;
  setHouseholdName: (name: string) => void;
  members: FamilyMember[];
  activeMemberId: string | null;
  setActiveMemberId: (id: string | null) => void;
  
  // Tasks
  tasks: TaskItem[];
  taskPacks: TaskPack[];
  addTask: (task: Omit<TaskItem, 'id'>) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompletion: (id: string) => void;
  applyTaskPack: (packId: string) => void;

  // Calendar
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  exportCalendarIcs: () => void;

  // Shopping
  shoppingLists: ShoppingList[];
  activeShoppingListId: string;
  setActiveShoppingListId: (id: string) => void;
  shoppingItems: ShoppingItem[];
  addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => void;
  toggleShoppingItem: (id: string) => void;
  deleteShoppingItem: (id: string) => void;
  clearCompletedShoppingItems: (listId: string) => void;
  addShoppingList: (name: string, icon: string) => void;
  importRecipeIngredientsToShopping: (recipe: Recipe, targetListId?: string) => void;

  // Meals & Recipes
  recipes: Recipe[];
  mealPlan: MealPlanDay[];
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  updateMealSlot: (
    date: string,
    slot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    data?: { recipeId?: string; customTitle?: string; note?: string }
  ) => void;

  // Inventory
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;

  // Documents
  docs: DocumentItem[];
  addDoc: (doc: Omit<DocumentItem, 'id'>) => void;
  updateDoc: (id: string, updates: Partial<DocumentItem>) => void;
  deleteDoc: (id: string) => void;

  // Contacts
  contacts: HouseholdContact[];
  addContact: (contact: Omit<HouseholdContact, 'id'>) => void;
  updateContact: (id: string, updates: Partial<HouseholdContact>) => void;
  deleteContact: (id: string) => void;

  // Members Management
  addMember: (member: Omit<FamilyMember, 'id'>) => void;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteMember: (id: string) => void;
  updateMemberPhoto: (memberId: string, photoBase64: string | undefined) => void;

  // Receipts Scanner & History
  receipts: ScannedReceipt[];
  saveReceipt: (receipt: ScannedReceipt) => void;
  deleteReceipt: (id: string) => void;
  clearAllReceipts: () => void;
  loadSampleReceipts: () => void;
  updateReceipt: (id: string, updates: Partial<ScannedReceipt>) => void;
  importReceiptItemsToShopping: (items: ReceiptItemLine[], targetListId?: string) => void;

  // Medicine & First-Aid Kit (Аптечка)
  medicines: MedicineItem[];
  addMedicine: (medicine: Omit<MedicineItem, 'id'>) => void;
  updateMedicine: (id: string, updates: Partial<MedicineItem>) => void;
  deleteMedicine: (id: string) => void;
  addMedicineToShoppingList: (medicine: MedicineItem) => void;

  // Utility Meters & Readings (ЖКХ и счётчики)
  meters: UtilityMeter[];
  addMeter: (meter: Omit<UtilityMeter, 'id' | 'readings'>) => void;
  updateMeter: (id: string, updates: Partial<UtilityMeter>) => void;
  deleteMeter: (id: string) => void;
  addMeterReading: (meterId: string, value: number, date?: string, notes?: string) => void;
  toggleReadingSubmitted: (meterId: string, readingId: string) => void;

  // Objects & Property Management (Объекты семьи)
  properties: HouseholdProperty[];
  activePropertyId: PropertyId;
  setActivePropertyId: (id: PropertyId) => void;
  activeProperty: HouseholdProperty | null;
  addProperty: (property: Omit<HouseholdProperty, 'id'>) => void;
  updateProperty: (id: string, updates: Partial<HouseholdProperty>) => void;
  deleteProperty: (id: string) => void;

  // SOS & Emergency (Экстренный режим)
  isSOSOpen: boolean;
  setIsSOSOpen: (open: boolean) => void;
  petEmergency: PetEmergencyInfo;
  updatePetEmergency: (updates: Partial<PetEmergencyInfo>) => void;
  accidentGuidance: AccidentGuidance;
  updateAccidentGuidance: (updates: Partial<AccidentGuidance>) => void;
  medicalEmergency: MedicalMemberInfo[];
  addMedicalEmergency: (med: MedicalMemberInfo) => void;
  updateMedicalEmergency: (memberId: string, updates: Partial<MedicalMemberInfo>) => void;
  deleteMedicalEmergency: (memberId: string) => void;

  // Backup & Reset
  exportBackupJson: () => void;
  importBackupJson: (jsonString: string) => boolean;
  resetToDefaultData: () => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

const STORAGE_PREFIX = 'onehaus_v4_';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      let dataToStore = storedValue;
      if (key === 'scanned_receipts' && Array.isArray(storedValue)) {
        // Защита от переполнения квоты 5 МБ:
        // В localStorage храним метаданные и легкие превью, а полные оригиналы хранятся в IndexedDB
        dataToStore = (storedValue as any[]).map((r) => {
          if (r && Array.isArray(r.images)) {
            const safeImages = r.images
              .map((img: string) => (typeof img === 'string' && img.length > 50000 ? '' : img))
              .filter(Boolean);
            return { ...r, images: safeImages };
          }
          return r;
        }) as any;
      }
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [householdName, setHouseholdName] = useLocalStorage<string>('household_name', 'Наш тёплый дом');
  const [members, setMembers] = useLocalStorage<FamilyMember[]>('members', INITIAL_MEMBERS);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  // Очистка любых внешних URL фотографий и демо-ссылок Unsplash из localStorage
  useEffect(() => {
    // 1. Очистка устаревших ключей предыдущих версий кэша
    try {
      if (typeof localStorage !== 'undefined') {
        const legacyPrefixes = ['onehaus_ru_', 'onehaus_v1_', 'onehaus_v2_', 'onehaus_v3_'];
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && legacyPrefixes.some((p) => k.startsWith(p))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch (_) {}

    setMembers((prev) => {
      let changed = false;
      const sanitized = prev.map((m) => {
        if (
          m.avatar &&
          (m.avatar.startsWith('http://') ||
            m.avatar.startsWith('https://') ||
            m.avatar.includes('unsplash.com'))
        ) {
          changed = true;
          return { ...m, avatar: undefined };
        }
        return m;
      });
      return changed ? sanitized : prev;
    });
  }, []);

  const [tasks, setTasks] = useLocalStorage<TaskItem[]>('tasks', INITIAL_TASKS);
  const [taskPacks] = useState<TaskPack[]>(INITIAL_TASK_PACKS);

  const [events, setEvents] = useLocalStorage<CalendarEvent[]>('events', INITIAL_EVENTS);

  // Оффлайн-статус и статистика базы IndexedDB
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [offlineStats, setOfflineStats] = useState<OfflineDbStats | null>(null);

  // Слушатель онлайн / оффлайн событий браузера
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Начальная загрузка и гидратация из IndexedDB для задач и календаря
  useEffect(() => {
    let isMounted = true;
    async function initOfflineStores() {
      try {
        const [idbTasks, idbEvents] = await Promise.all([
          loadTasksFromIDB(),
          loadEventsFromIDB(),
        ]);

        if (!isMounted) return;

        // Если в IndexedDB уже сохранены задачи, актуализируем стейт
        if (idbTasks && idbTasks.length > 0) {
          setTasks(idbTasks);
        } else if (tasks && tasks.length > 0) {
          await saveAllTasksToIDB(tasks);
        }

        // Если в IndexedDB уже сохранены события календаря, актуализируем стейт
        if (idbEvents && idbEvents.length > 0) {
          setEvents(idbEvents);
        } else if (events && events.length > 0) {
          await saveAllEventsToIDB(events);
        }

        const stats = await getOfflineDbStats();
        if (isMounted) setOfflineStats(stats);
      } catch (e) {
        console.warn('Ошибка гидратации IndexedDB:', e);
      }
    }

    initOfflineStores();
    return () => {
      isMounted = false;
    };
  }, []);

  // Автоматическое сохранение задач в IndexedDB при любых изменениях
  useEffect(() => {
    if (tasks && tasks.length >= 0) {
      saveAllTasksToIDB(tasks).then(() => {
        getOfflineDbStats().then(setOfflineStats).catch(() => {});
      });
    }
  }, [tasks]);

  // Автоматическое сохранение событий календаря в IndexedDB при любых изменениях
  useEffect(() => {
    if (events && events.length >= 0) {
      saveAllEventsToIDB(events).then(() => {
        getOfflineDbStats().then(setOfflineStats).catch(() => {});
      });
    }
  }, [events]);

  const syncOfflineData = async () => {
    await Promise.all([
      saveAllTasksToIDB(tasks),
      saveAllEventsToIDB(events),
    ]);
    const stats = await getOfflineDbStats();
    setOfflineStats(stats);
    showToast('Данные задач и календаря сохранены в IndexedDB для оффлайн-доступа', 'success');
  };
  
  const [shoppingLists, setShoppingLists] = useLocalStorage<ShoppingList[]>('shopping_lists', INITIAL_SHOPPING_LISTS);
  const [activeShoppingListId, setActiveShoppingListId] = useState<string>('list-supermarket');
  const [shoppingItems, setShoppingItems] = useLocalStorage<ShoppingItem[]>('shopping_items', INITIAL_SHOPPING_ITEMS);

  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', INITIAL_RECIPES);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlanDay[]>('meal_plan', INITIAL_MEAL_PLAN);

  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>('inventory', INITIAL_INVENTORY);
  const [docs, setDocs] = useLocalStorage<DocumentItem[]>('docs', INITIAL_DOCS);
  const [contacts, setContacts] = useLocalStorage<HouseholdContact[]>('contacts', INITIAL_CONTACTS);
  const [receipts, setReceipts] = useLocalStorage<ScannedReceipt[]>('scanned_receipts', INITIAL_RECEIPTS);

  const [medicines, setMedicines] = useLocalStorage<MedicineItem[]>('medicines', INITIAL_MEDICINES);
  const [meters, setMeters] = useLocalStorage<UtilityMeter[]>('utility_meters', INITIAL_UTILITY_METERS);

  // Действия с Домашней аптечкой
  const addMedicine = (med: Omit<MedicineItem, 'id'>) => {
    const newMed: MedicineItem = {
      ...med,
      id: `med-${Date.now()}`,
    };
    setMedicines((prev) => [newMed, ...prev]);
    showToast(`Препарат "${newMed.name}" добавлен в аптечку`, 'success');
  };

  const updateMedicine = (id: string, updates: Partial<MedicineItem>) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    showToast('Данные препарата обновлены', 'success');
  };

  const deleteMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
    showToast('Препарат удалён из аптечки', 'info');
  };

  const addMedicineToShoppingList = (med: MedicineItem) => {
    const targetTitle = `${med.name}${med.dosage ? ` (${med.dosage})` : ''}`;
    const pharmacyList =
      shoppingLists.find(
        (l) => l.name.toLowerCase().includes('аптек') || l.id.includes('pharmacy')
      ) || shoppingLists[0];
    const newItem: ShoppingItem = {
      id: `shop-${Date.now()}`,
      listId: pharmacyList.id,
      title: targetTitle,
      category: 'pharmacy',
      quantity: '1 уп',
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setShoppingItems((prev) => [newItem, ...prev]);
    showToast(`"${targetTitle}" добавлен в список покупок («${pharmacyList.name}»)`, 'success');
  };

  // Действия со Счётчиками ЖКХ
  const addMeter = (meter: Omit<UtilityMeter, 'id' | 'readings'>) => {
    const newMeter: UtilityMeter = {
      ...meter,
      id: `meter-${Date.now()}`,
      readings: [],
    };
    setMeters((prev) => [...prev, newMeter]);
    showToast(`Счётчик "${newMeter.name}" добавлен`, 'success');
  };

  const updateMeter = (id: string, updates: Partial<UtilityMeter>) => {
    setMeters((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const newTariff = updates.tariffRate !== undefined ? updates.tariffRate : m.tariffRate;
        const updatedReadings =
          updates.tariffRate !== undefined
            ? m.readings.map((r) => ({
                ...r,
                cost: Math.round(r.difference * newTariff * 100) / 100,
              }))
            : m.readings;

        return {
          ...m,
          ...updates,
          readings: updatedReadings,
        };
      })
    );
    showToast('Параметры счётчика обновлены', 'success');
  };

  const deleteMeter = (id: string) => {
    setMeters((prev) => prev.filter((m) => m.id !== id));
    showToast('Счётчик удалён', 'info');
  };

  const addMeterReading = (
    meterId: string,
    value: number,
    dateStr?: string,
    notes?: string
  ) => {
    setMeters((prev) =>
      prev.map((meter) => {
        if (meter.id !== meterId) return meter;

        const effectiveDate = dateStr || new Date().toISOString().split('T')[0];
        const month = effectiveDate.substring(0, 7); // '2026-10'

        const sortedReadings = [...meter.readings].sort((a, b) => a.date.localeCompare(b.date));
        const lastReading = sortedReadings.length > 0 ? sortedReadings[sortedReadings.length - 1] : null;
        const prevValue = lastReading ? lastReading.value : meter.initialValue;
        const difference = Math.max(0, Math.round((value - prevValue) * 100) / 100);
        const cost = Math.round(difference * meter.tariffRate * 100) / 100;

        const newReading: UtilityReading = {
          id: `rd-${Date.now()}`,
          meterId,
          date: effectiveDate,
          month,
          value,
          difference,
          cost,
          submitted: false,
          notes,
        };

        const filtered = meter.readings.filter((r) => r.month !== month);
        return {
          ...meter,
          readings: [...filtered, newReading].sort((a, b) => a.date.localeCompare(b.date)),
        };
      })
    );
    showToast('Показания счётчика успешно записаны', 'success');
  };

  const toggleReadingSubmitted = (meterId: string, readingId: string) => {
    setMeters((prev) =>
      prev.map((m) => {
        if (m.id !== meterId) return m;
        return {
          ...m,
          readings: m.readings.map((r) =>
            r.id === readingId ? { ...r, submitted: !r.submitted } : r
          ),
        };
      })
    );
  };

  // ==================== ОБЪЕКТЫ И ПАСПОРТА ДОМА ====================
  const [properties, setProperties] = useLocalStorage<HouseholdProperty[]>('properties', INITIAL_PROPERTIES);
  const [activePropertyId, setActivePropertyId] = useLocalStorage<PropertyId>('active_property_id', 'apartment');
  const [isSOSOpen, setIsSOSOpen] = useState<boolean>(false);

  const [petEmergency, setPetEmergency] = useLocalStorage<PetEmergencyInfo>('pet_emergency', INITIAL_PET_EMERGENCY);
  const [accidentGuidance, setAccidentGuidance] = useLocalStorage<AccidentGuidance>('accident_guidance', INITIAL_ACCIDENT_DATA);
  const [medicalEmergency, setMedicalEmergency] = useLocalStorage<MedicalMemberInfo[]>('medical_emergency', INITIAL_MEDICAL_EMERGENCY);

  // Очистка устаревших демо-шаблонов с привязкой к конкретному городу (Москва) и наполнение контактов мастеров
  useEffect(() => {
    setProperties((prev) => {
      const hasOldMoscow = prev.some(
        (p) => p.address && (p.address.includes('Москва') || p.address.includes('Ленинский'))
      );
      if (hasOldMoscow) return INITIAL_PROPERTIES;
      return prev.map((p) => {
        const init = INITIAL_PROPERTIES.find((ip) => ip.id === p.id);
        if (init && (!p.managementCompany.plumberPhone && !p.managementCompany.electricianPhone)) {
          return {
            ...p,
            managementCompany: {
              ...p.managementCompany,
              dispatchPhone: p.managementCompany.dispatchPhone || init.managementCompany.dispatchPhone,
              plumberPhone: p.managementCompany.plumberPhone || init.managementCompany.plumberPhone,
              electricianPhone: p.managementCompany.electricianPhone || init.managementCompany.electricianPhone,
            },
          };
        }
        return p;
      });
    });

    setPetEmergency((prev) => {
      if (!prev || !prev.vetClinicPhone || prev.vetClinicAddress?.includes('Москва')) {
        return INITIAL_PET_EMERGENCY;
      }
      return {
        ...INITIAL_PET_EMERGENCY,
        ...prev,
        restrictions:
          prev.restrictions && prev.restrictions.length > 0
            ? prev.restrictions
            : INITIAL_PET_EMERGENCY.restrictions,
        vetClinicPhone: prev.vetClinicPhone || INITIAL_PET_EMERGENCY.vetClinicPhone,
        vetClinicAddress: prev.vetClinicAddress || INITIAL_PET_EMERGENCY.vetClinicAddress,
        vetClinicName: prev.vetClinicName || INITIAL_PET_EMERGENCY.vetClinicName,
      };
    });

    setMedicalEmergency((prev) => {
      if (!prev || !Array.isArray(prev) || prev.length === 0) {
        return INITIAL_MEDICAL_EMERGENCY;
      }
      return prev.map((med) => {
        const init = INITIAL_MEDICAL_EMERGENCY.find(
          (im) => im.name === med.name || im.memberId === med.memberId
        );
        return {
          ...med,
          bloodType: med.bloodType || init?.bloodType || 'II (A) Rh+',
          allergies: med.allergies || init?.allergies || [],
          chronicConditions: med.chronicConditions || init?.chronicConditions || [],
          currentMedications: med.currentMedications || init?.currentMedications || [],
          emergencyContactPhone:
            med.emergencyContactPhone || init?.emergencyContactPhone || '+7 (916) 123-45-67',
        };
      });
    });

    setAccidentGuidance((prev) => {
      if (prev.carModel && prev.carModel.includes('Skoda Kodiaq')) {
        return INITIAL_ACCIDENT_DATA;
      }
      return prev;
    });

    setContacts((prev) => {
      const hasOldCodes = prev.some((c) => c.phone && c.phone.includes('(495)'));
      if (hasOldCodes) {
        return prev.map((c) =>
          c.phone && c.phone.includes('(495)')
            ? { ...c, phone: c.phone.replace('(495)', '(800)') }
            : c
        );
      }
      return prev;
    });

    setDocs((prev) => {
      const hasOldIssuer = prev.some((d) => d.issuer && d.issuer.includes('Москве'));
      if (hasOldIssuer) {
        return prev.map((d) =>
          d.issuer && d.issuer.includes('Москве')
            ? { ...d, issuer: 'Управление Росреестра' }
            : d
        );
      }
      return prev;
    });
  }, []);

  const activeProperty = activePropertyId === 'all'
    ? null
    : properties.find((p) => p.id === activePropertyId) || properties[0];

  const addProperty = (prop: Omit<HouseholdProperty, 'id'>) => {
    const newProp: HouseholdProperty = {
      ...prop,
      id: `prop-${Date.now()}`,
    };
    setProperties((prev) => [...prev, newProp]);
    showToast(`Объект "${newProp.name}" добавлен`, 'success');
  };

  const updateProperty = (id: string, updates: Partial<HouseholdProperty>) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    showToast('Паспорт объекта обновлен', 'success');
  };

  const deleteProperty = (id: string) => {
    if (properties.length <= 1) {
      showToast('Нельзя удалить единственный объект дома', 'warning');
      return;
    }
    setProperties((prev) => prev.filter((p) => p.id !== id));
    if (activePropertyId === id) {
      setActivePropertyId('all');
    }
    showToast('Объект успешно удалён', 'info');
  };

  const updatePetEmergency = (updates: Partial<PetEmergencyInfo>) => {
    setPetEmergency((prev) => ({ ...prev, ...updates }));
    showToast('Данные питомца и ветклиники обновлены', 'success');
  };

  const updateAccidentGuidance = (updates: Partial<AccidentGuidance>) => {
    setAccidentGuidance((prev) => ({ ...prev, ...updates }));
    showToast('Данные автомобиля и памятки ДТП обновлены', 'success');
  };

  const addMedicalEmergency = (med: MedicalMemberInfo) => {
    setMedicalEmergency((prev) => [...prev, med]);
    showToast(`Медицинские данные для ${med.name} добавлены`, 'success');
  };

  const updateMedicalEmergency = (memberId: string, updates: Partial<MedicalMemberInfo>) => {
    setMedicalEmergency((prev) => prev.map((m) => (m.memberId === memberId ? { ...m, ...updates } : m)));
    showToast('Медицинские данные члена семьи обновлены', 'success');
  };

  const deleteMedicalEmergency = (memberId: string) => {
    setMedicalEmergency((prev) => prev.filter((m) => m.memberId !== memberId));
    showToast('Медицинская запись удалена', 'info');
  };

  const loadSampleReceipts = () => {
    setReceipts(INITIAL_RECEIPTS);
    showToast('Примеры чеков (Jumbo, REWE, dm) успешно загружены для визуализации', 'success');
  };

  // Автоматическое удаление всех шаблонных/демо чеков из истории (работа только с живыми чеками)
  useEffect(() => {
    setReceipts((prev) => {
      // Исключаем все заготовленные шаблоны и образцы
      const liveOnly = prev.filter((r) => {
        const id = (r.id || '').toLowerCase();
        if (
          id.startsWith('sample') ||
          id.includes('sample-') ||
          id === 'receipt-aldi-essen-nord' ||
          id === 'receipt-penny-20261006-1513' ||
          id.startsWith('demo-')
        ) {
          return false;
        }

        // Удаляем известные ранние шаблоны по магазинам и суммам из скриншота:
        const store = (r.storeName || '').toLowerCase();
        const amt = r.totalAmount || 0;
        if (store.includes('aldi') && (Math.abs(amt - 22.84) < 0.1 || Math.abs(amt - 5.92) < 0.1)) return false;
        if (store === 'penny' && Math.abs(amt - 33.15) < 0.1) return false;
        if (store.includes('вкусвилл') && amt === 0) return false;
        if (store.includes('albert heijn') && Math.abs(amt - 13.30) < 0.1) return false;

        return true;
      });

      // Удаляем фото отфильтрованных шаблонов из IndexedDB
      const removed = prev.filter((r) => !liveOnly.includes(r));
      removed.forEach((r) => {
        deleteReceiptPhotosFromIDB(r.id).catch(() => {});
      });

      return liveOnly;
    });

    // Пакетная гидратация оригиналов фото из постоянной IndexedDB для живых чеков
    getAllReceiptPhotosMap()
      .then((photosMap) => {
        if (photosMap && Object.keys(photosMap).length > 0) {
          setReceipts((prev) =>
            prev.map((r) => {
              const idbPhotos = photosMap[r.id];
              if (idbPhotos && idbPhotos.length > 0) {
                if (!r.images || r.images.length === 0 || r.images.some((img) => !img || img.length < 500)) {
                  return { ...r, images: idbPhotos };
                }
              }
              return r;
            })
          );
        }
      })
      .catch((err) => console.warn('Ошибка гидратации фото чеков из IndexedDB:', err));
  }, []);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Tasks Logic (including Chore Rotation) ---
  const addTask = (taskData: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = {
      ...taskData,
      id: 'task_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast('Задача создана: ' + newTask.title, 'success');
  };

  const updateTask = (id: string, updates: Partial<TaskItem>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    showToast('Задача обновлена', 'info');
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Задача удалена', 'info');
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const nowCompleted = !task.completed;

        // Если задача повторяющаяся и с ротацией, при закрытии задачи переключаем исполнителя на следующего
        if (nowCompleted && task.isRotation && task.rotationOrder && task.rotationOrder.length > 1) {
          const currentIndex = task.currentRotationIndex ?? 0;
          const nextIndex = (currentIndex + 1) % task.rotationOrder.length;
          const nextAssignee = task.rotationOrder[nextIndex];
          const nextMember = members.find((m) => m.id === nextAssignee);
          
          showToast(
            `Обязанность «${task.title}» выполнена! В следующий раз очередь: ${nextMember?.name || 'следующего'}`,
            'success'
          );

          return {
            ...task,
            completed: true,
            completedAt: new Date().toISOString(),
            completedBy: activeMemberId || task.assigneeId || undefined,
            currentRotationIndex: nextIndex,
            assigneeId: nextAssignee,
          };
        }

        if (nowCompleted) {
          showToast(`Задача «${task.title}» выполнена!`, 'success');
        }

        return {
          ...task,
          completed: nowCompleted,
          completedAt: nowCompleted ? new Date().toISOString() : undefined,
          completedBy: nowCompleted ? (activeMemberId || task.assigneeId || undefined) : undefined,
        };
      })
    );
  };

  const applyTaskPack = (packId: string) => {
    const pack = taskPacks.find((p) => p.id === packId);
    if (!pack) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newTasks: TaskItem[] = pack.tasks.map((t, idx) => ({
      id: 'pack_task_' + Date.now() + '_' + idx,
      title: t.title,
      description: t.description || `Из набора «${pack.title}»`,
      zone: t.zone,
      assigneeId: members[idx % members.length]?.id || null,
      isRotation: false,
      recurrence: 'none',
      dueDate: todayStr,
      priority: t.priority,
      completed: false,
      packName: pack.title,
      points: 15,
      subtasks: t.subtasks?.map((st, sIdx) => ({
        id: `st_${Date.now()}_${idx}_${sIdx}`,
        title: st,
        completed: false,
      })),
    }));

    setTasks((prev) => [...newTasks, ...prev]);
    showToast(`Набор «${pack.title}» успешно применён (${newTasks.length} задач)!`, 'success');
  };

  // --- Calendar Logic ---
  const addEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: 'event_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    };
    setEvents((prev) => [...prev, newEvent]);
    showToast('Событие добавлено в календарь', 'success');
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    showToast('Событие обновлено', 'info');
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    showToast('Событие удалено', 'info');
  };

  const exportCalendarIcs = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Дом без хаоса//OneHaus RU//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Семейный календарь (Дом без хаоса)',
    ];

    events.forEach((ev) => {
      const dtStart = ev.date.replace(/-/g, '') + (ev.allDay ? '' : 'T' + ev.startTime.replace(':', '') + '00');
      const dtEnd = ev.date.replace(/-/g, '') + (ev.allDay ? '' : 'T' + ev.endTime.replace(':', '') + '00');
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${ev.id}@onehaus.ru`);
      icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      icsContent.push(`DTSTART:${dtStart}`);
      icsContent.push(`DTEND:${dtEnd}`);
      icsContent.push(`SUMMARY:${ev.title}`);
      if (ev.description) icsContent.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
      if (ev.location) icsContent.push(`LOCATION:${ev.location}`);
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'onehaus-family-calendar.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Файл календаря .ics успешно скачан!', 'success');
  };

  // --- Shopping Lists Logic ---
  const addShoppingItem = (itemData: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    const newItem: ShoppingItem = {
      ...itemData,
      id: 'shop_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date().toISOString(),
    };
    setShoppingItems((prev) => [newItem, ...prev]);
    showToast(`Товар «${newItem.title}» добавлен в список`, 'success');
  };

  const toggleShoppingItem = (id: string) => {
    setShoppingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const deleteShoppingItem = (id: string) => {
    setShoppingItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompletedShoppingItems = (listId: string) => {
    const countBefore = shoppingItems.filter((i) => i.listId === listId && i.completed).length;
    setShoppingItems((prev) => prev.filter((item) => !(item.listId === listId && item.completed)));
    showToast(`Удалено купленных товаров: ${countBefore}`, 'info');
  };

  const addShoppingList = (name: string, icon: string) => {
    const newList: ShoppingList = {
      id: 'list_' + Date.now().toString(36),
      name,
      icon,
    };
    setShoppingLists((prev) => [...prev, newList]);
    setActiveShoppingListId(newList.id);
    showToast(`Список «${name}» создан`, 'success');
  };

  const importRecipeIngredientsToShopping = (recipe: Recipe, targetListId?: string) => {
    const listId = targetListId || activeShoppingListId || shoppingLists[0]?.id || 'list-supermarket';
    const newItems: ShoppingItem[] = recipe.ingredients.map((ing, i) => ({
      id: 'rec_ing_' + Date.now() + '_' + i,
      listId,
      title: ing.name,
      quantity: ing.amount,
      category: (ing.category as any) || 'pantry',
      completed: false,
      addedBy: activeMemberId || undefined,
      recipeSource: recipe.title,
      createdAt: new Date().toISOString(),
    }));

    setShoppingItems((prev) => [...newItems, ...prev]);
    showToast(`Ингредиенты блюда «${recipe.title}» (${newItems.length} поз.) добавлены в покупки!`, 'success');
  };

  // --- Meals & Recipes Logic ---
  const addRecipe = (recipeData: Omit<Recipe, 'id'>) => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: 'recipe_' + Date.now().toString(36),
    };
    setRecipes((prev) => [newRecipe, ...prev]);
    showToast('Рецепт сохранён в семейную книгу', 'success');
  };

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    showToast('Рецепт обновлён', 'info');
  };

  const deleteRecipe = (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    showToast('Рецепт удалён', 'info');
  };

  const updateMealSlot = (
    date: string,
    slot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    data?: { recipeId?: string; customTitle?: string; note?: string }
  ) => {
    setMealPlan((prev) => {
      const existingDay = prev.find((d) => d.date === date);
      if (existingDay) {
        return prev.map((d) => (d.date === date ? { ...d, [slot]: data } : d));
      } else {
        return [...prev, { date, [slot]: data }];
      }
    });
    showToast('План питания обновлён', 'success');
  };

  // --- Inventory Logic ---
  const addInventoryItem = (itemData: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: 'inv_' + Date.now().toString(36),
    };
    setInventory((prev) => [newItem, ...prev]);
    showToast(`Предмет «${newItem.name}» добавлен в инвентарь`, 'success');
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    showToast('Данные инвентаря обновлены', 'info');
  };

  const deleteInventoryItem = (id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    showToast('Предмет удалён из инвентаря', 'info');
  };

  // --- Documents Logic ---
  const addDoc = (docData: Omit<DocumentItem, 'id'>) => {
    const newDoc: DocumentItem = {
      ...docData,
      id: 'doc_' + Date.now().toString(36),
    };
    setDocs((prev) => [newDoc, ...prev]);
    showToast(`Документ «${newDoc.title}» сохранён`, 'success');
  };

  const updateDoc = (id: string, updates: Partial<DocumentItem>) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    showToast('Документ обновлён', 'info');
  };

  const deleteDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    showToast('Документ удалён', 'info');
  };

  // --- Contacts Logic ---
  const addContact = (contactData: Omit<HouseholdContact, 'id'>) => {
    const newContact: HouseholdContact = {
      ...contactData,
      id: 'contact_' + Date.now().toString(36),
    };
    setContacts((prev) => [newContact, ...prev]);
    showToast(`Контакт «${newContact.name}» сохранён`, 'success');
  };

  const updateContact = (id: string, updates: Partial<HouseholdContact>) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    showToast('Контакт обновлён', 'info');
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    showToast('Контакт удалён', 'info');
  };

  // --- Members Logic ---
  const addMember = (memberData: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...memberData,
      id: 'member_' + Date.now().toString(36),
    };
    setMembers((prev) => [...prev, newMember]);
    showToast(`Участник ${newMember.name} добавлен в семью`, 'success');
  };

  const updateMember = (id: string, updates: Partial<FamilyMember>) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    showToast('Профиль участника обновлён', 'info');
  };

  const deleteMember = (id: string) => {
    if (members.length <= 1) {
      showToast('В доме должен оставаться хотя бы один участник', 'warning');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (activeMemberId === id) setActiveMemberId(null);
    showToast('Участник удалён', 'info');
  };

  const updateMemberPhoto = (memberId: string, photoBase64: string | undefined) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, avatar: photoBase64 } : m))
    );
    if (photoBase64) {
      showToast('Фотография участника сохранена', 'success');
    } else {
      showToast('Фотография участника удалена', 'info');
    }
  };

  // --- Receipts Scanner & History Logic ---
  const saveReceipt = async (receipt: ScannedReceipt) => {
    // 1. Первичное и постоянное сохранение фотографий в IndexedDB (без лимитов памяти 5 МБ)
    if (receipt.images && receipt.images.length > 0) {
      try {
        await saveReceiptPhotosToIDB(receipt.id, receipt.images);
      } catch (err) {
        console.warn('Не удалось записать фото в IndexedDB:', err);
      }
    }
    setReceipts((prev) => [receipt, ...prev.filter((r) => r.id !== receipt.id)]);
    showToast(`Чек из магазина «${receipt.storeName || 'Покупки'}» сохранён в историю`, 'success');
  };

  const deleteReceipt = async (id: string) => {
    try {
      await deleteReceiptPhotosFromIDB(id);
    } catch (err) {
      console.warn('Не удалось удалить фото из IndexedDB:', err);
    }
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    showToast('Чек удалён из истории', 'info');
  };

  const clearAllReceipts = async () => {
    try {
      for (const r of receipts) {
        await deleteReceiptPhotosFromIDB(r.id).catch(() => {});
      }
    } catch (err) {
      console.warn('Не удалось очистить фото из IndexedDB:', err);
    }
    setReceipts([]);
    showToast('Все чеки удалены из истории', 'info');
  };

  const updateReceipt = (id: string, updates: Partial<ScannedReceipt>) => {
    setReceipts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    showToast('Данные чека обновлены', 'info');
  };

  const importReceiptItemsToShopping = (items: ReceiptItemLine[], targetListId?: string) => {
    const listId = targetListId || activeShoppingListId || shoppingLists[0]?.id || 'list-supermarket';
    const newItems: ShoppingItem[] = items.map((it) => ({
      id: 'shop_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      listId,
      title: it.normalizedTitle || it.originalText,
      category: it.category || 'other',
      quantity: it.quantity > 1 ? `${it.quantity} ${it.unit || 'шт'}` : undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    }));

    setShoppingItems((prev) => [...prev, ...newItems]);
    showToast(`Добавлено ${newItems.length} позиций из чека в список покупок`, 'success');
  };

  // --- Backup & Reset ---
  const exportBackupJson = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      householdName,
      members,
      tasks,
      events,
      shoppingLists,
      shoppingItems,
      recipes,
      mealPlan,
      inventory,
      docs,
      contacts,
      receipts,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `onehaus-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Резервная копия данных успешно скачана!', 'success');
  };

  const importBackupJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.members && data.tasks) {
        if (data.householdName) setHouseholdName(data.householdName);
        if (data.members) setMembers(data.members);
        if (data.tasks) setTasks(data.tasks);
        if (data.events) setEvents(data.events);
        if (data.shoppingLists) setShoppingLists(data.shoppingLists);
        if (data.shoppingItems) setShoppingItems(data.shoppingItems);
        if (data.recipes) setRecipes(data.recipes);
        if (data.mealPlan) setMealPlan(data.mealPlan);
        if (data.inventory) setInventory(data.inventory);
        if (data.docs) setDocs(data.docs);
        if (data.contacts) setContacts(data.contacts);
        if (data.receipts) setReceipts(data.receipts);
        showToast('Данные успешно восстановлены из файла!', 'success');
        return true;
      }
      throw new Error('Некорректная структура файла');
    } catch (e) {
      showToast('Ошибка при чтении файла резервной копии', 'error');
      return false;
    }
  };

  const resetToDefaultData = () => {
    setHouseholdName('Наш тёплый дом');
    setMembers(INITIAL_MEMBERS);
    setTasks(INITIAL_TASKS);
    setEvents(INITIAL_EVENTS);
    setShoppingLists(INITIAL_SHOPPING_LISTS);
    setShoppingItems(INITIAL_SHOPPING_ITEMS);
    setRecipes(INITIAL_RECIPES);
    setMealPlan(INITIAL_MEAL_PLAN);
    setInventory(INITIAL_INVENTORY);
    setDocs(INITIAL_DOCS);
    setContacts(INITIAL_CONTACTS);
    setReceipts(INITIAL_RECEIPTS);
    setMedicines(INITIAL_MEDICINES);
    setMeters(INITIAL_UTILITY_METERS);
    setProperties(INITIAL_PROPERTIES);
    setActivePropertyId('apartment');
    setPetEmergency(INITIAL_PET_EMERGENCY);
    setAccidentGuidance(INITIAL_ACCIDENT_DATA);
    setMedicalEmergency(INITIAL_MEDICAL_EMERGENCY);
    setIsSOSOpen(false);
    setActiveMemberId(null);
    saveAllTasksToIDB(INITIAL_TASKS).catch(() => {});
    saveAllEventsToIDB(INITIAL_EVENTS).catch(() => {});
    showToast('Данные сброшены к исходному демонстрационному состоянию', 'info');
  };

  return (
    <HouseholdContext.Provider
      value={{
        isOffline,
        offlineStats,
        syncOfflineData,
        householdName,
        setHouseholdName,
        members,
        activeMemberId,
        setActiveMemberId,
        tasks,
        taskPacks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompletion,
        applyTaskPack,
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        exportCalendarIcs,
        shoppingLists,
        activeShoppingListId,
        setActiveShoppingListId,
        shoppingItems,
        addShoppingItem,
        toggleShoppingItem,
        deleteShoppingItem,
        clearCompletedShoppingItems,
        addShoppingList,
        importRecipeIngredientsToShopping,
        recipes,
        mealPlan,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        updateMealSlot,
        inventory,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        docs,
        addDoc,
        updateDoc,
        deleteDoc,
        contacts,
        addContact,
        updateContact,
        deleteContact,
        addMember,
        updateMember,
        deleteMember,
        updateMemberPhoto,
        receipts,
        saveReceipt,
        deleteReceipt,
        clearAllReceipts,
        loadSampleReceipts,
        updateReceipt,
        importReceiptItemsToShopping,
        medicines,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addMedicineToShoppingList,
        meters,
        addMeter,
        updateMeter,
        deleteMeter,
        addMeterReading,
        toggleReadingSubmitted,
        properties,
        activePropertyId,
        setActivePropertyId,
        activeProperty,
        addProperty,
        updateProperty,
        deleteProperty,
        isSOSOpen,
        setIsSOSOpen,
        petEmergency,
        updatePetEmergency,
        accidentGuidance,
        updateAccidentGuidance,
        medicalEmergency,
        addMedicalEmergency,
        updateMedicalEmergency,
        deleteMedicalEmergency,
        exportBackupJson,
        importBackupJson,
        resetToDefaultData,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
