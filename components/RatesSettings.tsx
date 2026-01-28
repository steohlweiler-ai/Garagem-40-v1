import React, { useState, useEffect } from 'react';
import { DollarSign, Save, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
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
    const [hasChanges, setHasChanges] = useState(false);

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

    // Helper to parse pt-BR string to number with STRICT sanitization
    const parseValue = (val: string) => {
        if (!val) return 0;
        // Remova "R$", espaços e pontos de milhar
        const cleaned = val.replace(/R\$/g, '').replace(/\./g, '').replace(/\s/g, '');
        // Substitua a vírgula decimal por ponto
        const withDot = cleaned.replace(',', '.');
        const num = parseFloat(withDot);
        return isNaN(num) ? 0 : num;
    };

    // Load initial settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await dataProvider.getWorkshopSettings();
                console.log("Loaded Settings:", data);
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
        // Simple regex to allow currency-like typing
        // Note: Allowing more flexible typing locally, assuming validation on blur/save
        setDisplayValues(prev => ({ ...prev, [field]: value }));
        setHasChanges(true); // Mark as dirty
    };

    const handleBlur = (field: 'chapeacao' | 'pintura' | 'mecanica') => {
        // Parse and re-format just for display consistency
        const rawVal = displayValues[field];
        const numVal = parseValue(rawVal);
        const formatted = formatValue(numVal);
        setDisplayValues(prev => ({ ...prev, [field]: formatted }));
    };

    const handleBack = async () => {
        if (!hasChanges) {
            onClose();
            return;
        }

        if (window.confirm("Existem alterações não salvas. Deseja salvar antes de sair?")) {
            const success = await handleSave();
            if (success) {
                // handleSave already closes on success? 
                // The user requirement said: "Se Confirmar (Sim): Chame handleSave() (que já vai salvar e sair)."
                // So we don't need to do anything else if it returns true/void.
                // But handleSave is async.
            }
        } else {
            // User cancelled saving, so discard changes and exit
            onClose();
        }
    };

    const handleSave = async (): Promise<boolean> => {
        if (!settings || !settings.id) {
            console.error("Critical: No Settings ID found!", settings);
            setToast({ message: "Erro: ID não encontrado.", type: 'error' });
            return false;
        }

        setIsSaving(true);

        const chapeacao = parseValue(displayValues.chapeacao);
        const pintura = parseValue(displayValues.pintura);
        const mecanica = parseValue(displayValues.mecanica);

        const payload = {
            id: settings.id,
            valor_hora_chapeacao: chapeacao,
            valor_hora_pintura: pintura,
            valor_hora_mecanica: mecanica
        };

        console.log('Payload enviado:', payload);

        try {
            const success = await dataProvider.updateWorkshopSettings(payload);
            if (!success) throw new Error("Update returned false"); // DataProvider sometimes returns boolean

            setToast({ message: "Salvo com sucesso!", type: 'success' });
            setHasChanges(false);

            // "Salvar e Sair" behavior
            setTimeout(() => {
                onClose();
            }, 500);

            return true;
        } catch (error) {
            console.error("Erro Supabase:", error);
            setToast({ message: "Erro ao salvar alterações.", type: 'error' });
            return false;
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
            field: "valor_hora_chapeacao",
            color: "text-blue-600",
            borderColor: "focus:border-blue-500",
            bgGradient: "from-blue-50 to-white"
        },
        {
            title: "Pintura",
            key: "pintura" as const,
            field: "valor_hora_pintura",
            color: "text-purple-600",
            borderColor: "focus:border-purple-500",
            bgGradient: "from-purple-50 to-white"
        },
        {
            title: "Mecânica",
            key: "mecanica" as const,
            field: "valor_hora_mecanica",
            color: "text-amber-600",
            borderColor: "focus:border-amber-500",
            bgGradient: "from-amber-50 to-white"
        }
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Custom Header with Back Button */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-3 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition-all hover:bg-slate-200"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h3 className="text-sm sm:text-lg font-bold uppercase text-slate-800">
                        Mão de Obra
                    </h3>
                </div>
                {hasChanges && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 animate-in fade-in">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Não salvo</span>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <DollarSign size={20} />}
                    <span className="font-bold">{toast.message}</span>
                </div>
            )}

            <div className="text-center space-y-2 mb-8 hidden">
                {/* Hidden title in favor of header */}
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
                                    // Removed auto-save on blur, now only formatting
                                    onBlur={() => handleBlur(card.key)}
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
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${hasChanges ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                        }`}
                >
                    {isSaving ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Salvar e Sair
                        </>
                    )}
                </button>
            </div>

            <div className="text-center text-slate-400 text-xs mt-4">
                {hasChanges ? "Lembre-se de salvar suas alterações." : "Todas as alterações foram salvas."}
            </div>
        </div>
    );
};

export default RatesSettings;
