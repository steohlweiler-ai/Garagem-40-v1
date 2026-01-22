
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Loader2, Plus, Palette } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { VehicleColor } from '../types';

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

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync searchTerm with external value on mount or change
    useEffect(() => {
        if (value && !isOpen) {
            setSearchTerm(value);
        }
    }, [value, isOpen]);

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
            <div
                className="relative group bg-slate-50 border-2 border-transparent focus-within:border-green-500 focus-within:bg-white rounded-[1.5rem] transition-all flex items-center"
            >
                <div className="pl-4 pr-2 shrink-0">
                    {value ? (
                        <div
                            className="w-6 h-6 rounded-full border border-slate-200 shadow-sm"
                            style={{ backgroundColor: selectedHex }}
                        />
                    ) : (
                        <Palette className="text-slate-300" size={20} />
                    )}
                </div>

                <input
                    type="text"
                    className="w-full py-4 px-2 bg-transparent text-sm font-black uppercase text-slate-800 outline-none placeholder:text-slate-400"
                    placeholder={placeholder}
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

            {isOpen && !isLoading && (
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
