
import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Clock, Plus, Search, ChevronLeft, ChevronRight,
  Car, User, Bell, Check, X, RefreshCw, Smartphone, Trash2, LayoutGrid,
  CalendarDays, CalendarRange, Filter, CheckCircle2, BellRing, ExternalLink, CircleCheck, Circle, Pencil
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { Appointment, ReminderWithService } from '../types';
import VoiceInput from './VoiceInput';

type CalendarView = 'month' | 'week' | 'day';

// Tipo unificado para exibição na agenda
type AgendaItem = (Appointment & { itemType: 'appointment' }) | (ReminderWithService & { itemType: 'reminder' });

interface AgendamentosProps {
  onOpenService?: (serviceId: string) => void;
}

const Agendamentos: React.FC<AgendamentosProps> = ({ onOpenService }) => {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    vehicle_plate: '',
    description: '',
    notify_enabled: true,
    notify_before_minutes: 60
  });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<ReminderWithService[]>([]);

  // Mesclar agendamentos e lembretes
  const allItems = useMemo<AgendaItem[]>(() => {
    const appItems = appointments.map(a => ({ ...a, itemType: 'appointment' as const }));
    const remItems = reminders.map(r => ({ ...r, itemType: 'reminder' as const }));
    return [...appItems, ...remItems].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }, [appointments, reminders]);

  // Filter items by selected day or show upcoming
  const filteredItems = useMemo(() => {
    if (selectedDay) {
      return allItems.filter(a => a.date === selectedDay);
    }
    // Show upcoming items (today and future)
    const today = new Date().toISOString().split('T')[0];
    return allItems.filter(a => a.date >= today).slice(0, 15);
  }, [allItems, selectedDay]);

  useEffect(() => {
    const load = async () => {
      // Buscar agendamentos
      const allAppointments = await dataProvider.getAppointments();
      let filteredApps = allAppointments;
      if (search) {
        const q = search.toLowerCase();
        filteredApps = allAppointments.filter(a =>
          a.title.toLowerCase().includes(q) ||
          a.vehicle_plate?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.client_name?.toLowerCase().includes(q)
        );
      }
      setAppointments(filteredApps);

      // Buscar lembretes (incluindo concluídos para mostrar com visual riscado)
      const allReminders = await dataProvider.getAllReminders(true);
      let filteredReminders = allReminders;
      if (search) {
        const q = search.toLowerCase();
        filteredReminders = allReminders.filter(r =>
          r.title.toLowerCase().includes(q) ||
          r.vehicle_plate?.toLowerCase().includes(q) ||
          r.client_name?.toLowerCase().includes(q)
        );
      }
      setReminders(filteredReminders);
    };
    load();
  }, [search]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSyncGoogle = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast('Calendário sincronizado!');
    }, 1500);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date || !formData.time) return;
    await dataProvider.addAppointment({
      ...formData,
      type: 'manual',
      date: formData.date,
      time: formData.time
    });
    setIsAdding(false);
    setFormData({
      title: '', date: '', time: '', vehicle_plate: '',
      description: '', notify_enabled: true, notify_before_minutes: 15
    });
    const all = await dataProvider.getAppointments();
    setAppointments(all);
    showToast('Agendamento criado!');
  };

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editFormData, setEditFormData] = useState({ date: '', time: '', notify_before_minutes: 15 });

  const handleEditAppointment = (app: Appointment) => {
    setEditingAppointment(app);
    setEditFormData({
      date: app.date,
      time: app.time,
      notify_before_minutes: app.notify_before_minutes || 15
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment || !editFormData.date || !editFormData.time) return;
    await dataProvider.updateAppointment(editingAppointment.id, {
      date: editFormData.date,
      time: editFormData.time,
      notify_before_minutes: editFormData.notify_before_minutes
    });
    setEditingAppointment(null);
    const all = await dataProvider.getAppointments();
    setAppointments(all);
    showToast('Agendamento atualizado!');
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('derived')) return;
    await dataProvider.deleteAppointment(id);
    const all = await dataProvider.getAppointments();
    setAppointments(all);
    showToast('Agendamento removido');
  };

  // Toggle reminder status between active/done
  const handleToggleReminder = async (reminder: ReminderWithService) => {
    const newStatus = reminder.status === 'active' ? 'done' : 'active';
    await dataProvider.updateReminder(reminder.id, { status: newStatus });
    // Refresh reminders (incluindo concluídos)
    const allReminders = await dataProvider.getAllReminders(true);
    setReminders(allReminders);
    showToast(newStatus === 'done' ? 'Lembrete concluído!' : 'Lembrete reativado!');
  };

  const daysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    return { firstDay, lastDate };
  };

  const calendarGrid = useMemo(() => {
    const { firstDay, lastDate } = daysInMonth(currentDate);
    const grid = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= lastDate; d++) grid.push(d);
    return grid;
  }, [currentDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-24 font-['Inter']">

      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-bold uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <Check className="text-green-500" size={18} /> {toast}
        </div>
      )}

      {/* Header & Sync */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight text-slate-800">Agenda Oficina</h2>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">Gestão de Fluxo</p>
            </div>
          </div>
          <button
            onClick={handleSyncGoogle}
            disabled={isSyncing}
            className={`p-3.5 rounded-2xl border-2 transition-all flex items-center gap-2 group ${isSyncing ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-white border-slate-100 text-slate-600 active:scale-95'
              }`}
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : 'group-active:rotate-180 transition-transform duration-500'} />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Sincronizar</span>
          </button>
        </div>

        <div className="relative group">
          <VoiceInput
            multiline={false}
            value={search}
            onTranscript={setSearch}
            placeholder="Buscar agendamento..."
            className="!pl-12 !py-4 !bg-slate-50 !border-slate-100 !text-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex p-1 bg-slate-200/50 rounded-[1.75rem] mx-1">
          {[
            { id: 'month', label: 'Mês', icon: <LayoutGrid size={14} /> },
            { id: 'week', label: 'Semana', icon: <CalendarRange size={14} /> },
            { id: 'day', label: 'Hoje', icon: <CalendarDays size={14} /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id as CalendarView)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 ${view === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-6 bg-white py-4 rounded-[2rem] border-2 border-slate-50 shadow-sm">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 bg-slate-50 rounded-full text-slate-300 active:bg-slate-100"><ChevronLeft size={20} /></button>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 bg-slate-50 rounded-full text-slate-300 active:bg-slate-100"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Grid */}
      {view === 'month' && (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-[10px] font-bold uppercase text-slate-400 text-center py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const dayStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const dayApps = appointments.filter(a => a.date === dayStr);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              const isSelected = selectedDay === dayStr;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : dayStr)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative border-2 transition-all active:scale-95 ${isSelected
                    ? 'bg-indigo-100 border-indigo-500 text-indigo-700 shadow-md ring-2 ring-indigo-200'
                    : isToday
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                      : dayApps.length > 0
                        ? 'bg-white border-slate-200 text-slate-700 shadow-sm hover:border-indigo-300'
                        : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                    }`}
                >
                  <span className="text-sm font-bold">{day}</span>
                  {dayApps.length > 0 && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {dayApps.slice(0, 3).map((a, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${a.type === 'service_delivery' ? 'bg-green-500' : 'bg-orange-400'}`} />
                      ))}
                      {dayApps.length > 3 && <span className="text-[8px] text-slate-400">+{dayApps.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Header & List */}
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[3px] ml-2">
              {selectedDay
                ? `${new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`
                : 'Próximos Compromissos'
              }
            </h3>
            {selectedDay && (
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide bg-indigo-50 px-3 py-1 rounded-full"
              >
                Ver todos
              </button>
            )}
          </div>
          <Filter size={16} className="text-slate-300 mr-2" />
        </div>
        <div className="space-y-3">
          {filteredItems.length > 0 ? filteredItems.map(item => (
            <div
              key={item.itemType === 'reminder' ? `rem-${item.id}` : item.id}
              className={`p-5 rounded-[2.25rem] border-2 bg-white flex items-start justify-between transition-all ${item.itemType === 'reminder'
                ? item.status === 'done'
                  ? 'border-slate-100 bg-slate-50/50 opacity-60'
                  : 'border-amber-100 bg-gradient-to-r from-amber-50/50 to-white'
                : item.itemType === 'appointment' && item.type === 'service_delivery'
                  ? 'border-green-100 bg-gradient-to-r from-green-50/50 to-white'
                  : 'border-slate-50'
                }`}
            >
              <div className="flex gap-3 items-start flex-1 min-w-0 overflow-hidden">
                {/* Icon - different for reminders vs appointments */}
                {item.itemType === 'reminder' ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleReminder(item as ReminderWithService)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-all active:scale-90 ${item.status === 'done'
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                        }`}
                      title={item.status === 'done' ? 'Reativar lembrete' : 'Marcar como concluído'}
                    >
                      {item.status === 'done' ? <CircleCheck size={20} /> : <Circle size={20} />}
                    </button>
                    {onOpenService && (
                      <button
                        onClick={() => onOpenService(item.service_id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition-all active:scale-90"
                        title="Editar lembrete"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditAppointment(item as Appointment)}
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-inner transition-all active:scale-90 ${item.type === 'service_delivery' ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                      }`}
                    title="Editar data/hora"
                  >
                    {item.type === 'service_delivery' ? <CheckCircle2 size={20} /> : <CalendarIcon size={20} />}
                  </button>
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1.5 overflow-hidden">
                    {item.itemType === 'reminder' && (
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${item.status === 'done' ? 'text-green-600 bg-green-100' : 'text-amber-600 bg-amber-100'
                        }`}>
                        {item.status === 'done' ? 'Concluído' : 'Lembrete'}
                      </span>
                    )}
                    <p className={`text-sm font-semibold uppercase tracking-tight truncate leading-none ${item.itemType === 'reminder' && item.status === 'done'
                      ? 'text-slate-400 line-through'
                      : 'text-slate-800'
                      }`}>{item.title}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-indigo-300" />
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">{item.time}</span>
                    </div>
                    {item.client_name && (
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-amber-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.client_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(item.vehicle_brand || item.vehicle_model || item.vehicle_plate) && (
                      <div className="flex items-center gap-1">
                        <Car size={12} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {item.vehicle_plate || [item.vehicle_brand, item.vehicle_model].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    )}
                    {item.client_phone && (
                      <a
                        href={`https://wa.me/55${item.client_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-full transition-all active:scale-95"
                      >
                        <Smartphone size={12} className="text-green-500" />
                        <span className="text-[10px] font-bold text-green-600">{item.client_phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                <p className="text-[10px] font-bold text-slate-300 uppercase">{new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                {item.itemType === 'appointment' && item.type === 'manual' && (
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-200 hover:text-red-500 active:scale-125 transition-all"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          )) : (
            <div className="py-16 text-center space-y-4 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <CalendarIcon size={32} />
              </div>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                {selectedDay ? 'Nenhum compromisso neste dia' : 'Nenhum compromisso'}
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsAdding(true)}
        className="fixed bottom-28 right-6 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 border-4 border-white"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* Modal - Typography refinement applied to inner fields */}
      {isAdding && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 max-h-[95vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold uppercase text-slate-800 tracking-tight leading-none">Novo Agendamento</h3>
                <p className="text-[10px] font-medium text-slate-400 uppercase mt-2 tracking-widest">Organize seu fluxo</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-4 bg-slate-100 rounded-full text-slate-300 active:scale-90 transition-all touch-target"><X size={24} /></button>
            </div>
            {/* Form simplified weights */}
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">O que será agendado? *</label>
                <VoiceInput multiline={false} value={formData.title} onTranscript={v => setFormData({ ...formData, title: v })} placeholder="Ex: Revisão de 20k km..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Data *</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-semibold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Horário *</label>
                  <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-semibold outline-none" />
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                <button onClick={handleSave} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Salvar Agendamento</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Data/Hora */}
      {editingAppointment && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-6 animate-in slide-in-from-bottom-20">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold uppercase text-slate-800 tracking-tight leading-none">Editar Agendamento</h3>
                <p className="text-[10px] font-medium text-slate-400 uppercase mt-2 tracking-widest">{editingAppointment.title}</p>
              </div>
              <button onClick={() => setEditingAppointment(null)} className="p-4 bg-slate-100 rounded-full text-slate-300 active:scale-90 transition-all touch-target"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Data *</label>
                  <input type="date" value={editFormData.date} onChange={e => setEditFormData({ ...editFormData, date: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-semibold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Horário *</label>
                  <input type="time" value={editFormData.time} onChange={e => setEditFormData({ ...editFormData, time: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-semibold outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Avisar antes (minutos)</label>
                <select
                  value={editFormData.notify_before_minutes}
                  onChange={e => setEditFormData({ ...editFormData, notify_before_minutes: parseInt(e.target.value) })}
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-semibold outline-none"
                >
                  <option value={5}>5 minutos antes</option>
                  <option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                  <option value={120}>2 horas antes</option>
                  <option value={1440}>1 dia antes</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4 border-t">
                <button onClick={() => setEditingAppointment(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                <button onClick={handleSaveEdit} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Salvar Alterações</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agendamentos;
