
import React, { useState, useEffect } from 'react';
import { Palette, Plus, Search, Trash2, Edit2, X, Check } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { VehicleColor } from '../types';
import VoiceInput from './VoiceInput';

const ColorManagement: React.FC = () => {
  const [colors, setColors] = useState<VehicleColor[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<VehicleColor | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    hex: '#000000'
  });

  const loadColors = async () => {
    const data = await dataProvider.getColors();
    setColors(data);
  };
  useEffect(() => { loadColors(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenModal = (color?: VehicleColor) => {
    if (color) {
      setEditingColor(color);
      setFormData({ name: color.name, hex: color.hex });
    } else {
      setEditingColor(null);
      setFormData({ name: '', hex: '#000000' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    if (editingColor) {
      await dataProvider.updateColor(editingColor.id, formData);
      showToast('Cor atualizada!');
    } else {
      await dataProvider.addColor(formData);
      showToast('Nova cor adicionada!');
    }
    setIsModalOpen(false);
    loadColors();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta cor?')) {
      await dataProvider.deleteColor(id);
      loadColors();
      showToast('Cor removida');
    }
  };

  const filteredColors = colors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
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
            <Palette size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cores de Veículos</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Catálogo de cores da oficina</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-14 h-14 bg-green-600 text-white rounded-2xl shadow-xl shadow-green-100 active:scale-90 transition-all flex items-center justify-center"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="relative mx-1">
        <VoiceInput
          multiline={false}
          value={search}
          onTranscript={setSearch}
          placeholder="Buscar cor..."
          className="!pl-12 !py-4 !bg-slate-100 !border-transparent !rounded-[1.75rem] !text-sm !font-bold"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredColors.map(color => (
          <div key={color.id} className="bg-white p-4 rounded-[2.25rem] border-2 border-slate-50 shadow-sm flex flex-col items-center gap-3 group relative overflow-hidden transition-all hover:border-green-200">
            <div
              className="w-16 h-16 rounded-2xl shadow-inner border border-slate-100"
              style={{ backgroundColor: color.hex }}
            />
            <div className="text-center w-full px-2">
              <p className="text-[10px] font-black uppercase text-slate-800 truncate">{color.name}</p>
              <p className="text-[8px] font-mono text-slate-400 mt-1 uppercase tracking-tighter">{color.hex}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleOpenModal(color)} className="p-3 touch-target text-slate-300 hover:text-green-600 active:scale-110 transition-all"><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(color.id)} className="p-3 touch-target text-slate-300 hover:text-red-500 active:scale-110 transition-all"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">{editingColor ? 'Editar Cor' : 'Nova Cor'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-100 rounded-full text-slate-400 active:scale-90 touch-target transition-all"><X size={20} /></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nome da Cor</label>
                <VoiceInput
                  multiline={false}
                  value={formData.name}
                  onTranscript={v => setFormData({ ...formData, name: v })}
                  placeholder="Ex: Prata Metálico"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Código Hexadecimal</label>
                <div className="flex gap-4">
                  <input
                    type="color"
                    value={formData.hex}
                    onChange={e => setFormData({ ...formData, hex: e.target.value.toUpperCase() })}
                    className="w-20 h-16 rounded-2xl border-2 border-slate-100 bg-white p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.hex}
                    onChange={e => setFormData({ ...formData, hex: e.target.value.toUpperCase() })}
                    className="flex-1 p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-black outline-none font-mono"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button onClick={handleSave} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Salvar Cor</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorManagement;
