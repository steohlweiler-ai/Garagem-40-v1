
import React, { useState, useEffect } from 'react';
import {
  Share2, Calendar, RefreshCw, Unlink, Check,
  AlertCircle, ChevronRight, Smartphone, Mail, ExternalLink,
  Zap, Globe, Settings2, X, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { IntegrationState } from '../types';

const IntegrationsSettings: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationState>({
    googleCalendarConnected: false,
    n8nConnected: false,
    n8nEvents: {}
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showN8nDetails, setShowN8nDetails] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await dataProvider.getIntegrations();
      setIntegrations(data);
    };
    load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleConnectGoogle = async () => {
    const win = window.confirm("Você será redirecionado para o Google para autorizar o GARAGEM40 a gerenciar seu calendário. Deseja continuar?");
    if (win) {
      setIsSyncing(true);
      setTimeout(async () => {
        const newState = { ...integrations, googleCalendarConnected: true, lastSync: new Date().toISOString() };
        await dataProvider.updateIntegrations(newState);
        setIntegrations(newState);
        setIsSyncing(false);
        showToast("Google Calendar conectado com sucesso!");
      }, 2000);
    }
  };

  const handleToggleN8n = async () => {
    const newStatus = !integrations.n8nConnected;
    const newState = { ...integrations, n8nConnected: newStatus };
    await dataProvider.updateIntegrations(newState);
    setIntegrations(newState);
    showToast(newStatus ? "n8n Conectado (Simulado)" : "n8n Desconectado");
  };

  const handleToggleEvent = async (key: string) => {
    const currentVal = integrations.n8nEvents[key];
    await dataProvider.updateN8nEvent(key, !currentVal);
    const data = await dataProvider.getIntegrations();
    setIntegrations(data);
  };

  const n8nEventsList = [
    { key: 'os_created', label: 'OS Criada', desc: 'Dispara ao abrir uma nova ordem de serviço.' },
    { key: 'os_updated', label: 'OS Atualizada', desc: 'Dispara ao modificar dados de uma OS existente.' },
    { key: 'status_changed', label: 'Status Alterado', desc: 'Dispara ao mudar a etapa (ex: Em Andamento -> Pronto).' },
    { key: 'vehicle_delivered', label: 'Veículo Entregue', desc: 'Dispara ao finalizar e entregar o veículo.' },
    { key: 'os_delayed', label: 'OS Atrasada', desc: 'Dispara quando uma OS atinge o limite de tolerância.' },
    { key: 'reminder_created', label: 'Lembrete Criado', desc: 'Dispara ao agendar um novo alerta interno.' },
    { key: 'delivery_date_changed', label: 'Data de Entrega Alterada', desc: 'Dispara ao repactuar a previsão de saída.' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24 font-['Arial']">

      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <Check className="text-green-500" size={18} /> {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-green-500 shadow-xl">
          <Share2 size={28} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Integrações</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Conecte sua oficina com o mundo</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* n8n Card - NOVA INTEGRAÇÃO PREPARATÓRIA */}
        <div className={`bg-white rounded-[3rem] border-2 shadow-sm overflow-hidden transition-all ${integrations.n8nConnected ? 'border-orange-100' : 'border-slate-100'
          }`}>
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-5">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-colors ${integrations.n8nConnected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                  <Zap size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">n8n — Automação</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Orquestrador de Processos</p>
                  {integrations.n8nConnected && (
                    <div className="flex items-center gap-1.5 mt-3 text-orange-600">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Pronto para Eventos</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleToggleN8n}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all ${integrations.n8nConnected ? 'bg-slate-100 text-slate-400' : 'bg-orange-500 text-white shadow-orange-100'
                  }`}
              >
                {integrations.n8nConnected ? 'Desconectar' : 'Conectar'}
              </button>
            </div>

            <div className="space-y-5">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Conecte fluxos de trabalho inteligentes. Envie eventos da oficina para o n8n e automatize notificações em massa, planilhas e Dashboards externos.
              </p>

              {integrations.n8nConnected && (
                <button
                  onClick={() => setShowN8nDetails(true)}
                  className="w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 active:bg-slate-100 transition-all"
                >
                  <Settings2 size={16} /> Configurar Gatilhos de Automação
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Google Calendar Card */}
        <div className={`bg-white rounded-[3rem] border-2 shadow-sm overflow-hidden transition-all ${integrations.googleCalendarConnected ? 'border-indigo-100' : 'border-slate-100'
          }`}>
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-5">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg ${integrations.googleCalendarConnected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                  <Calendar size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Google Calendar</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronização de agendamentos</p>
                </div>
              </div>

              <button
                onClick={handleConnectGoogle}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all ${integrations.googleCalendarConnected ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-indigo-100'
                  }`}
              >
                {integrations.googleCalendarConnected ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Importe agendamentos externos e exporte previsões de entrega automaticamente para o calendário da oficina.
            </p>
          </div>
        </div>

        {/* WhatsApp Placeholder */}
        <div className="opacity-40 grayscale pointer-events-none">
          <div className="bg-white p-8 rounded-[3rem] border-2 border-dashed border-slate-200 flex items-center justify-between">
            <div className="flex gap-5 items-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-tight">WhatsApp API</h3>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Notificações Diretas</p>
              </div>
            </div>
            <span className="text-[8px] font-black text-slate-300 bg-slate-50 px-3 py-1.5 rounded-full uppercase tracking-widest">Em breve</span>
          </div>
        </div>
      </div>

      {/* Modal Detalhes n8n */}
      {showN8nDetails && (
        <div className="fixed inset-0 z-[160] bg-slate-900/70 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 max-h-[90vh] overflow-y-auto no-scrollbar">

            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight leading-none">Configuração n8n</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Escolha quais eventos enviar</p>
                </div>
              </div>
              <button onClick={() => setShowN8nDetails(false)} className="p-4 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all touch-target">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-[2rem] flex gap-4">
              <Info className="text-blue-500 shrink-0" size={24} />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-blue-700 tracking-widest">Arquitetura de Webhooks</p>
                <p className="text-xs text-blue-900/70 leading-relaxed font-medium">
                  Quando ativos, o GARAGEM40 enviará um payload JSON via POST para a URL do seu workflow no n8n. Configure o nó "Webhook" no n8n para receber os dados.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 ml-2">Gatilhos Disponíveis</h4>

              <div className="space-y-3">
                {n8nEventsList.map(event => (
                  <div key={event.key} className="p-5 bg-white border-2 border-slate-50 rounded-[2rem] flex items-center justify-between shadow-sm">
                    <div className="flex-1 pr-6">
                      <p className="text-sm font-black uppercase text-slate-800 tracking-tight">{event.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1 leading-tight">{event.desc}</p>
                    </div>
                    <button
                      onClick={() => handleToggleEvent(event.key)}
                      className={`p-2 transition-colors ${integrations.n8nEvents[event.key] ? 'text-green-500' : 'text-slate-200'}`}
                    >
                      {integrations.n8nEvents[event.key] ? <ToggleRight size={40} strokeWidth={1.5} /> : <ToggleLeft size={40} strokeWidth={1.5} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t">
              <button
                onClick={() => setShowN8nDetails(false)}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[2px] shadow-xl active:scale-95 transition-all"
              >
                Salvar Preferências de Automação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsSettings;
