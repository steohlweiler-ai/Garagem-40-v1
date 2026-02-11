import React from 'react';
import { ServiceStatus } from '../types';
import { STATUS_ICONS, STATUS_COLORS } from '../utils/constants';
import { AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: ServiceStatus;
  size?: 'sm' | 'md';
  delayed?: boolean;
  minimal?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', delayed = false, minimal = false }) => {
  // Se estiver atrasado e não estiver entregue, força a cor vermelha suave (Rose)
  const isActuallyDelayed = delayed && status !== ServiceStatus.ENTREGUE;

  const colorClass = isActuallyDelayed
    ? 'bg-rose-50 text-rose-600 border-rose-200'
    : (STATUS_COLORS[status] || 'bg-slate-100 text-slate-500 border-slate-200');

  // Ajuste de escala para ser mais compacto visualmente
  const paddingClass = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textClass = size === 'sm' ? 'text-[8px]' : 'text-[9px]';

  if (minimal && isActuallyDelayed) {
    return (
      <div className={`flex items-center gap-1.5 font-black uppercase tracking-widest ${textClass} text-rose-600 animate-pulse`}>
        <AlertTriangle size={10} /> ATRASADO
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 rounded-full font-black uppercase tracking-wider border transition-all duration-300 shadow-sm animate-in fade-in zoom-in-95 ${colorClass} ${paddingClass} ${textClass}`}
    >
      {isActuallyDelayed ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        React.cloneElement(STATUS_ICONS[status] as React.ReactElement<any>, { className: 'w-3 h-3' })
      )}
      {isActuallyDelayed ? 'Atrasado' : status}
    </div>
  );
};

export default StatusBadge;