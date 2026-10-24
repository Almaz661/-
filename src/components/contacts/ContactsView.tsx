import React, { useState } from 'react';
import {
  Phone,
  Plus,
  Wrench,
  Zap,
  HeartPulse,
  Dog,
  Sparkles,
  Car,
  AlertTriangle,
  Edit2,
  Trash2,
  Star,
  Copy,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { ContactCategory, HouseholdContact } from '../../types';
import { ContactModal } from './ContactModal';

export const ContactsView: React.FC = () => {
  const { contacts, deleteContact, showToast } = useHousehold();

  const [activeCategory, setActiveCategory] = useState<ContactCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<HouseholdContact | null>(null);

  const filteredContacts = contacts.filter((c) => {
    if (activeCategory === 'all') return true;
    return c.category === activeCategory;
  });

  const getCategoryIcon = (cat: ContactCategory) => {
    switch (cat) {
      case 'plumber':
        return <Wrench className="w-5 h-5 text-blue-600" />;
      case 'electrician':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'doctor':
        return <HeartPulse className="w-5 h-5 text-rose-500" />;
      case 'vet':
        return <Dog className="w-5 h-5 text-orange-600" />;
      case 'cleaning':
        return <Sparkles className="w-5 h-5 text-teal-600" />;
      case 'emergency':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Phone className="w-5 h-5 text-stone-600" />;
    }
  };

  const handleCopyPhone = (ph: string) => {
    navigator.clipboard.writeText(ph);
    showToast(`Телефон ${ph} скопирован`, 'info');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Верхняя строка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Табы категорий специалистов */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EFECE4] border border-[#E3DFD5] overflow-x-auto">
          {[
            { id: 'all', label: 'Все контакты' },
            { id: 'plumber', label: 'Сантехники' },
            { id: 'electrician', label: 'Электрики' },
            { id: 'doctor', label: 'Врачи' },
            { id: 'vet', label: 'Ветеринары' },
            { id: 'emergency', label: 'Аварийные' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? 'bg-white text-[#1F1D1A] shadow-xs'
                  : 'text-[#6B6456] hover:text-[#1F1D1A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setContactToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Добавить мастера</span>
        </button>
      </div>

      {/* Сетка контактов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-white rounded-3xl p-5 border border-[#EBE7DF] shadow-xs hover:border-[#E15A42]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#FAF8F3] border border-[#EBE7DF] flex items-center justify-center">
                    {getCategoryIcon(contact.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#1F1D1A] leading-snug">
                      {contact.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-[#8C522C]">
                      {contact.specialty}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setContactToEdit(contact);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteContact(contact.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Телефонный номер */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF9F5] border border-stone-200 text-xs">
                <span className="font-bold text-[#1F1D1A]">{contact.phone}</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleCopyPhone(contact.phone)}
                    className="p-1 text-stone-400 hover:text-stone-700"
                    title="Скопировать"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-600 text-white font-semibold text-[11px] shadow-xs hover:bg-emerald-700"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Вызов</span>
                  </a>
                </div>
              </div>

              {contact.address && (
                <p className="text-xs text-[#8A8477]">📍 {contact.address}</p>
              )}

              {contact.notes && (
                <p className="text-xs text-[#5C564B] bg-[#FAF8F3] p-2.5 rounded-xl border border-stone-100 leading-relaxed">
                  {contact.notes}
                </p>
              )}
            </div>

            {/* Рейтинг */}
            {contact.rating && (
              <div className="pt-2 border-t border-[#F0ECE1] flex items-center space-x-1 text-amber-500 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{contact.rating} из 5.0</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setContactToEdit(null);
        }}
        contactToEdit={contactToEdit}
      />
    </div>
  );
};
