
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
    const load = async () => {
      setIsLoading(true);
      try {
        const [cData, vData] = await Promise.all([
          dataProvider.getClients(),
          dataProvider.getVehicles()
        ]);
        // Defensive: Ensure we always set an array, even if provider returns null/undefined
        setClients(Array.isArray(cData) ? cData : []);
        setVehicles(Array.isArray(vData) ? vData : []);
      } catch (err) {
        console.error('Error loading clients:', err);
        setClients([]);
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
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

  const handleOpenClient = (client: Client) => {
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
    if (!formData.name || !formData.phone) return;

    if (isAdding) {
      await dataProvider.addClient({ ...formData, organization_id: 'org_1' });
      setIsAdding(false);
    } else if (selectedClient) {
      await dataProvider.updateClient(selectedClient.id, formData);
      setSelectedClient({ ...selectedClient, ...formData });
      setIsEditing(false);
    }
    const data = await dataProvider.getClients();
    setClients(data);
    setFormData({ name: '', phone: '', cpfCnpj: '', address: '', notes: '' });
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
            onClick={() => { setIsAdding(true); setFormData({ name: '', phone: '', cpfCnpj: '', address: '', notes: '' }); }}
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

      {/* Modal / Painel de Detalhes do Cliente */}
      {(selectedClient || isAdding) && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 max-h-[95vh] overflow-y-auto no-scrollbar font-['Arial']">

            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black uppercase text-slate-800 leading-none">
                  {isAdding ? 'Novo Cliente' : selectedClient?.name}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                  {isAdding ? 'Preencha os dados cadastrais' : 'Ficha de Cadastro do Cliente'}
                </p>
              </div>
              <button onClick={() => { setSelectedClient(null); setIsAdding(false); setSelectedVehicleHistory(null); }} className="p-4 bg-slate-100 rounded-full text-slate-400 active:scale-90 touch-target"><X size={24} /></button>
            </div>

            {(isAdding || isEditing) ? (
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
                  <button onClick={() => isAdding ? setIsAdding(false) : setIsEditing(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-widest">Cancelar</button>
                  <button onClick={handleSaveClient} className="flex-[2] py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-green-100">Salvar Cadastro</button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Phone size={10} /> WhatsApp</p>
                    <p className="text-sm font-black text-slate-800">{selectedClient?.phone}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Info size={10} /> Documento</p>
                    <p className="text-sm font-black text-slate-800">{selectedClient?.cpfCnpj || 'Não Inf.'}</p>
                  </div>
                  <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={10} /> Endereço</p>
                    <p className="text-sm font-black text-slate-800 leading-tight">{selectedClient?.address || 'Sem endereço cadastrado'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <Car size={16} /> Veículos do Cliente
                    </h4>
                    <div className="flex gap-2">
                      <button onClick={() => setShowReportConfig(!showReportConfig)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all ${showReportConfig ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Printer size={12} /> Relatórios
                      </button>
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all">
                        <Edit2 size={12} /> Editar Cadastro
                      </button>
                    </div>
                  </div>

                  {showReportConfig && (
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-black uppercase text-indigo-800 tracking-widest flex items-center gap-2">
                          <FileText size={12} /> Relatório de Serviços
                        </h5>
                        <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-indigo-200 active:scale-95 hover:bg-indigo-700 transition-all flex items-center gap-2">
                          {isGeneratingReport ? 'Gerando...' : <><Printer size={12} /> Imprimir Relatório</>}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-indigo-400 ml-1">Data Início</label>
                          <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full p-2 bg-white rounded-xl text-xs font-bold border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-indigo-400 ml-1">Data Fim</label>
                          <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full p-2 bg-white rounded-xl text-xs font-bold border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700" />
                        </div>
                      </div>
                      <p className="text-[9px] text-indigo-600/70 font-medium leading-tight px-1">
                        * O relatório exibirá apenas serviços finalizados (Prontos ou Entregues) dentro do período selecionado.
                      </p>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-2xl border-2 border-slate-50">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400">Placa</th>
                          <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400">Modelo</th>
                          <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400">Marca</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {vehicles.filter(v => v.client_id === selectedClient!.id).map(v => (
                          <tr key={v.id} onClick={() => setSelectedVehicleHistory(v)} className="hover:bg-green-50 active:bg-green-100 cursor-pointer transition-all">
                            <td className="px-4 py-4 font-mono font-black text-sm text-slate-800 uppercase tracking-tighter">{v.plate}</td>
                            <td className="px-4 py-4 text-[11px] font-bold text-slate-600 uppercase">{v.model}</td>
                            <td className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase">{v.brand}</td>
                            <td className="px-4 py-4 text-slate-300"><ChevronRight size={14} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Painel Extra: Histórico do Veículo Selecionado */}
            {selectedVehicleHistory && (
              <div className="border-t pt-8 space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                    <FileText size={16} /> Histórico: {selectedVehicleHistory.plate}
                  </h4>
                  <button onClick={() => setSelectedVehicleHistory(null)} className="text-[9px] font-black text-slate-400 uppercase underline">Fechar histórico</button>
                </div>

                <div className="space-y-3">
                  {vehicleServices.length > 0 ? vehicleServices.map(s => (
                    <button
                      key={s.id}
                      onClick={() => onSelectService(s.id)}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group active:scale-95 transition-all"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                          <Calendar size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">OS #{s.id.substring(0, 8).toUpperCase()}</p>
                          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{new Date(s.entry_at).toLocaleDateString('pt-BR')}</p>
                          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border mt-2 inline-block ${s.status === ServiceStatus.ENTREGUE ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>{s.status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-800">{formatCurrency(s.total_value)}</p>
                        <ChevronRight size={14} className="text-slate-300 ml-auto mt-1" />
                      </div>
                    </button>
                  )) : (
                    <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                      <AlertCircle size={24} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nenhuma OS registrada para este veículo</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsTab;
