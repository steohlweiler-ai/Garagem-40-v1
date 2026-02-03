import React, { useState, useEffect, useMemo } from 'react';
import { ServiceJob, Vehicle, Client, ServiceStatus, UserAccount, DelayCriteria } from '../types';
import { Clock, User, ChevronRight, Hash, StickyNote, Calendar, CheckCircle2 } from 'lucide-react';
import { formatDuration, calculateDelayStatus, formatCurrency } from '../utils/helpers';
import StatusBadge from './StatusBadge';
import '../styles/ServiceCard.css';

interface ServiceCardProps {
  service: ServiceJob;
  onClick: () => void;
  currentUser: UserAccount | null;
  delayCriteria: DelayCriteria | null;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onClick, currentUser, delayCriteria }) => {
  const [activeDuration, setActiveDuration] = useState<number | null>(null);

  // OPTIMIZATION: Use embedded relations if available
  const vehicle = service.vehicle || null;
  const client = service.client || null;

  const delayInfo = useMemo(() => {
    if (!service.estimated_delivery || service.status === ServiceStatus.ENTREGUE) return { isDelayed: false };
    return calculateDelayStatus(service.estimated_delivery, delayCriteria, service.priority);
  }, [service.estimated_delivery, service.priority, delayCriteria, service.status]);

  useEffect(() => {
    const activeTask = service.tasks?.find(t => t.status === 'in_progress');
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
  }, [service.tasks]);

  const hasReminders = service.reminders?.some(r => r.status === 'active');

  return (
    <div
      onClick={onClick}
      className={`svc-card group ${delayInfo.isDelayed ? 'svc-border-delayed' : 'svc-border-normal'}`}
    >
      {/* Barra de progresso para tarefa ativa */}
      {activeDuration !== null && (
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 animate-pulse shadow-lg shadow-purple-500/50" />
      )}

      {/* Indicador de delay no canto superior esquerdo */}
      {delayInfo.isDelayed && (
        <div className="absolute top-4 left-4 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
      )}

      {/* Cabeçalho do Card: Placa e Status */}
      <div className="svc-header">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="svc-plate">
              {vehicle?.plate || '???-????'}
            </h3>
            {hasReminders && (
              <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                <StickyNote size={14} strokeWidth={3} />
              </div>
            )}
          </div>
          <p className="svc-meta-text mt-2.5">
            {vehicle?.brand || 'Marca'} <span className="text-slate-200 mx-1.5">•</span> {vehicle?.model || 'Modelo'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={service.status} size="sm" delayed={delayInfo.isDelayed} />
          {activeDuration !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-purple-50 to-blue-50 text-purple-600 rounded-xl border border-purple-200 shadow-sm">
              <Clock size={12} className="animate-pulse" strokeWidth={2.5} />
              <span className="text-[10px] font-black font-mono">{formatDuration(activeDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info Cliente e Data */}
      <div className="space-y-3 mt-5">
        <div className="svc-info-row">
          <div className="svc-icon-box">
            <User className="svc-meta-icon" />
          </div>
          <span className="svc-client-text">{client?.name || 'Cliente'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="svc-info-row">
            <div className="svc-icon-box">
              <Calendar className="svc-meta-icon" />
            </div>
            <span className="svc-meta-text" style={{ fontSize: '10px' }}>
              {new Date(service.entry_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          {currentUser?.permissions?.view_financials && (
            <div className="text-xs font-black text-green-600 font-mono bg-green-50 px-3 py-1.5 rounded-xl border border-green-100/50">
              {service.total_value > 0 ? formatCurrency(service.total_value) : 'R$ —'}
            </div>
          )}
        </div>
      </div>

      {/* Rodapé: Etapas */}
      <div className="mt-6 pt-5 border-t border-slate-50 flex justify-between items-center">
        <div className="svc-badge-group">
          <div className="svc-badge-count svc-badge-gray">
            <Hash className="svc-meta-icon" />
            <span>
              {service.tasks.length} {service.tasks.length === 1 ? 'Etapa' : 'Etapas'}
            </span>
          </div>
          <div className="svc-badge-count svc-badge-green">
            <CheckCircle2 className="svc-meta-icon text-green-500" style={{ opacity: 1 }} />
            <span>
              {service.tasks.filter(t => t.status === 'done').length} OK
            </span>
          </div>
        </div>
        <div className="svc-action-btn">
          <ChevronRight size={20} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;