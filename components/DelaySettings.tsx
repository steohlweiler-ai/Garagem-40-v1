
import React, { useState, useEffect } from 'react';
import {
  Clock, ShieldAlert, Save, Check, Info,
  CalendarDays, Briefcase, AlertTriangle
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { DelayCriteria } from '../types';

interface DelaySettingsProps {
  user: any;
}

const DelaySettings: React.FC<DelaySettingsProps> = ({ user }) => {
  const [criteria, setCriteria] = useState<DelayCriteria>({
    active: true,
    thresholdDays: 0,
    thresholdHours: 2,
    considerWorkdays: true,
    considerBusinessHours: true,
    businessStart: '08:00',
    businessEnd: '18:00',
    priorityOverrides: [],
    autoMarkDelayed: true,
    autoNotify: false
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await dataProvider.getDelayCriteria();
      if (data) setCriteria(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    // Mantém a estrutura de dados, mas simplifica a interface
    await dataProvider.updateDelayCriteria(criteria);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">

      {/* Toast de Confirmação */}
      {isSaved && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <Check className="text-green-500" size={18} strokeWidth={4} /> Regras de Atraso Atualizadas!
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-green-500 shadow-xl shadow-slate-200">
          <Clock size={28} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Regras de Atraso</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configuração de tolerância da oficina</p>
        </div>
      </div>

      {/* Ativação Principal */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl transition-colors ${criteria.active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Monitoramento Ativo</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Habilitar cálculo de atraso automático</p>
          </div>
        </div>
        <button
          onClick={() => setCriteria({ ...criteria, active: !criteria.active })}
          className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${criteria.active ? 'bg-green-500 justify-end' : 'bg-slate-200 justify-start'}`}
        >
          <div className="w-6 h-6 bg-white rounded-full shadow-md" />
        </button>
      </div>

      {criteria.active && (
        <div className="space-y-6 animate-in slide-in-from-top-2">

          {/* Threshold Section */}
          <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-2">Tolerância Padrão</h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dias</label>
                <input
                  type="number"
                  value={criteria.thresholdDays}
                  onChange={e => setCriteria({ ...criteria, thresholdDays: Math.max(0, Number(e.target.value)) })}
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-xl font-black outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Horas</label>
                <input
                  type="number"
                  value={criteria.thresholdHours}
                  onChange={e => setCriteria({ ...criteria, thresholdHours: Math.max(0, Number(e.target.value)) })}
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-xl font-black outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic">
              * O sistema considerará atrasado após (Data Prevista + Tolerância).
            </p>
          </div>

          {/* Business Hours Section */}
          <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-2">Calendário Operacional</h4>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <CalendarDays size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Apenas Dias Úteis</span>
                </div>
                <button
                  onClick={() => setCriteria({ ...criteria, considerWorkdays: !criteria.considerWorkdays })}
                  className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${criteria.considerWorkdays ? 'bg-blue-500 justify-end' : 'bg-slate-200 justify-start'}`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Horário Comercial</span>
                </div>
                <button
                  onClick={() => setCriteria({ ...criteria, considerBusinessHours: !criteria.considerBusinessHours })}
                  className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${criteria.considerBusinessHours ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              {criteria.considerBusinessHours && (
                <div className="grid grid-cols-2 gap-4 pt-2 animate-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Abertura</label>
                    <input
                      type="time"
                      value={criteria.businessStart}
                      onChange={e => setCriteria({ ...criteria, businessStart: e.target.value })}
                      className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-black border-2 border-transparent focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Fechamento</label>
                    <input
                      type="time"
                      value={criteria.businessEnd}
                      onChange={e => setCriteria({ ...criteria, businessEnd: e.target.value })}
                      className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-black border-2 border-transparent focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Automation Section */}
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Automação de Painel</h4>
            <div className="flex items-center justify-between">
              <div className="space-y-1 pr-4">
                <p className="text-xs font-black uppercase tracking-tight">Marcar OS automaticamente</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  Altera o status visual para "Atrasado" quando o limite expirar.
                </p>
              </div>
              <button
                onClick={() => setCriteria({ ...criteria, autoMarkDelayed: !criteria.autoMarkDelayed })}
                className={`shrink-0 w-14 h-8 rounded-full p-1 transition-colors flex items-center ${criteria.autoMarkDelayed ? 'bg-green-500 justify-end' : 'bg-slate-700 justify-start'}`}
              >
                <div className="w-6 h-6 bg-white rounded-full shadow-md" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Salvar Fixo */}
      <div className="fixed bottom-28 left-0 right-0 px-6 z-40 max-w-2xl mx-auto">
        <button
          onClick={handleSave}
          className={`w-full py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[2px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${isSaved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
        >
          {isSaved ? <Check size={18} strokeWidth={4} /> : <Save size={18} />}
          {isSaved ? 'CONFIGURAÇÕES SALVAS!' : 'SALVAR CRITÉRIOS DE ATRASO'}
        </button>
      </div>

    </div>
  );
};

export default DelaySettings;
