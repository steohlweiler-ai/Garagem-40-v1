import React, { useState, useEffect } from 'react';
import { DollarSign, Save, CheckCircle2 } from 'lucide-react';
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

    // Display values state (string representation for inputs)
    const [displayValues, setDisplayValues] = useState({
        chapeacao: '',
        pintura: '',
        mecanica: ''
    });

    // Helper to format number to pt-BR string (1.000,00)
    const formatValue = (val?: number) => {
        if (val === undefined || val === null) return '0,00';
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Helper to parse pt-BR string to number
    const parseValue = (val: string) => {
        // Remove thousands separators (.), replace decimal separator (,) with (.)
        const clean = val.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    // Load initial settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await dataProvider.getWorkshopSettings();
                setSettings(data);
                if (data) {
                    setDisplayValues({
                        chapeacao: formatValue(data.valor_hora_chapeacao),
                        pintura: formatValue(data.valor_hora_pintura),
                        mecanica: formatValue(data.valor_hora_mecanica)
                    });
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
                setToast({ message: "Erro ao carregar configurações.", type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleChange = (field: 'chapeacao' | 'pintura' | 'mecanica', value: string) => {
        // Allow user to type freely, just filter invalid chars mostly
        // Logic: Allow numbers, dots and commas.
        // We only update the display value here. We verify/parse on blur or implicitly

        // Simple regex to allow currency-like typing
        if (!/^[0-9.,]*$/.test(value)) return;

        setDisplayValues(prev => ({ ...prev, [field]: value }));
    };

    const handleBlur = (field: 'chapeacao' | 'pintura' | 'mecanica', settingField: keyof WorkshopSettings) => {
        if (!settings) return;

        // Parse and re-format
        const rawVal = displayValues[field];
        const numVal = parseValue(rawVal);
        const formatted = formatValue(numVal);

        setDisplayValues(prev => ({ ...prev, [field]: formatted }));

        // Update actual settings state
        setSettings({
            ...settings,
            [settingField]: numVal
        });

        // Auto-save on blur? The user requested "Save on blur"? 
        // "Opção A: Um Toast 'Salvo com sucesso' ao sair do campo (onBlur)." - implied auto-save or just feedback?
        // Usually explicit save is safer, but let's trigger handleSave if value changed.
        // To avoid excessive saves, we could check if it changed.

        if (settings[settingField] !== numVal) {
            // We need to update settings state first which is async-ish, 
            // but here we can just call save with the new value directly to be safe.
            saveSingleField(settingField, numVal);
        }
    };

    const saveSingleField = async (field: keyof WorkshopSettings, value: number) => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await dataProvider.updateWorkshopSettings({
                id: settings.id, // CRITICAL: Pass the ID
                [field]: value
            });
            setToast({ message: "Salvo!", type: 'success' });
            setTimeout(() => setToast(null), 2000);
        } catch (error) {
            console.error("Failed to save:", error);
            setToast({ message: "Erro ao salvar.", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    }

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            // Update all from current display values to be sure
            const chapeacao = parseValue(displayValues.chapeacao);
            const pintura = parseValue(displayValues.pintura);
            const mecanica = parseValue(displayValues.mecanica);

            await dataProvider.updateWorkshopSettings({
                id: settings.id,
                valor_hora_chapeacao: chapeacao,
                valor_hora_pintura: pintura,
                valor_hora_mecanica: mecanica
            });
            setToast({ message: "Valores atualizados com sucesso!", type: 'success' });
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
            key: "chapeacao" as const,
            settingField: "valor_hora_chapeacao" as keyof WorkshopSettings,
            color: "text-blue-600",
            borderColor: "focus:border-blue-500",
            bgGradient: "from-blue-50 to-white"
        },
        {
            title: "Pintura",
            key: "pintura" as const,
            settingField: "valor_hora_pintura" as keyof WorkshopSettings,
            color: "text-purple-600",
            borderColor: "focus:border-purple-500",
            bgGradient: "from-purple-50 to-white"
        },
        {
            title: "Mecânica",
            key: "mecanica" as const,
            settingField: "valor_hora_mecanica" as keyof WorkshopSettings,
            color: "text-amber-600",
            borderColor: "focus:border-amber-500",
            bgGradient: "from-amber-50 to-white"
        }
    ];

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <DollarSign size={20} />}
                    <span className="font-bold">{toast.message}</span>
                </div>
            )}

            <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-black uppercase text-slate-800 tracking-tight">Mão de Obra</h2>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Defina o valor da hora técnica</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div key={card.title} className="relative group">
                        <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${card.bgGradient} opacity-50 shadow-lg border border-slate-100 transition-all group-hover:scale-[1.02] group-hover:shadow-xl`}></div>

                        <div className="relative p-8 flex flex-col items-center text-center space-y-4">
                            <h3 className={`text-lg font-black uppercase tracking-wider ${card.color}`}>
                                {card.title}
                            </h3>

                            <div className="relative w-full max-w-[180px]">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl select-none">R$</div>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={displayValues[card.key]}
                                    onChange={(e) => handleChange(card.key, e.target.value)}
                                    onBlur={() => handleBlur(card.key, card.settingField)}
                                    onFocus={(e) => e.target.select()}
                                    className={`w-full bg-transparent text-center text-4xl font-black text-slate-800 outline-none border-b-2 border-slate-200 py-2 pl-8 pr-8 transition-all ${card.borderColor} focus:border-opacity-100 placeholder-slate-200`}
                                    placeholder="0,00"
                                />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs uppercase tracking-widest select-none">/h</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Salvar Alterações
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default RatesSettings;
