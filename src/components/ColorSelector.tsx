
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Loader2, Plus, Palette, Mic, MicOff } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { VehicleColor } from '../types';
import { voiceManager, VoiceState } from '../services/voiceManager';
import { normalizeVoiceText } from '../utils/voiceNormalizer';
import { postProcessPunctuation } from '../utils/voicePunctuation';

interface ColorSelectorProps {
    value: string;
    onChange: (colorName: string) => void;
    className?: string;
    placeholder?: string;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
    value,
    onChange,
    className = '',
    placeholder = 'Selecione ou digite a cor...'
}) => {
    const [colors, setColors] = useState<VehicleColor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Voice State
    const [vState, setVState] = useState<VoiceState>(VoiceState.IDLE);
    const isSupported = voiceManager.isSupported();
    const isListening = vState === VoiceState.LISTENING || vState === VoiceState.STARTING;

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync searchTerm with external value on mount or change
    useEffect(() => {
        if (value && !isOpen && !isListening) {
            setSearchTerm(value);
        }
    }, [value, isOpen, isListening]);

    const loadColors = async () => {
        try {
            const data = await dataProvider.getColors();
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setColors(sorted);
        } catch (e) {
            console.error('Failed to load colors', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadColors();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Voice Handlers
    const handleStartVoice = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isSupported || voiceManager.getState() !== VoiceState.IDLE) return;

        if ('vibrate' in navigator) navigator.vibrate(40);

        voiceManager.start(
            (spokenRaw) => {
                // Apply rules
                const processed = postProcessPunctuation(spokenRaw);
                const normalized = normalizeVoiceText(processed, 'default');

                // Append or Replace? For autocomplete, Replace usually better if field was pseudo-empty, 
                // but let's assume dictation adds to it space-separated if existing. 
                // Actually for "search", usually we want to replace or refine. 
                // Let's replace for clarity in short command fields like Color.
                setSearchTerm(normalized);
                setIsOpen(true);
            },
            (err) => console.error(err),
            (newState) => setVState(newState)
        );
    };

    const handleStopVoice = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        voiceManager.stop();
    };


    // Filter logic
    const filteredColors = colors.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exactMatch = colors.find(c => c.name.toLowerCase() === searchTerm.toLowerCase());

    const handleCreateNewColor = async () => {
        if (!searchTerm) return;
        const newName = searchTerm.trim();

        // Optimistic Update
        const optimisticColor: VehicleColor = {
            id: 'temp-' + Date.now(),
            organization_id: 'org-def',
            name: newName,
            hex: '#CCCCCC',
            active: true
        };

        setColors(prev => [...prev, optimisticColor]);
        onChange(newName);
        setIsOpen(false);

        // Persist
        await dataProvider.addColor({
            name: newName,
            hex: '#CCCCCC',
            active: true
        });

        // Refetch to get real ID
        loadColors();
    };

    const selectedHex = colors.find(c => c.name.toLowerCase() === value.toLowerCase())?.hex || '#CCCCCC';

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div className="flex gap-2">
                <div
                    className={`relative group bg-slate-50 border-2 transition-all flex items-center rounded-[1.5rem] flex-1
            ${isListening ? 'border-green-300 ring-4 ring-green-50' : 'border-transparent focus-within:border-green-500 focus-within:bg-white'}
        `}
                >
                    <div className="pl-4 pr-2 shrink-0">
                        {value ? (
                            <div
                                className="w-6 h-6 rounded-full border border-slate-200 shadow-sm transition-transform active:scale-95"
                                style={{ backgroundColor: selectedHex }}
                            />
                        ) : (
                            <Palette className="text-slate-300" size={20} />
                        )}
                    </div>

                    <input
                        type="text"
                        className="w-full py-4 px-2 bg-transparent text-sm font-black uppercase text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder={isListening ? 'Ouvindo...' : placeholder}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onClick={() => setIsOpen(true)}
                    />

                    <div className="pr-4 shrink-0 text-slate-400">
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ChevronDown size={18} />}
                    </div>
                </div>

                {/* Voice Button Outside */}
                <button
                    type="button"
                    onMouseDown={handleStartVoice}
                    onMouseUp={handleStopVoice}
                    onTouchStart={handleStartVoice}
                    onTouchEnd={handleStopVoice}
                    className={`p-4 rounded-xl flex items-center justify-center shadow-xl transition-all active:scale-90 shrink-0 ${isListening
                        ? 'bg-red-500 text-white ring-4 ring-red-100'
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                        }`}
                    title="Segure para falar a cor"
                >
                    {isListening ? (
                        vState === VoiceState.STARTING ? <Loader2 size={24} className="animate-spin" /> : <MicOff size={24} />
                    ) : (
                        <Mic size={24} />
                    )}
                </button>
            </div>

            {isOpen && !isLoading && !isListening && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 grid grid-cols-1 gap-1">
                        {filteredColors.map(color => (
                            <button
                                key={color.id}
                                type="button"
                                onClick={() => {
                                    onChange(color.name);
                                    setSearchTerm(color.name);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${value === color.name
                                    ? 'bg-green-50 text-green-900 shadow-sm'
                                    : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                            >
                                <div
                                    className="w-8 h-8 rounded-lg border border-slate-200 shadow-sm shrink-0"
                                    style={{ backgroundColor: color.hex }}
                                />
                                <span className="flex-1 text-left text-xs font-black uppercase tracking-tight">
                                    {color.name}
                                </span>
                                {value === color.name && <Check size={16} className="text-green-600" />}
                            </button>
                        ))}

                        {searchTerm && !exactMatch && (
                            <button
                                onClick={handleCreateNewColor}
                                className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-green-50 text-green-700 border border-dashed border-green-200 mt-1"
                            >
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                    <Plus size={16} className="text-green-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase">Adicionar Nova Cor</p>
                                    <p className="text-sm font-black break-all">"{searchTerm}"</p>
                                </div>
                            </button>
                        )}

                        {filteredColors.length === 0 && !searchTerm && (
                            <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase">
                                Digite para buscar...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorSelector;
