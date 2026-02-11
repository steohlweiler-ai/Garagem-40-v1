import React, { useState, useEffect } from 'react';
import {
  X, Check, Search, ChevronDown, Trash2, FileText, RefreshCw, AlertTriangle
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { ServiceJob, EvaluationTemplate, ItemMedia, ServiceTask } from '../types';
import { generateUUID } from '../utils/helpers';
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
  defaultChargeType: string;
  defaultFixedValue: number;
  defaultRatePerHour: number;
}

const EvaluationSheet: React.FC<EvaluationSheetProps> = ({ service, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<EvaluationTemplate | null>(null);
  const [allTemplates, setAllTemplates] = useState<EvaluationTemplate[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, ItemDetail>>({});
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load Data & Initialize
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const templates = await dataProvider.getTemplates();
      setAllTemplates(templates);

      // Determine initial template
      // Prioritize inspection.template_id which is now the source of truth
      let currentTemplate = templates.find(t => t.id === service.inspection?.template_id);

      if (!currentTemplate) {
        currentTemplate = templates.find(t => t.active) ||
          templates.find(t => t.is_default) ||
          templates[0];
      }

      setActiveTemplate(currentTemplate || null);

      // Check if we need to load from existing tasks or deep copy from template
      const hasExistingEvaluationTasks = service.tasks.some(t => t.from_template_id);

      if (hasExistingEvaluationTasks) {
        // Load existing state from service tasks
        const loadedChecklist: Record<string, ItemDetail> = {};

        // We iterate through the template items to rebuild the checklist state
        // If the template changed from what was saved, this might be partial, 
        // but typically active_template_id tracks the correct one.
        const templateToUse = currentTemplate || templates[0];

        templateToUse?.sections.forEach(section => {
          section.items.forEach(item => {
            const matchingTasks = service.tasks.filter(t => t.title.includes(item.label));

            // Reconstruct selected types
            const selectedTypes: string[] = [];
            matchingTasks.forEach(t => {
              if (t.type === 'Troca') selectedTypes.push('troca');
              else if (t.type === 'Chap.') selectedTypes.push('chap.');
              else if (t.type === 'Pintura') selectedTypes.push('pintura');
              else if (t.type) {
                // Try to parse composite types or custom ones
                t.type.split('+').forEach(sub => {
                  const s = sub.trim().toLowerCase();
                  if (s && !selectedTypes.includes(s)) selectedTypes.push(s);
                });
              }
            });

            const referenceTask = matchingTasks[0];
            loadedChecklist[item.label] = {
              checked: matchingTasks.length > 0,
              selectedTypes: selectedTypes,
              observation: referenceTask?.observation || '',
              relato: referenceTask?.relato || '',
              diagnostico: referenceTask?.diagnostico || '',
              media: referenceTask?.media || [],
              defaultChargeType: item.default_charge_type,
              defaultFixedValue: item.default_fixed_value,
              defaultRatePerHour: item.default_rate_per_hour
            };
          });
        });
        setChecklist(loadedChecklist);
      } else if (currentTemplate) {
        // Deep Copy Logic: Initialize fresh checklist from template
        initializeChecklistFromTemplate(currentTemplate);
      }

      setIsLoading(false);
    };
    loadData();
  }, [service.id]); // Only re-run if service ID changes (initial load), not on every service update prop change to avoid overwrite

  const initializeChecklistFromTemplate = (template: EvaluationTemplate) => {
    const initialChecklist: Record<string, ItemDetail> = {};
    template.sections.forEach(section => {
      section.items.forEach(item => {
        initialChecklist[item.label] = {
          checked: false,
          selectedTypes: [],
          observation: '',
          relato: '',
          diagnostico: '',
          media: [],
          defaultChargeType: item.default_charge_type,
          defaultFixedValue: item.default_fixed_value,
          defaultRatePerHour: item.default_rate_per_hour
        };
      });
    });
    setChecklist(initialChecklist);
  };

  const handleTemplateChange = (template: EvaluationTemplate) => {
    // Check if there is data
    const hasData = (Object.values(checklist) as ItemDetail[]).some(i => i.checked || i.observation || i.relato || i.diagnostico);
    if (hasData) {
      if (!window.confirm(`Trocar para "${template.name}" irá limpar os itens preenchidos da avaliação atual. Continuar?`)) {
        return;
      }
    }

    setActiveTemplate(template);
    initializeChecklistFromTemplate(template);
    setShowTemplateMenu(false);
  };

  const updateItemDetail = (item: string, updates: Partial<ItemDetail>) => {
    setChecklist(prev => ({ ...prev, [item]: { ...prev[item], ...updates } }));
  };

  const handleToggleType = (item: string, type: string) => {
    setChecklist(prev => {
      const currentItem = prev[item];
      const currentTypes = currentItem.selectedTypes;
      let newTypes: string[] = [];

      const lowerType = type.toLowerCase();

      if (lowerType === 'troca') newTypes = currentTypes.includes('troca') ? [] : ['troca'];
      else {
        const temp = currentTypes.filter(t => t !== 'troca');
        newTypes = temp.includes(lowerType) ? temp.filter(t => t !== lowerType) : [...temp, lowerType];
      }
      return { ...prev, [item]: { ...currentItem, checked: true, selectedTypes: newTypes } };
    });
  };

  const handleSave = async () => {
    // 1. Keep manual tasks (those NOT from any template)
    // We identify manual tasks by checking if they don't have a from_template_id OR if they don't match our current scope
    // But safely: "Manter EXATAMENTE a renderização atual" implies we should re-sync the active template tasks.

    // Filter out tasks that belong to the PREVIOUS evaluation (if any) to replace them
    // Strategy: Remove all tasks that have `from_template_id != null` and replace with new set.
    // Or better: Update existing ones if IDs match? No, we regenerate to be safe with the structure.
    // User requirement: "Ao selecionar outro, substitua os itens..."

    const manualTasks = service.tasks.filter(t => !t.from_template_id);

    const templateTasks: ServiceTask[] = [];

    (Object.entries(checklist) as [string, ItemDetail][]).forEach(([itemName, detail]) => {
      if (!detail.checked) return;

      const isTroca = detail.selectedTypes.includes('troca');
      const hasChap = detail.selectedTypes.includes('chap.');
      const hasPintura = detail.selectedTypes.includes('pintura');

      const createOrUpdateTask = (title: string, type: string) => {
        // Try to find if we already have this task loosely (by title) to preserve ID if possible?
        // Actually, if we are saving, we can generate new ones or preserve.
        // Let's generate new ID if valid logic, or keep if we can match.
        // Matching by title is risky if title changes.
        // Let's check against `service.tasks` JUST to preserve ID if it was already there (to avoid churn in DB).
        const existing = service.tasks.find(t => t.title === title && t.from_template_id);

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
          // If purely general evaluation checked without specific sub-type
          // Join validation
          const typesLabel = detail.selectedTypes.filter(t => t !== 'troca' && t !== 'chap.' && t !== 'pintura').join(' + ');
          templateTasks.push(createOrUpdateTask(itemName, typesLabel || 'Avaliação'));
        }
      }
    });

    const finalTasks = [...manualTasks, ...templateTasks].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Save to Service 
    // AND update active_template_id via inspection column
    await dataProvider.updateService(service.id, {
      tasks: finalTasks,
      inspection: {
        ...(service.inspection || { items: {}, general_notes: '' }),
        template_id: activeTemplate?.id,
        template_name: activeTemplate?.name
      }
    } as any);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] bg-white flex flex-col animate-in fade-in font-['Arial']">
      {/* HEADER */}
      <div className="p-5 pt-8 border-b flex justify-between items-center bg-[#1e293b] text-white shrink-0">
        <button onClick={onClose} className="p-4 bg-white/10 rounded-full active:scale-90 touch-target transition-all"><X size={20} /></button>
        <div className="text-center flex flex-col items-center">
          <h2 className="text-base font-black uppercase tracking-tighter">Avaliação Técnica</h2>
          {/* TEMPLATE SELECTOR UI */}
          <div className="relative mt-1">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all text-[10px] font-bold uppercase tracking-widest text-green-400"
            >
              <FileText size={10} />
              {activeTemplate ? activeTemplate.name : 'Selecionar Modelo'}
              <RefreshCw size={10} className="ml-0.5" />
            </button>

            {showTemplateMenu && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden text-slate-900 z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                  Modelos Disponíveis
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {allTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateChange(t)}
                      className={`w-full text-left px-4 py-3 text-xs font-bold uppercase hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between ${activeTemplate?.id === t.id ? 'text-green-600 bg-green-50' : 'text-slate-600'}`}
                    >
                      {t.name}
                      {activeTemplate?.id === t.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
                      <button onClick={() => setExpandedItem(isExpanded ? null : item.label)} className="flex-1 p-5 text-left flex justify-between items-center h-auto min-h-[60px]"><span className={`text-[13px] font-black uppercase tracking-tight break-words whitespace-normal pr-2 ${detail?.checked ? 'text-green-800' : 'text-slate-500'}`}>{item.label}</span><ChevronDown size={18} className={`text-slate-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} /></button>
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-6 mx-2 animate-in slide-in-from-top-2">
                        <div className="flex gap-3 flex-wrap">
                          {item.subitems?.map(st => (
                            <button key={st} onClick={() => handleToggleType(item.label, st)} className={`px-4 py-2 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${detail?.selectedTypes.includes(st.toLowerCase()) ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'}`}>{st.split('(')[0].trim()}</button>
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