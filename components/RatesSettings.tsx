import React, { useState, useEffect } from 'react';
import { DollarSign, Save } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { WorkshopSettings } from '../types';

interface RatesSettingsProps {
    onClose: () => void;
}

const RatesSettings: React.FC<RatesSettingsProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<WorkshopSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Load initial settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await dataProvider.getWorkshopSettings();
                setSettings(data);
            } catch (error) {
                console.error("Failed to load settings:", error);
                setToast({ message: "Erro ao carregar configurações.", type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleChange = (field: keyof WorkshopSettings, value: string) => {
        if (!settings) return;
        // Allow empty string for better UX while typing, but convert to number on save
        const numValue = parseFloat(value);

        setSettings({
            ...settings,
            [field]: isNaN(numValue) ? 0 : numValue
        });
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await dataProvider.updateWorkshopSettings({
                valor_hora_chapeacao: settings.valor_hora_chapeacao,
                valor_hora_pintura: settings.valor_hora_pintura,
                valor_hora_mecanica: settings.valor_hora_mecanica
            });
            setToast({ message: "Valores atualizados com sucesso!", type: 'success' });

            // Clear toast after 3 seconds
            setTimeout(() => setToast(null), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setToast({ message: "Erro ao salvar alterações.", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-10 text-center text-slate-400">Carregando...</div>;
    }

    const cards = [
        {
            title: "Chapeação",
            field: "valor_hora_chapeacao",
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "focus:border-blue-500"
        },
        {
            title: "Pintura",
            field: "valor_hora_pintura",
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            borderColor: "focus:border-purple-500"
        },
        {
            title: "Mecânica",
            field: "valor_hora_mecanica",
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            borderColor: "focus:border-amber-500"
        }
    ];

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header / Toast Area */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.type === 'success' ? <Save size={20} /> : <DollarSign size={20} />}
                    <span className="font-bold">{toast.message}</span>
                </div>
            )}

            <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-black uppercase text-slate-800 tracking-tight">Mão de Obra</h2>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Defina o valor da hora técnica por especialidade</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div key={card.title} className="relative group">
                        <div className={`absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white to-slate-50 opacity-100 shadow-xl border-2 border-slate-100 transition-all group-hover:scale-[1.02] group-hover:shadow-2xl`}></div>

                        <div className="relative p-8 flex flex-col items-center text-center space-y-6">
                            <h3 className={`text-xl font-black uppercase tracking-wider ${card.color}`}>
                                {card.title}
                            </h3>

                            <div className="relative w-full max-w-[160px]">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xl select-none">R$</div>
                                <input
                                    type="number"
                                    value={settings ? (settings[card.field as keyof WorkshopSettings] as number) || 0 : 0}
                                    onChange={(e) => handleChange(card.field as keyof WorkshopSettings, e.target.value)}
                                    // Handle save on blur
                                    onBlur={handleSave}
                                    className={`w-full bg-transparent text-center text-4xl font-black text-slate-800 outline-none border-b-2 border-slate-200 py-2 transition-all ${card.borderColor} focus:border-opacity-100`}
                                />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs uppercase tracking-widest select-none">/hora</div>
                            </div>

                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.bgColor} ${card.color} shadow-inner`}>
                                <DollarSign size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                >
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </div>
    );
};

export default RatesSettings;
