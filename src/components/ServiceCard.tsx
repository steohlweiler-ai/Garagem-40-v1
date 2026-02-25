import React, { useState, useEffect, useMemo } from 'react';
import { ServiceJob, ServiceStatus, UserAccount, DelayCriteria } from '../types';
import { Clock, StickyNote, CheckCircle2 } from 'lucide-react';
import { formatDuration, calculateDelayStatus, formatCurrency } from '../utils/helpers';
import '../styles/ServiceCard.css';

interface ServiceCardProps {
  service: ServiceJob;
  onClick: () => void;
  currentUser: UserAccount | null;
  delayCriteria: DelayCriteria | null;
}

const ServiceCard = React.memo<ServiceCardProps>(({ service, onClick, currentUser, delayCriteria }) => {
  const [activeDuration, setActiveDuration] = useState<number | null>(null);

  // OPTIMIZATION: Use embedded relations if available
  const vehicle = service.vehicle || null;
  const client = service.client || null;

  // CRITICAL: useMemo must always be called, even if data is missing (React Error #310 prevention)
  const delayInfo = useMemo(() => {
    if (!service?.estimated_delivery || service?.status === ServiceStatus.ENTREGUE) {
      return { isDelayed: false };
    }
    // Safely handle null delayCriteria
    if (!delayCriteria) {
      return { isDelayed: false };
    }
    return calculateDelayStatus(service.estimated_delivery, delayCriteria, service.priority);
  }, [service?.estimated_delivery, service?.priority, service?.status, delayCriteria]);

  // ... (keeping rest of internal code identical)
  useEffect(() => {
    const activeTask = service?.tasks?.find(t => t.status === 'in_progress');
    if (!activeTask || !activeTask.started_at) {
      setActiveDuration(null);
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(activeTask.started_at!).getTime();
      const diff = Math.floor((Date.now() - start) / 1000);
      setActiveDuration(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [service?.tasks]);

  const hasReminders = service?.reminders?.some(r => r.status === 'active') ?? false;
  const entryDate = service?.entry_at ? new Date(service.entry_at) : new Date();
  const day = entryDate.getDate();
  const month = entryDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

  if (!service) {
    return null;
  }

  const getStatusStyle = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.ENTREGUE: return 'bg-slate-100 text-slate-500';
      case ServiceStatus.PRONTO: return 'bg-green-100 text-green-700';
      case ServiceStatus.PENDENTE: return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusIconBox = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.ENTREGUE: return 'bg-slate-100 text-slate-400';
      case ServiceStatus.PRONTO: return 'bg-green-100 text-green-600';
      default: return 'bg-blue-50 text-blue-600';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`w-full bg-white p-4 rounded-3xl border transition-all flex justify-between items-center group cursor-pointer relative overflow-hidden
        ${delayInfo.isDelayed ? 'border-red-200 shadow-sm shadow-red-100' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'}
        active:scale-[0.99]`}
    >
      {activeDuration !== null && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 animate-pulse opacity-50" />
      )}

      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${getStatusIconBox(service.status)}`}>
          <span className="text-xl font-black uppercase leading-none">{day}</span>
          <span className="text-[10px] font-bold uppercase leading-none mt-0.5">{month}</span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-slate-800 uppercase line-clamp-1">
              {vehicle?.model || 'Modelo'}
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase whitespace-nowrap">
              {vehicle?.plate || '???-????'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase truncate max-w-[120px]">
              {client?.name || 'Cliente'}
            </span>

            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md whitespace-nowrap ${getStatusStyle(service.status)}`}>
              {service.status}
            </span>

            <div className="flex items-center gap-1.5 ml-1">
              {delayInfo.isDelayed && (
                <span className="text-[9px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded animate-pulse">ATRASADO</span>
              )}
              {hasReminders && (
                <StickyNote size={12} className="text-amber-500 fill-amber-500/20" />
              )}
              {activeDuration !== null && (
                <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                  <Clock size={10} className="animate-spin-slow" />
                  <span className="text-[9px] font-black font-mono">{formatDuration(activeDuration)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-right flex flex-col justify-center items-end pl-2">
        {currentUser?.permissions?.view_financials ? (
          <p className="text-sm font-black text-slate-800 tabular-nums">
            {service.total_value > 0 ? formatCurrency(service.total_value) : 'R$ 0,00'}
          </p>
        ) : (
          <div className="h-5" />
        )}

        <div className="flex items-center gap-1.5 mt-1 text-slate-400">
          {service.tasks.every(t => t.status === 'done') && service.tasks.length > 0 ? (
            <CheckCircle2 size={12} className="text-green-500" />
          ) : null}
          <p className="text-[10px] font-bold uppercase">
            {service.tasks.length} {service.tasks.length === 1 ? 'Etapa' : 'Etapas'}
          </p>
        </div>
      </div>
    </div>
  );
});

export default ServiceCard;