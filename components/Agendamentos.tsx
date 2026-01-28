
import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Clock, Plus, Search, ChevronLeft, ChevronRight,
  Car, User, Bell, Check, X, RefreshCw, Smartphone, Trash2, LayoutGrid,
  CalendarDays, CalendarRange, Filter, CheckCircle2
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { Appointment, Vehicle, Client } from '../types';
import VoiceInput from './VoiceInput';

type CalendarView = 'month' | 'week' | 'day';

const Agendamentos: React.FC = () => {
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

  // Filter appointments by selected day or show upcoming
  const filteredAppointments = useMemo(() => {
    if (selectedDay) {
      return appointments.filter(a => a.date === selectedDay);
    }
    // Show upcoming appointments (today and future)
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(a => a.date >= today).slice(0, 10);
  }, [appointments, selectedDay]);

  useEffect(() => {
    const load = async () => {
      const all = await dataProvider.getAppointments();
      let filtered = all;
      if (search) {
        const q = search.toLowerCase();
        filtered = all.filter(a =>
          a.title.toLowerCase().includes(q) ||
          a.vehicle_plate?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
        );
      }
      setAppointments(filtered);
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
      description: '', notify_enabled: true, notify_before_minutes: 60
    });
    const all = await dataProvider.getAppointments();
    setAppointments(all);
    showToast('Agendamento criado!');
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('derived')) return;
    await dataProvider.deleteAppointment(id);
    const all = await dataProvider.getAppointments();
    setAppointments(all);
    showToast('Agendamento removido');
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
          {filteredAppointments.length > 0 ? filteredAppointments.map(app => (
            <div
              key={app.id}
              className={`p-5 rounded-[2.25rem] border-2 bg-white flex items-center justify-between transition-all active:scale-[0.98] ${app.type === 'service_delivery' ? 'border-green-100 bg-gradient-to-r from-green-50/50 to-white' : 'border-slate-50'
                }`}
            >
              <div className="flex gap-4 items-center flex-1">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${app.type === 'service_delivery' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-300'
                  }`}>
                  {app.type === 'service_delivery' ? <CheckCircle2 size={24} /> : <CalendarIcon size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-md font-semibold uppercase text-slate-800 tracking-tight truncate leading-none mb-1.5">{app.title}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-indigo-300" />
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">{app.time}</span>
                    </div>
                    {app.vehicle_plate && (
                      <div className="flex items-center gap-1">
                        <Car size={12} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{app.vehicle_plate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-[10px] font-bold text-slate-300 uppercase">{new Date(app.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                {app.type === 'manual' && (
                  <button onClick={() => handleDelete(app.id)} className="p-3 text-slate-200 hover:text-red-500 active:scale-125 transition-all"><Trash2 size={16} /></button>
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
    </div>
  );
};

export default Agendamentos;
