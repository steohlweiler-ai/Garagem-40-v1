import React, { useState, useEffect, useRef } from 'react';
import {
  X, Check, Search, ChevronDown, Camera, Video, Upload, Trash2, Maximize2, Play, Image as ImageIcon, Loader2
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { ServiceJob, EvaluationTemplate, TaskType, ItemMedia, InspectionTemplateItem, ServiceTask } from '../types';
import { blobToBase64, generateUUID } from '../utils/helpers';
import VoiceInput from './VoiceInput';
import CameraCapture from './CameraCapture';

interface EvaluationSheetProps {
  service: ServiceJob;
  onClose: () => void;
}

interface ItemDetail {
  checked: boolean;
  selectedTypes: string[];
  observation: string;
  relato: string;
  diagnostico: string;
  media: ItemMedia[];
  lateralities: string[];
  defaultChargeType: string;
  defaultFixedValue: number;
  defaultRatePerHour: number;
}

const EvaluationSheet: React.FC<EvaluationSheetProps> = ({ service, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<EvaluationTemplate | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, ItemDetail>>({});

  useEffect(() => {
    const loadData = async () => {
      const templates = await dataProvider.getTemplates();
      const currentTemplate = templates.find(t => t.id === service.inspection?.template_id) || templates.find(t => t.is_default);
      if (currentTemplate) setActiveTemplate(currentTemplate);

      const initialChecklist: Record<string, ItemDetail> = {};
      currentTemplate?.sections.forEach(section => {
        section.items.forEach(item => {
          const matchingTasks = service.tasks.filter(t => t.title.includes(item.label));
          const selectedTypes: string[] = [];
          matchingTasks.forEach(t => {
            if (t.type) {
              t.type.split(' + ').forEach(type => {
                const lowerType = type.trim().toLowerCase();
                if (lowerType && !selectedTypes.includes(lowerType)) selectedTypes.push(lowerType);
              });
            }
          });

          const referenceTask = matchingTasks[0];
          initialChecklist[item.label] = {
            checked: matchingTasks.length > 0,
            selectedTypes: selectedTypes,
            observation: referenceTask?.observation || '',
            relato: referenceTask?.relato || '',
            diagnostico: referenceTask?.diagnostico || '',
            media: referenceTask?.media || [],
            lateralities: [],
            defaultChargeType: item.default_charge_type,
            defaultFixedValue: item.default_fixed_value,
            defaultRatePerHour: item.default_rate_per_hour
          };
        });
      });
      setChecklist(initialChecklist);
    };
    loadData();
  }, [service]);

  const updateItemDetail = (item: string, updates: Partial<ItemDetail>) => {
    setChecklist(prev => ({ ...prev, [item]: { ...prev[item], ...updates } }));
  };

  const handleToggleType = (item: string, type: string) => {
    setChecklist(prev => {
      const currentItem = prev[item];
      const currentTypes = currentItem.selectedTypes;
      let newTypes: string[] = [];
      if (type === 'troca') newTypes = currentTypes.includes('troca') ? [] : ['troca'];
      else {
        const temp = currentTypes.filter(t => t !== 'troca');
        newTypes = temp.includes(type) ? temp.filter(t => t !== type) : [...temp, type];
      }
      return { ...prev, [item]: { ...currentItem, checked: true, selectedTypes: newTypes } };
    });
  };

  const handleSave = async () => {
    // 1. Manter tarefas que NÃO vieram de template (tarefas manuais)
    const manualTasks = service.tasks.filter(t => !t.from_template_id);

    // 2. Gerar novas tarefas baseadas na ficha
    const templateTasks: ServiceTask[] = [];

    (Object.entries(checklist) as [string, ItemDetail][]).forEach(([itemName, detail]) => {
      if (!detail.checked) return;

      const isTroca = detail.selectedTypes.includes('troca');
      const hasChap = detail.selectedTypes.includes('chap.');
      const hasPintura = detail.selectedTypes.includes('pintura');

      const createOrUpdateTask = (title: string, type: string) => {
        const existing = service.tasks.find(t => t.title === title);

        return {
          id: existing?.id || generateUUID(),
          service_id: service.id,
          title: title,
          status: existing?.status || 'todo',
          type: type,
          relato: detail.relato || existing?.relato,
          diagnostico: detail.diagnostico || existing?.diagnostico,
          media: detail.media.length > 0 ? detail.media : existing?.media || [],
          charge_type: (detail.defaultChargeType as any) || existing?.charge_type || 'Fixo',
          fixed_value: detail.defaultFixedValue || existing?.fixed_value || 0,
          rate_per_hour: detail.defaultRatePerHour || existing?.rate_per_hour || 120,
          from_template_id: activeTemplate?.id || 'tmpl_manual',
          order: existing?.order ?? (templateTasks.length + manualTasks.length),
          time_spent_seconds: existing?.time_spent_seconds || 0,
          started_at: existing?.started_at,
          manual_override_value: existing?.manual_override_value ?? null
        };
      };

      if (isTroca) {
        templateTasks.push(createOrUpdateTask(`Troca do ${itemName}`, 'Troca'));
      } else {
        if (hasChap) templateTasks.push(createOrUpdateTask(`${itemName} - Chapeação`, 'Chap.'));
        if (hasPintura) templateTasks.push(createOrUpdateTask(`${itemName} - Pintura`, 'Pintura'));

        if (!hasChap && !hasPintura) {
          templateTasks.push(createOrUpdateTask(itemName, detail.selectedTypes.join(' + ') || 'Avaliação'));
        }
      }
    });

    // 3. Atualizar o serviço com a nova lista consolidada
    const finalTasks = [...manualTasks, ...templateTasks].sort((a, b) => (a.order || 0) - (b.order || 0));
    await dataProvider.updateService(service.id, { tasks: finalTasks } as any);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] bg-white flex flex-col animate-in fade-in font-['Arial']">
      <div className="p-5 pt-8 border-b flex justify-between items-center bg-[#1e293b] text-white">
        <button onClick={onClose} className="p-4 bg-white/10 rounded-full active:scale-90 touch-target transition-all"><X size={20} /></button>
        <div className="text-center">
          <h2 className="text-base font-black uppercase tracking-tighter">Consulta Ficha</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sincronização Ativa</p>
        </div>
        <button onClick={handleSave} className="p-4 bg-green-500 text-white rounded-2xl shadow-lg active:scale-90 transition-all">
          <Check size={24} strokeWidth={4} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32 custom-scrollbar">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar item na ficha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-bold outline-none"
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {activeTemplate?.sections.map(section => {
          const filtered = section.items.filter(i => i.label.toLowerCase().includes(searchTerm.toLowerCase()));
          if (filtered.length === 0) return null;
          return (
            <div key={section.section_name} className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-l-4 border-green-500 pl-2 bg-slate-50/50 py-1">{section.section_name}</h3>
              {filtered.map(item => {
                const detail = checklist[item.label];
                const isExpanded = expandedItem === item.label;
                return (
                  <div key={item.key} className="space-y-2">
                    <div className={`w-full flex items-stretch border-2 rounded-[1.75rem] transition-all ${detail?.checked ? 'bg-green-50 border-green-500 shadow-sm' : 'bg-white border-slate-100'}`}>
                      <button onClick={() => updateItemDetail(item.label, { checked: !detail?.checked })} className={`p-5 flex items-center justify-center border-r transition-colors ${detail?.checked ? 'border-green-200 bg-green-100 text-green-700' : 'border-slate-50 bg-slate-50 text-slate-300'}`}><div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${detail?.checked ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-300'}`}>{detail?.checked && <Check size={16} strokeWidth={4} />}</div></button>
                      <button onClick={() => setExpandedItem(isExpanded ? null : item.label)} className="flex-1 p-5 text-left flex justify-between items-center"><span className={`text-[13px] font-black uppercase tracking-tight ${detail?.checked ? 'text-green-800' : 'text-slate-500'}`}>{item.label}</span><ChevronDown size={18} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-6 mx-2 animate-in slide-in-from-top-2">
                        <div className="flex gap-3 flex-wrap">
                          {item.subitems?.map(st => (
                            <button key={st} onClick={() => handleToggleType(item.label, st)} className={`px-4 py-2 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${detail?.selectedTypes.includes(st) ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'}`}>{st}</button>
                          ))}
                        </div>
                        <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 ml-1">Relato Cliente</label><VoiceInput value={detail?.relato || ''} onTranscript={(v) => updateItemDetail(item.label, { relato: v })} placeholder="Diga as observações..." className="!bg-white !rounded-2xl" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 ml-1">Diagnóstico Técnico</label><VoiceInput value={detail?.diagnostico || ''} onTranscript={(v) => updateItemDetail(item.label, { diagnostico: v })} placeholder="Análise técnica..." className="!bg-white !rounded-2xl" /></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="p-6 bg-white border-t sticky bottom-0 safe-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button onClick={handleSave} className="w-full py-6 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
          Sincronizar Plano de Execução <Check size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default EvaluationSheet;