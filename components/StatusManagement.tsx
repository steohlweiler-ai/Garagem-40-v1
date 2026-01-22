
import React, { useState, useEffect } from 'react';
import { Tag, Edit2, Check, X, Palette, ArrowUpCircle, Eye, EyeOff } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { StatusConfig, ServiceStatus } from '../types';
import VoiceInput from './VoiceInput';

const StatusManagement: React.FC = () => {
  const [configs, setConfigs] = useState<StatusConfig[]>([]);
  const [editingKey, setEditingKey] = useState<ServiceStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<StatusConfig>>({
    label: '',
    color: '#000000',
    textColor: '#ffffff',
    priority: 1,
    active: true
  });

  const loadConfigs = async () => {
    const list = await dataProvider.getStatusConfigs();
    setConfigs([...list].sort((a, b) => a.priority - b.priority));
  };

  useEffect(() => { loadConfigs(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (config: StatusConfig) => {
    setEditingKey(config.key);
    setFormData({ ...config });
  };

  const handleSave = async () => {
    if (editingKey) {
      await dataProvider.updateStatusConfig(editingKey, formData);
      showToast('Configuração de status salva!');
      setEditingKey(null);
      loadConfigs();
    }
  };

  const toggleActive = async (config: StatusConfig) => {
    await dataProvider.updateStatusConfig(config.key, { active: !config.active });
    showToast(config.active ? 'Status desativado' : 'Status ativado');
    loadConfigs();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <Check className="text-green-500" size={18} /> {toast}
        </div>
      )}

      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-green-500 shadow-xl">
          <Tag size={28} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Status do Painel</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Personalize a exibição das etapas</p>
        </div>
      </div>

      <div className="space-y-4">
        {configs.map(config => (
          <div
            key={config.key}
            className={`bg-white p-5 rounded-[2.25rem] border-2 shadow-sm transition-all ${editingKey === config.key ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-50'
              } ${!config.active ? 'opacity-60 grayscale' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm"
                  style={{ backgroundColor: config.color, color: config.textColor }}
                >
                  {config.label}
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Chave Interna: {config.key}</p>
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Prioridade: {config.priority}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(config)} className="p-3 text-slate-300 hover:text-slate-600">
                  {config.active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button onClick={() => handleEdit(config)} className="p-3 text-slate-300 hover:text-blue-500 transition-colors">
                  <Edit2 size={18} />
                </button>
              </div>
            </div>

            {editingKey === config.key && (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-5 animate-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nome Exibido (Label)</label>
                  <VoiceInput
                    multiline={false}
                    value={formData.label || ''}
                    onTranscript={v => setFormData({ ...formData, label: v })}
                    placeholder="Ex: Aguardando"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Cor Fundo</label>
                    <div className="flex gap-2">
                      <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-12 h-12 rounded-xl border-2 border-slate-100 p-1" />
                      <input type="text" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-mono uppercase" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Cor Texto</label>
                    <div className="flex gap-2">
                      <input type="color" value={formData.textColor} onChange={e => setFormData({ ...formData, textColor: e.target.value })} className="w-12 h-12 rounded-xl border-2 border-slate-100 p-1" />
                      <input type="text" value={formData.textColor} onChange={e => setFormData({ ...formData, textColor: e.target.value })} className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-mono uppercase" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Ordem de Prioridade (Dashboard)</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-black outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditingKey(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
                  <button onClick={handleSave} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Salvar Mudanças</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusManagement;
