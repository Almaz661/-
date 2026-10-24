import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Clock,
  Flame,
  Plus,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { Recipe } from '../../types';
import { RecipeDetailModal } from './RecipeDetailModal';

type MealTab = 'plan' | 'recipes';

const DAYS_NAMES = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export const MealsView: React.FC = () => {
  const { mealPlan, recipes, updateMealSlot, deleteRecipe, importRecipeIngredientsToShopping } =
    useHousehold();

  const [activeTab, setActiveTab] = useState<MealTab>('plan');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Недельные даты, начиная с понедельника текущей недели
  const today = new Date();
  const currentDayOfWeek = (today.getDay() + 6) % 7; // 0 for Mon
  const monday = new Date(today);
  monday.setDate(today.getDate() - currentDayOfWeek);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const todayStr = today.toISOString().split('T')[0];

  const filteredRecipes = recipes.filter((r) => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Верхняя строка переключения табов */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EFECE4] border border-[#E3DFD5]">
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'plan'
                ? 'bg-white text-[#1F1D1A] shadow-xs'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>План питания на неделю</span>
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'recipes'
                ? 'bg-white text-[#1F1D1A] shadow-xs'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Семейная книга рецептов ({recipes.length})</span>
          </button>
        </div>

        {activeTab === 'recipes' && (
          <div className="flex items-center space-x-2 overflow-x-auto">
            {['all', 'breakfast', 'lunch', 'dinner', 'snack'].map((cat) => {
              const labelMap: Record<string, string> = {
                all: 'Все блюда',
                breakfast: 'Завтраки',
                lunch: 'Обеды',
                dinner: 'Ужины',
                snack: 'Перекусы',
              };
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#1F1D1A] text-white'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {labelMap[cat]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. План питания на неделю (Сетка по дням) */}
      {activeTab === 'plan' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDates.map((dateStr, idx) => {
              const dayPlan = mealPlan.find((p) => p.date === dateStr);
              const isToday = dateStr === todayStr;
              const dateObj = new Date(dateStr);

              const slots: Array<{
                slotKey: 'breakfast' | 'lunch' | 'dinner' | 'snack';
                label: string;
                emoji: string;
                slotData?: { recipeId?: string; customTitle?: string };
              }> = [
                { slotKey: 'breakfast', label: 'Завтрак', emoji: '🍳', slotData: dayPlan?.breakfast },
                { slotKey: 'lunch', label: 'Обед', emoji: '🍲', slotData: dayPlan?.lunch },
                { slotKey: 'dinner', label: 'Ужин', emoji: '🍝', slotData: dayPlan?.dinner },
                { slotKey: 'snack', label: 'Перекус', emoji: '🍎', slotData: dayPlan?.snack },
              ];

              return (
                <div
                  key={dateStr}
                  className={`p-3.5 rounded-3xl border flex flex-col space-y-2.5 transition-all ${
                    isToday
                      ? 'bg-amber-50/50 border-[#E15A42]/50 shadow-xs'
                      : 'bg-white border-[#EBE7DF]'
                  }`}
                >
                  {/* Заголовок дня */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
                    <div className="overflow-hidden">
                      <div className="text-[11px] font-bold text-[#8A8477] truncate">
                        {DAYS_NAMES[idx]}
                      </div>
                      <div className="text-xs font-extrabold text-[#1F1D1A]">
                        {dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E15A42] text-white">
                        Сегодня
                      </span>
                    )}
                  </div>

                  {/* 4 слота приёма пищи */}
                  <div className="space-y-2 flex-1">
                    {slots.map(({ slotKey, label, emoji, slotData }) => {
                      const recipe = slotData?.recipeId
                        ? recipes.find((r) => r.id === slotData.recipeId)
                        : null;
                      const title = recipe?.title || slotData?.customTitle;

                      return (
                        <div
                          key={slotKey}
                          onClick={() => {
                            if (recipe) {
                              setSelectedRecipe(recipe);
                            } else {
                              const newTitle = prompt(
                                `Что запланировать на ${label.toLowerCase()} (${DAYS_NAMES[idx]})?`,
                                title || ''
                              );
                              if (newTitle !== null) {
                                updateMealSlot(dateStr, slotKey, {
                                  customTitle: newTitle.trim() || undefined,
                                });
                              }
                            }
                          }}
                          className={`p-2 rounded-2xl border text-left transition-all cursor-pointer ${
                            title
                              ? 'bg-[#FAF8F3] border-[#E8E2D4] hover:bg-white hover:border-[#E15A42]/40 shadow-2xs'
                              : 'bg-stone-50/50 border-dashed border-stone-200 hover:bg-stone-100/60'
                          }`}
                        >
                          <div className="text-[10px] font-semibold text-[#8A8477] flex items-center space-x-1">
                            <span>{emoji}</span>
                            <span>{label}</span>
                          </div>
                          <div className="text-xs font-bold text-[#1F1D1A] truncate mt-0.5">
                            {title || <span className="text-stone-300 font-normal">+ Добавить</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Семейная книга рецептов */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden hover:border-[#E15A42]/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Фото рецепта */}
                <div className="relative h-44 overflow-hidden bg-stone-100">
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-xl bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} мин</span>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#8C522C] border border-[#E8E2D4]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-bold text-sm text-[#1F1D1A] group-hover:text-[#E15A42] transition-colors leading-snug">
                    {recipe.title}
                  </h3>

                  <p className="text-xs text-[#8A8477] line-clamp-2">
                    {recipe.description}
                  </p>
                </div>
              </div>

              {/* Нижняя плашка действий */}
              <div className="px-5 py-3 bg-[#FAF8F5] border-t border-[#F0ECE1] flex items-center justify-between text-xs">
                <span className="text-[#8A8477] font-medium">
                  {recipe.ingredients.length} ингредиентов
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    importRecipeIngredientsToShopping(recipe);
                  }}
                  className="flex items-center space-x-1 text-[#E15A42] font-semibold hover:underline"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>В покупки</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка детального рецепта */}
      <RecipeDetailModal
        isOpen={Boolean(selectedRecipe)}
        onClose={() => setSelectedRecipe(null)}
        recipe={selectedRecipe}
      />
    </div>
  );
};
