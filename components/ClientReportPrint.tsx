import React from 'react';
import { createPortal } from 'react-dom';
import { Client, ServiceJob, WorkshopSettings, ServiceStatus } from '../types';
import { formatCurrency } from '../utils/helpers';
import { ServiceWithVehicle } from '../hooks/useClientStats';

export interface ReportConfig {
    showValues: boolean;
    showNotes: boolean;
    showTimes: boolean;
    technicalMode: boolean;
}

interface ClientReportPrintProps {
    client: Client;
    services: ServiceWithVehicle[];
    workshop: WorkshopSettings | null;
    config: ReportConfig;
    startDate?: string;
    endDate?: string;
}

const ClientReportPrint: React.FC<ClientReportPrintProps> = ({
    client,
    services,
    workshop,
    config,
    startDate,
    endDate
}) => {
    const totalValue = services.reduce((acc, s) => acc + (s.total_value || 0), 0);

    // Portal to body to ensure it sits at root level for printing
    return createPortal(
        <div id="printable-report-container" className="hidden print:block fixed inset-0 bg-white z-[9999] p-[10mm]">
            <style>
                {`
          @media print {
            @page { size: A4; margin: 10mm; }
            body > *:not(#printable-report-container) {
              display: none !important;
            }
            #printable-report-container {
              display: block !important;
              position: absolute !important;
              top: 0;
              left: 0;
              width: 100%;
              height: auto;
              background: white;
            }
            /* Avoid page break inside vehicle rows */
            .print-row {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            /* Use borders instead of solid backgrounds for ink economy */
            .print-badge {
              background: transparent !important;
              border: 1px solid currentColor !important;
            }
          }
        `}
            </style>

            {/* Header with Logo */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-4">
                    {workshop?.logo_url && (
                        <img src={workshop.logo_url} alt="Logo" className="h-14 w-14 object-contain rounded-lg" />
                    )}
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{workshop?.name || 'Oficina Mecânica'}</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                            {workshop?.address} {workshop?.phone ? `| Tel: ${workshop.phone}` : ''}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-black uppercase text-slate-800">
                        {config.technicalMode ? 'Laudo Técnico' : 'Relatório de Serviços'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            {/* Client Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cliente</p>
                    <p className="text-base font-black text-slate-800 uppercase">{client.name}</p>
                    <div className="flex gap-4 mt-1">
                        <p className="text-xs font-bold text-slate-600 uppercase">{client.phone}</p>
                        {client.cpfCnpj && <p className="text-xs font-bold text-slate-600 uppercase">CPF/CNPJ: {client.cpfCnpj}</p>}
                    </div>
                </div>
                {(startDate || endDate) && (
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Período</p>
                        <p className="text-xs font-bold text-slate-800 uppercase">
                            {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} até {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Hoje'}
                        </p>
                    </div>
                )}
            </div>

            {/* Services Table */}
            <table className="w-full text-left border-collapse mb-8">
                <thead>
                    <tr className="border-b-2 border-slate-800">
                        <th className="py-2 text-[10px] font-black uppercase text-slate-500 w-24">Data</th>
                        <th className="py-2 text-[10px] font-black uppercase text-slate-500 w-24">OS #</th>
                        <th className="py-2 text-[10px] font-black uppercase text-slate-500">Veículo</th>
                        <th className="py-2 text-[10px] font-black uppercase text-slate-500 w-32">Status</th>
                        {config.showTimes && <th className="py-2 text-[10px] font-black uppercase text-slate-500 text-right w-24">Duração</th>}
                        {config.showValues && <th className="py-2 text-[10px] font-black uppercase text-slate-500 text-right w-28">Valor</th>}
                    </tr>
                </thead>
                <tbody>
                    {services.map(s => (
                        <React.Fragment key={s.id}>
                            <tr className="border-b border-slate-200 print-row">
                                <td className="py-3 text-xs font-bold text-slate-700">{new Date(s.entry_at).toLocaleDateString('pt-BR')}</td>
                                <td className="py-3 text-xs font-mono font-bold text-slate-500">#{s.id.substring(0, 8).toUpperCase()}</td>
                                <td className="py-3">
                                    <div className="text-xs font-black text-slate-800 uppercase">{s.vehicle_plate}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">{s.vehicle_model}</div>
                                </td>
                                <td className="py-3">
                                    <span className={`print-badge text-[9px] font-black uppercase px-2 py-0.5 rounded ${s.status === ServiceStatus.ENTREGUE ? 'text-slate-500 border-slate-400' :
                                            s.status === ServiceStatus.PRONTO ? 'text-green-600 border-green-500' :
                                                s.status === ServiceStatus.PENDENTE ? 'text-amber-600 border-amber-500' :
                                                    s.status === ServiceStatus.EM_ANDAMENTO ? 'text-blue-600 border-blue-500' :
                                                        'text-slate-600 border-slate-400'
                                        }`}>
                                        {s.status}
                                    </span>
                                </td>
                                {config.showTimes && (
                                    <td className="py-3 text-xs font-bold text-slate-600 text-right">
                                        --:--
                                    </td>
                                )}
                                {config.showValues && (
                                    <td className="py-3 text-xs font-black text-slate-800 text-right">
                                        {formatCurrency(s.total_value)}
                                    </td>
                                )}
                            </tr>
                            {config.showNotes && s.tasks && s.tasks.some(t => t.relato) && (
                                <tr className="border-b border-slate-100 bg-slate-50/50 print-row">
                                    <td colSpan={6} className="py-2 px-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Diagnóstico / Observações:</p>
                                        <div className="space-y-1">
                                            {s.tasks.filter(t => t.relato).map(t => (
                                                <div key={t.id} className="text-[10px] text-slate-600 leading-tight">
                                                    <span className="font-bold uppercase">{t.title}:</span> {t.relato}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            {/* Footer / Totals */}
            {config.showValues && (
                <div className="flex justify-end border-t-2 border-slate-800 pt-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Valor Total</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalValue)}</p>
                    </div>
                </div>
            )}

        </div>,
        document.body
    );
};

export default ClientReportPrint;
