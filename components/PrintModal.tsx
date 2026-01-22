
import React, { useState, useMemo, useEffect } from 'react';
import { X, Printer, Check, Settings2, Scissors, Copy, QrCode } from 'lucide-react';
import { ServiceJob, Vehicle, Client } from '../types';
import { dataProvider } from '../services/dataProvider';
import { formatCurrency } from '../utils/helpers';

interface PrintModalProps {
  service: ServiceJob;
  vehicle: Vehicle | null;
  client: Client | null;
  onClose: () => void;
}

const PrintModal: React.FC<PrintModalProps> = ({ service, vehicle, client, onClose }) => {
  const [activeTab, setActiveTab] = useState<'options' | 'preview'>('preview');
  const [options, setOptions] = useState({
    checklist: true,
    qrCode: true,
    duplicate: true
  });

  const [workshop, setWorkshop] = useState<any>({ name: 'Carregando...', address: '', phone: '', cnpj: '' });

  useEffect(() => {
    const load = async () => {
      const data = await dataProvider.getWorkshopSettings();
      if (data) setWorkshop(data);
    };
    load();
  }, []);

  // Heuristic logic to decide if content fits in half a page (approx 140mm)
  const isLargeOS = useMemo(() => {
    const baseHeight = 70;
    const itemsHeight = service.tasks.reduce((acc, task) => {
      let h = 12; // Base item height
      if (task.relato) h += 8;
      if (task.diagnostico) h += 8;
      return acc + h;
    }, 0);
    return (baseHeight + itemsHeight) > 140;
  }, [service.tasks]);

  const generateHTML = () => {
    const leafStyle = isLargeOS
      ? 'height: auto; min-height: 260mm; page-break-after: always; padding-top: 15mm;'
      : 'height: 140mm; overflow: hidden; margin-bottom: 5mm;';

    const renderLeaf = (via: string) => `
      <div class="os-leaf" style="${leafStyle}">
        <div class="header">
          <div class="brand">
            <div class="logo">P</div>
            <div>
              <div class="brand-name">${workshop.name}</div>
              <div class="brand-sub">${workshop.address} | Tel: ${workshop.phone}</div>
            </div>
          </div>
          <div class="os-info">
            <div class="via-tag">${via}</div>
            <div class="os-title">Ordem de Serviço</div>
            <div class="os-number">#${service.id.substring(0, 8).toUpperCase()}</div>
            <div class="date-tag">Entrada: ${new Date(service.entry_at).toLocaleDateString('pt-BR')} ${new Date(service.entry_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            ${service.estimated_delivery ? `<div class="date-tag">Previsão: ${new Date(service.estimated_delivery).toLocaleDateString('pt-BR')} ${new Date(service.estimated_delivery).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
          </div>
        </div>

        <div class="grid-3">
          <div class="field-box">
            <div class="label">Placa</div>
            <div class="value plate">${vehicle?.plate || '---'}</div>
          </div>
          <div class="field-box">
            <div class="label">Veículo</div>
            <div class="value">${vehicle?.brand} ${vehicle?.model}</div>
          </div>
          <div class="field-box">
            <div class="label">Cliente</div>
            <div class="value">${client?.name || 'Consumidor'}</div>
          </div>
          <div class="field-box">
            <div class="label">Responsável Abertura</div>
            <div class="value">${service.created_by_name || 'Consultor Técnico'}</div>
          </div>
        </div>

        <div class="content-flex">
          <div class="section-label">Execução de Etapas</div>
          <div class="tasks-table">
            <div class="task-header">
               <span>Item / Serviço</span>
            </div>
            ${service.tasks.map(task => `
              <div class="task-row">
                <div class="task-main">
                  <div class="task-title">● ${task.title} ${task.type ? `<span class="task-type">(${task.type})</span>` : ''}</div>
                  ${task.relato ? `<div class="task-note"><strong>Relato:</strong> ${task.relato}</div>` : ''}
                  ${task.diagnostico ? `<div class="task-note"><strong>Diag:</strong> ${task.diagnostico}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="summary-box">
          <div class="summary-line"><span>Total de Itens:</span> <strong>${service.tasks.length}</strong></div>
          <div class="summary-line"><span>VALOR TOTAL DA OS:</span> <strong style="font-size: 11pt; color: #1e293b">${formatCurrency(service.total_value)}</strong></div>
        </div>

        <div class="footer">
          <div class="signatures">
            <div class="sig-box">Responsável Técnico</div>
            <div class="sig-box">Assinatura do Cliente</div>
          </div>
          ${options.qrCode ? `
            <div class="qr-section">
              <div class="qr-text">Status<br>Online</div>
              <div class="qr-placeholder">QR</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Imprimir OS - ${vehicle?.plate}</title>
        <style>
          @page { 
            size: A4 portrait; 
            margin: 15mm 10mm; 
          }
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #fff; color: #1e293b; }
          .os-leaf {
            border: 1px solid #e2e8f0; padding: 10mm 12mm;
            display: flex; flex-direction: column; box-sizing: border-box; position: relative;
            page-break-inside: avoid;
          }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 4mm; margin-bottom: 6mm; }
          .brand { display: flex; align-items: center; gap: 4mm; }
          .logo { background: #1e293b; color: #fff; width: 9mm; height: 9mm; border-radius: 2mm; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12pt; }
          .brand-name { font-size: 13pt; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; line-height: 1; }
          .brand-sub { font-size: 6.5pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 1.5mm; }
          .os-info { text-align: right; }
          .via-tag { font-size: 6pt; background: #f1f5f9; padding: 1mm 2mm; border-radius: 1.5mm; font-weight: 900; color: #64748b; display: inline-block; text-transform: uppercase; }
          .os-title { font-size: 10pt; font-weight: 900; text-transform: uppercase; margin-top: 2mm; }
          .os-number { font-family: monospace; font-size: 11pt; font-weight: 900; color: #475569; }
          .date-tag { font-size: 6.5pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
          .grid-3 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-bottom: 6mm; }
          .field-box { background: #f8fafc; padding: 2mm 3mm; border: 1px solid #f1f5f9; border-radius: 2mm; }
          .label { font-size: 6.5pt; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5mm; }
          .value { font-size: 8.5pt; font-weight: 800; color: #334155; }
          .value.plate { font-family: monospace; font-size: 11pt; }
          .section-label { font-size: 7.5pt; font-weight: 900; text-transform: uppercase; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 1mm; margin-bottom: 3mm; color: #64748b; margin-top: 4mm; }
          .tasks-table { display: flex; flex-direction: column; gap: 2mm; }
          .task-header { display: flex; justify-content: space-between; font-size: 7pt; font-weight: 900; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #f1f5f9; padding-bottom: 1mm; }
          .task-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 2mm 0; page-break-inside: avoid; }
          .task-title { font-size: 9pt; font-weight: 900; text-transform: uppercase; }
          .task-type { font-size: 7pt; color: #94a3b8; margin-left: 2mm; }
          .task-note { font-size: 7.5pt; color: #64748b; margin-top: 1.5mm; line-height: 1.4; }
          .task-note strong { color: #475569; }
          .summary-box { border-top: 2px solid #1e293b; padding-top: 3mm; margin-top: 8mm; display: flex; flex-direction: column; align-items: flex-end; }
          .summary-line { font-size: 9pt; display: flex; gap: 5mm; align-items: baseline; margin-bottom: 1mm; }
          .footer { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 6mm; border-top: 1px solid #f1f5f9; }
          .signatures { display: flex; gap: 12mm; }
          .sig-box { border-bottom: 1px solid #cbd5e1; width: 45mm; padding-bottom: 2mm; font-size: 6pt; font-weight: 800; color: #94a3b8; text-transform: uppercase; text-align: center; }
          .qr-section { display: flex; align-items: center; gap: 3mm; }
          .qr-text { font-size: 6pt; font-weight: 900; color: #94a3b8; text-transform: uppercase; text-align: right; }
          .qr-placeholder { border: 1.5px solid #e2e8f0; width: 8mm; height: 8mm; display: flex; align-items: center; justify-content: center; font-size: 5pt; font-weight: 900; color: #cbd5e1; }
          .tear-line { border-top: 2px dashed #cbd5e1; margin: 8mm 0; text-align: center; font-size: 8pt; color: #cbd5e1; text-transform: uppercase; letter-spacing: 5mm; page-break-after: avoid; }
        </style>
      </head>
      <body>
        ${renderLeaf("Via Oficina")}
        ${options.duplicate ? `
          ${!isLargeOS ? '<div class="tear-line">----------- CORTE AQUI -----------</div>' : ''} 
          ${renderLeaf("Via Cliente")}
        ` : ''}
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(generateHTML());
      printWindow.document.close();
    } else {
      alert("Por favor, permita pop-ups para imprimir a Ordem de Serviço.");
    }
  };

  const OSPreviewLeaf = ({ via }: { via: string }) => (
    <div className={`bg-white border p-6 rounded-lg shadow-sm text-slate-800 flex flex-col ${!isLargeOS ? 'h-[500px]' : 'min-h-[700px]'} transition-all overflow-hidden relative mb-4`}>
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-4">
        <div className="flex gap-2 items-center">
          <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white text-[10px] font-black italic">P</div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-tight leading-none">{workshop.name}</h1>
            <p className="text-[6px] font-bold text-slate-400 uppercase mt-0.5">{workshop.address}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[6px] font-black bg-slate-100 px-1 py-0.5 rounded text-slate-500 uppercase inline-block">{via}</div>
          <h2 className="text-[8px] font-black uppercase block">Ordem de Serviço</h2>
          <p className="text-[9px] font-mono font-bold text-slate-600 leading-none">#{service.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-slate-50 p-1 rounded border border-slate-100"><p className="text-[5px] font-black text-slate-400 uppercase">Placa</p><p className="text-[10px] font-black font-mono">{vehicle?.plate}</p></div>
        <div className="bg-slate-50 p-1 rounded border border-slate-100"><p className="text-[5px] font-black text-slate-400 uppercase">Veículo</p><p className="text-[8px] font-bold truncate">{vehicle?.brand} {vehicle?.model}</p></div>
        <div className="bg-slate-50 p-1 rounded border border-slate-100"><p className="text-[5px] font-black text-slate-400 uppercase">Cliente</p><p className="text-[8px] font-bold truncate">{client?.name}</p></div>
        <div className="bg-slate-50 p-1 rounded border border-slate-100"><p className="text-[5px] font-black text-slate-400 uppercase">Abertura</p><p className="text-[8px] font-bold truncate">{service.created_by_name || 'Consultor'}</p></div>
      </div>

      <div className="flex-1 space-y-2">
        <h3 className="text-[7px] font-black text-slate-400 uppercase border-b pb-0.5">Execução de Etapas</h3>
        {service.tasks.map(task => (
          <div key={task.id} className="border-b border-slate-50 pb-1">
            <div className="flex justify-between items-baseline">
              <p className="text-[9px] font-black uppercase tracking-tight">{task.title} <span className="text-[6px] text-slate-400">({task.type})</span></p>
            </div>
            {task.relato && <p className="text-[7px] text-slate-500 leading-tight"><strong>R:</strong> {task.relato}</p>}
            {task.diagnostico && <p className="text-[7px] text-slate-600 leading-tight"><strong>D:</strong> {task.diagnostico}</p>}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-2 border-t flex flex-col items-end gap-1">
        <div className="flex items-center gap-4">
          <span className="text-[7px] font-black text-slate-400 uppercase">Total Itens: {service.tasks.length}</span>
          <span className="text-[9px] font-black uppercase text-slate-900">Total OS: {formatCurrency(service.total_value)}</span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t flex justify-between items-end">
        <div className="flex gap-4">
          <div className="w-16 border-b border-slate-200 pb-0.5"><p className="text-[4px] font-bold text-slate-400 uppercase">Mecânico</p></div>
          <div className="w-16 border-b border-slate-200 pb-0.5"><p className="text-[4px] font-bold text-slate-400 uppercase">Cliente</p></div>
        </div>
        <QrCode size={12} className="text-slate-300" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row overflow-hidden">

      <div className={`w-full md:w-[320px] bg-white border-r flex flex-col shadow-xl z-20 ${activeTab === 'preview' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 text-white rounded-xl shadow-lg shadow-green-100"><Settings2 size={20} /></div>
            <h3 className="text-base font-black uppercase tracking-tight text-slate-800">Ajustar OS</h3>
          </div>
          <button onClick={onClose} className="p-4 bg-slate-100 rounded-full text-slate-400 md:hidden touch-target transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {[
            { id: 'checklist', label: 'Checklist Segurança', icon: <Check size={14} /> },
            { id: 'qrCode', label: 'QR Code Online', icon: <QrCode size={14} /> },
            { id: 'duplicate', label: 'Cópia Extra (Duplicar)', icon: <Copy size={14} /> },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setOptions(prev => ({ ...prev, [opt.id as keyof typeof options]: !prev[opt.id as keyof typeof options] }))}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${options[opt.id as keyof typeof options]
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'bg-slate-50 border-transparent text-slate-400 opacity-70'
                }`}
            >
              <div className={`p-2 rounded-lg ${options[opt.id as keyof typeof options] ? 'bg-green-600 text-white' : 'bg-slate-200'}`}>
                {opt.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest flex-1 text-left">{opt.label}</span>
              {options[opt.id as keyof typeof options] && <Check size={16} strokeWidth={4} />}
            </button>
          ))}

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-4">
            <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest mb-1 flex items-center gap-2">
              <Settings2 size={12} /> Layout Automático
            </p>
            <p className="text-[10px] text-blue-800 font-medium leading-tight">
              O sistema detectou um volume de {service.tasks.length} itens.
              {isLargeOS ? ' Layout de via única por página ativado automaticamente para garantir legibilidade.' : ' Mantendo layout de duas vias por folha.'}
            </p>
          </div>
        </div>

        <div className="p-6 border-t bg-slate-50 md:hidden">
          <button onClick={() => setActiveTab('preview')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">
            Ver Visualização
          </button>
        </div>
      </div>

      <div className={`flex-1 bg-slate-100 overflow-y-auto p-4 md:p-12 flex flex-col items-center ${activeTab === 'options' ? 'hidden md:flex' : 'flex'}`}>
        <div className="w-full max-w-[210mm] flex md:hidden items-center justify-between mb-6">
          <button onClick={() => setActiveTab('options')} className="p-3 bg-white rounded-xl shadow-sm text-slate-500 font-bold text-xs uppercase flex items-center gap-2">
            <Settings2 size={16} /> Ajustar
          </button>
          <button onClick={onClose} className="p-4 bg-white rounded-xl shadow-sm text-slate-400 touch-target"><X size={20} /></button>
        </div>

        <div className="bg-white w-full max-w-[400px] md:max-w-[210mm] shadow-2xl p-4 md:p-12 space-y-4 rounded-xl">
          <div className="flex items-center justify-between border-b pb-4 mb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
            <span>Preview da OS (Escala 1:1)</span>
            <div className="flex items-center gap-2">
              <Printer size={14} />
            </div>
          </div>

          <OSPreviewLeaf via="Via Oficina" />

          {options.duplicate && (
            <>
              {!isLargeOS ? (
                <div className="py-2 flex items-center justify-center gap-3 border-y border-dashed border-slate-200 text-slate-200 text-[8px] font-black uppercase tracking-[3px] mb-4">
                  <Scissors size={10} /> Linha de Corte
                </div>
              ) : (
                <div className="py-6 flex items-center justify-center gap-3 text-slate-300 text-[8px] font-black uppercase tracking-[3px] mb-4">
                  --- Quebra de Página Automática ---
                </div>
              )}
              <OSPreviewLeaf via="Via Cliente" />
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/90 backdrop-blur-md border-t flex gap-3 z-30">
        <button onClick={onClose} className="hidden md:block px-8 py-4 bg-slate-100 rounded-2xl text-slate-400 font-black text-xs uppercase hover:bg-slate-200 transition-all">Sair</button>
        <button
          onClick={handlePrint}
          className="flex-1 py-5 bg-green-600 text-white rounded-2xl shadow-2xl shadow-green-100 font-black text-sm uppercase flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-green-700"
        >
          <Printer size={22} /> Gerar Impressão (A4)
        </button>
      </div>

    </div>
  );
};

export default PrintModal;
