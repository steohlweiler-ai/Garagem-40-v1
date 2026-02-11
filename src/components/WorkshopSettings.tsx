
import React, { useState, useEffect } from 'react';
import { Store, Save, Check, MapPin, Phone, Hash, Info, Smartphone, HardDrive, Trash2, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { WorkshopSettings } from '../types';
import VoiceInput from './VoiceInput';

const WorkshopSettingsComp: React.FC = () => {
  const [settings, setSettings] = useState<WorkshopSettings>({
    name: '',
    address: '',
    phone: '',
    cnpj: '',
    organization_id: 'org_1',
    media_retention_days: null,
    logo_url: ''
  });
  const [isSaved, setIsSaved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [cleanupStats, setCleanupStats] = useState<{ count: number } | null>(null);
  const [cleaning, setCleaning] = useState(false);

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

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const count = await dataProvider.analyzeOldMedia();
      setCleanupStats({ count });
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const res = await dataProvider.cleanupOldMedia();
      if (res.success) {
        setCleanupStats(null);
        setIsSaved(true); // Re-use saved toast or custom one
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCleaning(false);
    }
  }

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

      {/* Gestão de Armazenamento - Section */}
      <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
            <HardDrive size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gestão de Armazenamento</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controle de Mídias e Fotos</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tempo de Retenção de Mídias</label>
          <div className="relative">
            <select
              value={settings.media_retention_days === null ? 'null' : settings.media_retention_days}
              onChange={(e) => {
                const val = e.target.value === 'null' ? null : Number(e.target.value);
                setSettings({ ...settings, media_retention_days: val });
              }}
              className="w-full pl-12 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-sm font-black transition-all outline-none appearance-none uppercase text-slate-700"
            >
              <option value="null">Nunca excluir (Padrão)</option>
              <option value="90">3 Meses (90 dias)</option>
              <option value="180">6 Meses (180 dias)</option>
              <option value="365">1 Ano (365 dias)</option>
            </select>
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20} />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">▼</div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">
            Define por quanto tempo as fotos e vídeos das OSs serão mantidas no sistema.
          </p>
        </div>

        {/* Cleanup Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-black text-slate-700 uppercase">Limpeza Manual</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Você pode liberar espaço removendo mídias antigas com base na regra acima de {settings.media_retention_days ? `${settings.media_retention_days} dias` : '"Nunca excluir"'}.
              </p>
            </div>
          </div>

          {cleanupStats ? (
            <div className="bg-white border-2 border-amber-100 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm font-bold text-slate-700 text-center mb-3">
                Encontramos <span className="text-amber-600 font-black text-lg mx-1">{cleanupStats.count}</span> arquivos antigos.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCleanupStats(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={cleanupStats.count === 0 || cleaning}
                  onClick={handleCleanup}
                  className="flex-1 py-3 rounded-xl font-black text-xs uppercase bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {cleaning ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  {cleaning ? 'Limpando...' : 'Excluir Arquivos'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full py-4 rounded-xl font-black text-xs uppercase bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              {analyzing ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              {analyzing ? 'Analisando...' : 'Analisar Mídias Antigas'}
            </button>
          )}
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
