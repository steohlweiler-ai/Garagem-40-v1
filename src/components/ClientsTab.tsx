
import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, Plus, ChevronRight, User, Phone, MapPin,
  Tag, Info, Car, X, Edit2, CheckCircle2, Calendar, FileText,
  AlertCircle, Printer
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { Client, Vehicle, ServiceJob, ServiceStatus } from '../types';
import VoiceInput from './VoiceInput';
import { formatCurrency } from '../utils/helpers';
import ClientDetails from './ClientDetails';

interface ClientsTabProps {
  onSelectService: (serviceId: string) => void;
}

const ClientsTab: React.FC<ClientsTabProps> = ({ onSelectService }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para o formulário
  const [formData, setFormData] = useState({ name: '', phone: '', cpfCnpj: '', address: '', notes: '' });
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<Vehicle | null>(null);

  // States for Report
  const [showReportConfig, setShowReportConfig] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;
    const timeoutId = setTimeout(() => abortController.abort(), 10000);

    const load = async () => {
      setIsLoading(true);
      try {
        const [cData, vData] = await Promise.all([
          dataProvider.getClients(signal),
          dataProvider.getVehicles(signal)
        ]);

        setClients(Array.isArray(cData) ? cData : []);
        setVehicles(Array.isArray(vData) ? vData : []);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('[ClientsTab] Fetch aborted natively');
          return;
        }
        console.error('Error loading clients:', err);
        setClients([]);
        setVehicles([]);
      } finally {
        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    };
    load();

    return () => {
      abortController.abort(); // Explicit abort on unmount
      clearTimeout(timeoutId);
    };
  }, []);

  const filteredClients = useMemo(() => {
    // Definitive Defensive Check
    if (!clients || !Array.isArray(clients)) return [];

    const q = debouncedSearch.toLowerCase();
    return clients.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.cpfCnpj || '').includes(q)
    );
  }, [debouncedSearch, clients]);

  // Centralized modal state reset - prevents stale data on reopen
  const resetModalState = () => {
    setIsAdding(false);
    setIsEditing(false);
    setSelectedClient(null);
    setFormData({ name: '', phone: '', cpfCnpj: '', address: '', notes: '' });
    setShowReportConfig(false);
    setReportStartDate('');
    setReportEndDate('');
    console.log('[ClientsTab] Modal state reset');
  };

  const handleOpenClient = (client: Client) => {
    // Defensive: Guard against null/invalid client
    if (!client?.id) {
      console.error('[ClientsTab] Invalid client object passed to handleOpenClient');
      return;
    }

    console.log('[ClientsTab] Opening client:', client.name);
    setSelectedClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      cpfCnpj: client.cpfCnpj || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setIsEditing(false);
    setShowReportConfig(false);
    setReportStartDate('');
    setReportEndDate('');
  };

  const handleSaveClient = async () => {
    // Defensive: Validate form data
    if (!formData.name || !formData.phone) {
      console.warn('[ClientsTab] Save attempted with incomplete form data');
      return;
    }

    try {
      console.log('[ClientsTab] Saving client:', formData.name);

      if (isAdding) {
        await dataProvider.addClient({ ...formData, organization_id: 'org_1' });
      } else if (selectedClient) {
        await dataProvider.updateClient(selectedClient.id, formData);
        setSelectedClient({ ...selectedClient, ...formData });
      }

      const data = await dataProvider.getClients();
      setClients(data);

      // Reset all modal state after successful save
      resetModalState();
      console.log('[ClientsTab] Client saved successfully');
    } catch (error) {
      console.error('[ClientsTab] Error saving client:', error);
    }
  };

  const [vehicleServices, setVehicleServices] = useState<ServiceJob[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (selectedVehicleHistory) {
        const data = await dataProvider.getServicesByVehicle(selectedVehicleHistory.id);
        setVehicleServices(data);
      }
    };
    loadHistory();
  }, [selectedVehicleHistory]);

  const handleGenerateReport = async () => {
    if (!selectedClient) return;
    setIsGeneratingReport(true);

    try {
      const workshop = await dataProvider.getWorkshopSettings();
      const clientVehicles = vehicles.filter(v => v.client_id === selectedClient.id);

      let allServices: (ServiceJob & { vehicle_plate: string; vehicle_model: string })[] = [];

      // Fetch services for all vehicles
      for (const v of clientVehicles) {
        const services = await dataProvider.getServicesByVehicle(v.id);
        const mapped = services.map(s => ({ ...s, vehicle_plate: v.plate, vehicle_model: `${v.brand} ${v.model}` }));
        allServices = [...allServices, ...mapped];
      }

      // Filter by Status (DONE/DELIVERED) and Date Range
      const filtered = allServices.filter(s => {
        const isCompleted = s.status === ServiceStatus.PRONTO || s.status === ServiceStatus.ENTREGUE;
        if (!isCompleted) return false;

        const sDate = new Date(s.entry_at).getTime();
        const start = reportStartDate ? new Date(reportStartDate).setHours(0, 0, 0, 0) : 0;
        const end = reportEndDate ? new Date(reportEndDate).setHours(23, 59, 59, 999) : Infinity;

        return sDate >= start && sDate <= end;
      });

      // Sort by Date (descending)
      filtered.sort((a, b) => new Date(b.entry_at).getTime() - new Date(a.entry_at).getTime());

      const totalValue = filtered.reduce((acc, curr) => acc + (curr.total_value || 0), 0);

      // GENERATE HTML
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Relatório de Serviços - ${selectedClient.name}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Inter', sans-serif; color: #1e293b; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 5mm; margin-bottom: 5mm; }
            .title { font-size: 14pt; font-weight: 900; text-transform: uppercase; }
            .subtitle { font-size: 9pt; color: #64748b; margin-top: 2px; }
            .client-box { background: #f8fafc; padding: 4mm; border-radius: 2mm; margin-bottom: 5mm; }
            .table { width: 100%; border-collapse: collapse; font-size: 9pt; }
            .table th { text-align: left; border-bottom: 1px solid #000; padding: 2mm 0; text-transform: uppercase; font-size: 8pt; color: #64748b; }
            .table td { border-bottom: 1px solid #e2e8f0; padding: 3mm 0; vertical-align: top; }
            .total-box { margin-top: 10mm; text-align: right; font-size: 12pt; font-weight: 900; border-top: 2px solid #000; padding-top: 5mm; }
            .status-badge { font-size: 7pt; padding: 1px 4px; border-radius: 4px; border: 1px solid #cbd5e1; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${workshop?.name || 'Oficina Mecânica'}</div>
              <div class="subtitle">${workshop?.address || ''} | ${workshop?.phone || ''}</div>
            </div>
            <div style="text-align: right;">
              <div class="title">Relatório de Serviços</div>
              <div class="subtitle">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          <div class="client-box">
             <div style="font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: 900;">Cliente</div>
             <div style="font-size: 11pt; font-weight: 800;">${selectedClient.name}</div>
             <div style="font-size: 9pt; margin-top: 2px;">${selectedClient.phone || ''}</div>
             ${reportStartDate ? `<div style="margin-top: 5px; font-size: 8pt;">Período: ${new Date(reportStartDate).toLocaleDateString('pt-BR')} até ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('pt-BR') : 'Hoje'}</div>` : ''}
          </div>

          <table class="table">
            <thead>
              <tr>
                <th style="width: 15%">Data</th>
                <th style="width: 15%">OS #</th>
                <th style="width: 30%">Veículo</th>
                <th style="width: 25%">Status</th>
                <th style="width: 15%; text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => `
                <tr>
                  <td>${new Date(s.entry_at).toLocaleDateString('pt-BR')}</td>
                  <td style="font-family: monospace;">${s.id.substring(0, 8).toUpperCase()}</td>
                  <td>
                    <div style="font-weight: 800;">${s.vehicle_plate}</div>
                    <div style="font-size: 7pt; color: #64748b; text-transform: uppercase;">${s.vehicle_model}</div>
                  </td>
                  <td><span class="status-badge">${s.status}</span></td>
                  <td style="text-align: right; font-weight: 700;">${formatCurrency(s.total_value)}</td>
                </tr>
              `).join('')}
              ${filtered.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 10mm; color: #94a3b8;">Nenhum serviço encontrado neste período.</td></tr>' : ''}
            </tbody>
          </table>

          <div class="total-box">
            Total Geral: ${formatCurrency(totalValue)}
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=900,height=800');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
      } else {
        alert('Permita pop-ups para imprimir.');
      }

    } catch (e) {
      console.error(e);
      alert('Erro ao gerar relatório.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">

      {/* Busca e Ação */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <Users size={22} />
            </div>
            <h2 className="text-base font-black uppercase tracking-tight">Gestão de Clientes</h2>
          </div>
          <button
            onClick={() => {
              console.log('[ClientsTab] Opening new client modal');
              resetModalState();
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
          >
            <Plus size={14} /> Novo Cliente
          </button>
        </div>

        <div className="relative group">
          <VoiceInput
            multiline={false}
            value={search}
            onTranscript={setSearch}
            placeholder="Nome, CPF ou WhatsApp..."
            className="!pl-12 !py-4 !bg-slate-50 !border-slate-100 !text-sm !font-bold"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>
      </div>

      {/* Lista de Clientes com Feedback de Scroll */}
      <div className="relative group">
        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-1 pb-12">
          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-green-500 rounded-full animate-spin mx-auto" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando clientes...</p>
            </div>
          ) : filteredClients.length > 0 ? (
            filteredClients.map(client => {
              const clientVehicles = vehicles.filter(v => v.client_id === client.id);
              const vehiclesCount = clientVehicles.length;
              return (
                <button
                  key={client.id}
                  onClick={() => handleOpenClient(client)}
                  className="w-full bg-white p-5 rounded-[2rem] border-2 border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all group"
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all shadow-inner">
                      <User size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase text-slate-800 tracking-tight">{client.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{client.phone || 'Sem telefone'}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Tag size={10} className="text-slate-300" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{vehiclesCount} {vehiclesCount === 1 ? 'Veículo' : 'Veículos'}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-200 group-hover:text-green-600 transition-colors" />
                </button>
              );
            })) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Users size={32} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum cliente encontrado</p>
              <button onClick={() => { setIsAdding(true); setFormData({ name: '', phone: '', cpfCnpj: '', address: '', notes: '' }); }} className="text-[9px] font-black uppercase tracking-widest text-green-600 hover:underline">
                Adicionar o primeiro cliente
              </button>
            </div>
          )}
        </div>
        {filteredClients.length > 5 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f8fafc] to-transparent pointer-events-none opacity-80 group-hover:opacity-0 transition-opacity" />
        )}
      </div>

      {/* Modal de Edição / Adição */}
      {(isAdding || (selectedClient && isEditing)) && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 max-h-[95vh] overflow-y-auto no-scrollbar font-['Arial']">

            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black uppercase text-slate-800 leading-none">
                  {isAdding ? 'Novo Cliente' : selectedClient?.name}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                  {isAdding ? 'Preencha os dados cadastrais' : 'Editar Cadastro'}
                </p>
              </div>
              <button onClick={resetModalState} className="p-4 bg-slate-100 rounded-full text-slate-400 active:scale-90 touch-target"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nome Completo *</label>
                  <VoiceInput multiline={false} value={formData.name} onTranscript={v => setFormData({ ...formData, name: v })} placeholder="Nome do cliente" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">WhatsApp / Telefone *</label>
                    <VoiceInput multiline={false} value={formData.phone} onTranscript={v => setFormData({ ...formData, phone: v })} placeholder="(00) 00000-0000" normalizeAs="phone" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CPF / CNPJ</label>
                    <input type="text" value={formData.cpfCnpj} onChange={e => setFormData({ ...formData, cpfCnpj: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-xs font-bold outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Endereço Completo</label>
                  <VoiceInput multiline={false} value={formData.address} onTranscript={v => setFormData({ ...formData, address: v })} placeholder="Rua, Número, Bairro, Cidade..." />
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t">
                <button onClick={resetModalState} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-widest">Cancelar</button>
                <button onClick={handleSaveClient} className="flex-[2] py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-green-100">Salvar Cadastro</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Detalhes */}
      {selectedClient && !isEditing && !isAdding && (
        <ClientDetails
          client={selectedClient}
          vehicles={vehicles}
          onClose={() => {
            console.log('[ClientsTab] Closing client details');
            setSelectedClient(null);
          }}
          onEdit={() => setIsEditing(true)}
          onSelectService={onSelectService}
        />
      )}
    </div>
  );
};

export default ClientsTab;
