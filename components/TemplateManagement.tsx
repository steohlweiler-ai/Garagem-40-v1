import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Plus, Trash2, Save, FileText, Check, X, Search, ChevronRight,
    MoreVertical, DollarSign, Clock, GripVertical, Mic, AlertTriangle
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { EvaluationTemplate, InspectionTemplateItem } from '../types';
import VoiceInput from './VoiceInput';

interface TemplateManagerProps {
    onClose: () => void;
}

// ===================== ITEM EDITOR MODAL =====================
interface ItemEditorProps {
    templateId: string;
    item?: InspectionTemplateItem; // If null, creating new
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

const ItemEditorModal: React.FC<ItemEditorProps> = ({ templateId, item, isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('0');
    const [type, setType] = useState<'fixed' | 'hour'>('fixed');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (item) {
                setName(item.label);
                setPrice(item.default_price ? String(item.default_price) : '0');
                setType(item.default_charge_type === 'Hora' ? 'hour' : 'fixed');
                // We need to support category retrieval. 
                // Currently `item` in `InspectionTemplateItem` doesn't explicitly store category string 
                // (it is grouped in sections in EvaluationTemplate).
                // However, the EDITOR receives the item which is mapped. 
                // We might need to pass the category explicitly if we want to pre-fill it correctly 
                // OR we can infer it if we pass the section name.
                // For simplicity now, we'll let user re-select or pass it in props.
                // Let's assume we pass category name in a separate prop if needed, or just default to 'Geral'.
            } else {
                setName('');
                setCategory('Geral');
                setPrice('0');
                setType('fixed');
            }
        }
    }, [isOpen, item]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        const numericPrice = parseFloat(price.replace(',', '.')) || 0;

        try {
            if (item) {
                // Update
                if (item.id) {
                    await dataProvider.updateTemplateItem(item.id, {
                        name,
                        category,
                        default_price: numericPrice,
                        billing_type: type
                    });
                }
            } else {
                // Create
                await dataProvider.addTemplateItem(templateId, {
                    name,
                    category,
                    price: numericPrice,
                    type
                });
            }
            onSave();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar item.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full sm:w-[400px] sm:rounded-3xl rounded-t-[2rem] p-6 space-y-6 animate-in slide-in-from-bottom-10 duration-300">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black uppercase text-slate-800">{item ? 'Editar Item' : 'Novo Item'}</h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Nome do Item</label>
                        <div className="relative">
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Capô Dianteiro"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-green-500 outline-none"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <VoiceInput onTranscript={setName} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Categoria</label>
                        <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                            {['Estrutura', 'Complementares', 'Outros'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap border-2 transition-all ${category === cat ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valor Base (R$)</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black text-slate-800 focus:border-green-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cobrança</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setType('fixed')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${type === 'fixed' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}>Fixo</button>
                                <button onClick={() => setType('hour')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${type === 'hour' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Hora</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Item'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===================== TEMPLATE EDITOR =====================
interface TemplateEditorProps {
    template: EvaluationTemplate;
    onBack: () => void;
    onUpdate: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onBack, onUpdate }) => {
    const [name, setName] = useState(template.name);
    const [isActive, setIsActive] = useState(template.active);
    const [editingItem, setEditingItem] = useState<{ item?: InspectionTemplateItem, category?: string } | null>(null);
    const [showItemModal, setShowItemModal] = useState(false);

    // Auto-save debounced? Or save on blur/change? 
    // Requirement says "Auto-Save: Se o usuário editar um item e voltar, mostre um Toast".
    // For the Header (Name/Active), let's save on blur or toggle active immediately.

    const handleNameBlur = async () => {
        if (name !== template.name) {
            await dataProvider.updateTemplate(template.id, { name });
            onUpdate(); // Refresh parent list implicitly?
            // Show toast logic handled by parent or here? simpler to just save.
        }
    };

    const toggleActive = async () => {
        const newState = !isActive;
        setIsActive(newState);
        await dataProvider.updateTemplate(template.id, { active: newState });
        onUpdate();
    };

    const handleDeleteTemplate = async () => {
        const confirmName = prompt(`Digite "${template.name}" para confirmar a exclusão deste modelo:`);
        if (confirmName === template.name) {
            await dataProvider.deleteTemplate(template.id);
            onBack();
        } else if (confirmName !== null) {
            alert('Nome incorreto. Exclusão cancelada.');
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (window.confirm('Excluir este item?')) {
            await dataProvider.deleteTemplateItem(itemId);
            onUpdate();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600"><ArrowLeft size={24} /></button>
                <div className="flex-1 mx-4">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={handleNameBlur}
                        className="w-full text-lg font-black uppercase text-slate-800 outline-none placeholder:text-slate-300"
                        placeholder="NOME DO MODELO"
                    />
                </div>
                <button onClick={handleDeleteTemplate} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Configs */}
            <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Opções do Modelo</span>
                <button
                    onClick={toggleActive}
                    className={`relative px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-3 ${isActive ? 'bg-green-100 text-green-700 pr-3 pl-11' : 'bg-slate-200 text-slate-400 pl-3 pr-11'}`}
                >
                    <div className={`absolute w-8 h-6 bg-white rounded-lg shadow-sm transition-all flex items-center justify-center ${isActive ? 'left-[calc(100%-2.25rem)]' : 'left-1'}`}>
                        {isActive ? <Check size={12} className="text-green-600" strokeWidth={3} /> : <X size={12} className="text-slate-400" strokeWidth={3} />}
                    </div>
                    {isActive ? 'Modelo Padrão (Ativo)' : 'Não é Padrão'}
                </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
                {template.sections.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase">Nenhum item cadastrado</p>
                    </div>
                )}

                {template.sections.map(section => (
                    <div key={section.section_name} className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest">
                                {section.section_name}
                            </span>
                            <div className="h-px bg-slate-100 flex-1" />
                        </div>

                        {section.items.map(item => {
                            console.log('DEBUG: Rendering Item:', item.label, item); // Debug item props
                            return (
                                <div key={item.id} className="group bg-white border-2 border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:border-green-500 transition-all shadow-sm">
                                    <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                                        <GripVertical size={16} />
                                    </div>
                                    <div className="flex-1 cursor-pointer" onClick={() => { setEditingItem({ item, category: section.section_name }); setShowItemModal(true); }}>
                                        <h4 className="text-xs font-black uppercase text-slate-800">{item.label}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                {item.default_charge_type === 'Hora' ? <Clock size={10} /> : <DollarSign size={10} />}
                                                {item.default_charge_type}
                                            </span>
                                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                                                R$ {item.default_price}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => item.id && handleDeleteItem(item.id)}
                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* FAB Add Item */}
            <button
                onClick={() => { setEditingItem(null); setShowItemModal(true); }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all border-4 border-white z-50"
            >
                <Plus size={24} />
            </button>

            {/* Modal */}
            <ItemEditorModal
                isOpen={showItemModal}
                onClose={() => setShowItemModal(false)}
                onSave={onUpdate}
                templateId={template.id}
                item={editingItem?.item}
            />
        </div>
    );
};

// ===================== MAIN MANAGER =====================
const TemplateManager: React.FC<TemplateManagerProps> = ({ onClose }) => {
    const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    const loadTemplates = async () => {
        setLoading(true);
        const data = await dataProvider.getTemplates(false); // Fetch all, including inactive
        setTemplates(data);
        setLoading(false);

        // Refresh selected if open
        if (selectedTemplate) {
            const updated = data.find(t => t.id === selectedTemplate.id);
            if (updated) setSelectedTemplate(updated);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const handleCreateNew = async () => {
        const name = prompt('Nome do novo modelo:');
        if (name) {
            await dataProvider.addTemplate(name, true);
            loadTemplates();
        }
    };

    if (selectedTemplate) {
        return (
            <TemplateEditor
                template={selectedTemplate}
                onBack={() => setSelectedTemplate(null)}
                onUpdate={loadTemplates}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
            {/* Header */}
            <div className="p-6 pb-2 pt-8 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black uppercase text-slate-900 tracking-tighter">Modelos de Ficha</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Checklists</p>
                </div>
                <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 shadow-sm border border-slate-100 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* List */}
            <div className="px-6 py-6 pb-32 space-y-4 overflow-y-auto flex-1">
                {templates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all group relative overflow-hidden ${t.active ? 'bg-white border-slate-100 hover:border-green-500 shadow-sm hover:shadow-md' : 'bg-slate-100 border-transparent opacity-70'}`}
                    >
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <h3 className={`text-sm font-black uppercase tracking-tight ${t.active ? 'text-slate-800' : 'text-slate-500'}`}>{t.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                                    {t.sections.reduce((acc, s) => acc + s.items.length, 0)} Itens • {t.sections.length} Categorias
                                </p>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${t.active ? 'bg-slate-50 text-slate-300 group-hover:bg-green-500 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
                                <ChevronRight size={20} />
                            </div>
                        </div>
                        {t.active && <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none text-green-500"><FileText size={80} /></div>}
                    </button>
                ))}

                <button
                    onClick={handleCreateNew}
                    className="w-full p-6 rounded-[2rem] border-2 border-dashed border-slate-300 text-slate-400 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 transition-all"
                >
                    <Plus size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Criar Novo Modelo</span>
                </button>
            </div>
        </div>
    );
};

export default TemplateManager;
