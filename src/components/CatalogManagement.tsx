
import React, { useState, useEffect } from 'react';
import { Car, Plus, Search, Trash2, Edit2, X, Check, Briefcase } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { CatalogItem } from '../types';
import VoiceInput from './VoiceInput';

const CatalogManagement: React.FC = () => {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    brand: '',
    model: ''
  });

  const loadCatalog = async () => {
    const data = await dataProvider.getCatalog();
    setCatalog(data);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenModal = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ brand: item.brand, model: item.model });
    } else {
      setEditingItem(null);
      setFormData({ brand: '', model: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.brand || !formData.model) return;
    if (editingItem) {
      await dataProvider.updateCatalogItem(editingItem.id, formData);
      showToast('Veículo atualizado!');
    } else {
      await dataProvider.addToCatalog(formData.brand, formData.model);
      showToast('Novo veículo adicionado!');
    }
    setIsModalOpen(false);
    loadCatalog();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este modelo do catálogo?')) {
      await dataProvider.deleteCatalogItem(id);
      loadCatalog();
      showToast('Item removido');
    }
  };

  const filteredCatalog = catalog.filter(c =>
    c.brand.toLowerCase().includes(search.toLowerCase()) ||
    c.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <Check className="text-green-500" size={18} /> {toast}
        </div>
      )}

      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-green-500 shadow-lg">
            <Briefcase size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Marcas & Modelos</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Catálogo de sugestões do sistema</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="p-4 bg-green-600 text-white rounded-2xl shadow-xl shadow-green-100 active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="relative mx-1">
        <VoiceInput
          multiline={false}
          value={search}
          onTranscript={setSearch}
          placeholder="Buscar marca ou modelo..."
          className="!pl-12 !py-4 !bg-slate-100 !border-transparent !rounded-[1.75rem] !text-sm !font-bold"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredCatalog.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm flex items-center justify-between group transition-all hover:border-green-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-green-600 transition-colors">
                <Car size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase text-slate-800 tracking-tight leading-none">{item.model}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{item.brand}</p>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-300 hover:text-green-600 active:scale-110 transition-all"><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 active:scale-110 transition-all"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">{editingItem ? 'Editar Cadastro' : 'Novo Cadastro'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90"><X size={20} /></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Marca</label>
                <VoiceInput
                  multiline={false}
                  value={formData.brand}
                  onTranscript={v => setFormData({ ...formData, brand: v })}
                  placeholder="Ex: Toyota"
                  className="!uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Modelo</label>
                <VoiceInput
                  multiline={false}
                  value={formData.model}
                  onTranscript={v => setFormData({ ...formData, model: v })}
                  placeholder="Ex: Corolla Cross"
                  className="!uppercase"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button onClick={handleSave} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Salvar Item</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogManagement;
