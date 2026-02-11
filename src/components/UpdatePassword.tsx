import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, ArrowLeft, KeyRound } from 'lucide-react';
import { supabase } from '../services/supabaseService';

interface UpdatePasswordProps {
    onComplete: () => void;
    onBack: () => void;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onComplete, onBack }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const isValid = password.length >= 6 && password === confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValid) {
            setError('As senhas devem coincidir e ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                setError(updateError.message);
                setLoading(false);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (err) {
            setError('Erro ao atualizar senha. Tente novamente.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Check size={40} className="text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Senha Atualizada!</h2>
                        <p className="text-sm text-slate-500 mt-2">Redirecionando para o sistema...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] p-8 max-w-md w-full space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                        <KeyRound size={32} className="text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Definir Nova Senha</h1>
                        <p className="text-xs text-slate-400 mt-2 uppercase tracking-wider">Escolha uma senha segura para sua conta</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nova Senha</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-slate-800 font-bold text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100 transition-all pr-12"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confirmar Senha</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Digite novamente"
                                className={`w-full bg-slate-50 border-2 rounded-2xl px-4 py-4 text-slate-800 font-bold text-sm focus:outline-none transition-all pr-12 ${confirmPassword.length > 0 && password !== confirmPassword
                                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                        : 'border-slate-100 focus:border-amber-300 focus:ring-amber-100'
                                    } focus:ring-4`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && password !== confirmPassword && (
                            <p className="text-red-500 text-xs font-medium">Senhas não coincidem</p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || loading}
                            className="flex-[2] py-4 bg-amber-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <>
                                    <Lock size={16} /> Definir Senha
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
