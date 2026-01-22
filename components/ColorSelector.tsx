
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Palette, Check, Loader2 } from 'lucide-react';
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
    placeholder = 'Selecione a cor...'
}) => {
    const [colors, setColors] = useState<VehicleColor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await dataProvider.getColors();
                // Sort alphabetically by name
                const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
                setColors(sorted);
            } catch (e) {
                console.error('Failed to load colors', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
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

    // Find selected color object for display
    const selectedColor = colors.find(c => c.name.toLowerCase() === value.toLowerCase()) ||
        (value ? { name: value, hex: '#cccccc' } : null); // Fallback for custom/legacy colors

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-[1.5rem] text-left transition-all hover:bg-slate-100"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {selectedColor ? (
                        <>
                            <div
                                className="w-6 h-6 rounded-full border border-slate-200 shadow-sm shrink-0"
                                style={{ backgroundColor: selectedColor.hex || '#ccc' }}
                            />
                            <span className="text-sm font-black uppercase text-slate-800 truncate">
                                {selectedColor.name}
                            </span>
                        </>
                    ) : (
                        <>
                            <div className="w-6 h-6 rounded-full border border-slate-200 bg-slate-200 shrink-0" />
                            <span className="text-sm font-bold text-slate-400 uppercase truncate">
                                {isLoading ? 'Carregando cores...' : placeholder}
                            </span>
                        </>
                    )}
                </div>

                {isLoading ? (
                    <Loader2 size={18} className="text-slate-400 animate-spin" />
                ) : (
                    <ChevronDown
                        size={18}
                        className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                )}
            </button>

            {isOpen && !isLoading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 grid grid-cols-1 gap-1">
                        {colors.map(color => (
                            <button
                                key={color.id}
                                type="button"
                                onClick={() => {
                                    onChange(color.name);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${value === color.name
                                        ? 'bg-green-50 text-green-900'
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

                        {colors.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase">
                                Nenhuma cor encontrada
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorSelector;
