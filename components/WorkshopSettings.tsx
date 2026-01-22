
import React, { useState, useEffect } from 'react';
import { Store, Save, Check, MapPin, Phone, Hash, Info, Smartphone } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { WorkshopSettings } from '../types';
import VoiceInput from './VoiceInput';

const WorkshopSettingsComp: React.FC = () => {
  const [settings, setSettings] = useState<WorkshopSettings>({
    name: '',
    address: '',
    phone: '',
    cnpj: '',
    organization_id: 'org_1'
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await dataProvider.getWorkshopSettings();
      if (data) setSettings(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    await dataProvider.updateWorkshopSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* Toast de Confirmação */}
      {isSaved && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <Check className="text-green-500" size={18} strokeWidth={4} /> Dados da Oficina Atualizados!
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-green-500 shadow-xl shadow-slate-200">
          <Store size={28} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Dados da Oficina</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configuração do Cabeçalho de Impressão</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome Fantasia / Razão Social</label>
          <VoiceInput
            multiline={false}
            value={settings.name}
            onTranscript={v => setSettings({ ...settings, name: v })}
            placeholder="Ex: Garagem 40 Centro Automotivo"
            className="!bg-slate-50 !border-transparent !font-black !uppercase"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Endereço Completo</label>
          <VoiceInput
            multiline={true}
            value={settings.address}
            onTranscript={v => setSettings({ ...settings, address: v })}
            placeholder="Rua, Número, Bairro, Cidade - UF"
            className="!bg-slate-50 !border-transparent !font-bold"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone Principal</label>
            <div className="relative">
              <input
                type="text"
                value={settings.phone}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-sm font-black transition-all outline-none"
              />
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CNPJ</label>
            <div className="relative">
              <input
                type="text"
                value={settings.cnpj}
                onChange={e => setSettings({ ...settings, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-sm font-black transition-all outline-none"
              />
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
          <Info className="text-blue-500 shrink-0" size={18} />
          <p className="text-[10px] text-blue-700 font-bold uppercase leading-tight tracking-tight">
            Estas informações serão exibidas no cabeçalho de todas as Ordens de Serviço impressas e nos relatórios de faturamento.
          </p>
        </div>
      </div>

      <div className="fixed bottom-28 left-0 right-0 px-6 z-40 max-w-2xl mx-auto">
        <button
          onClick={handleSave}
          className={`w-full py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[2px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${isSaved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
        >
          {isSaved ? <Check size={18} strokeWidth={4} /> : <Save size={18} />}
          {isSaved ? 'DADOS SALVOS!' : 'SALVAR DADOS DA OFICINA'}
        </button>
      </div>
    </div>
  );
};

export default WorkshopSettingsComp;
