
import React, { useState } from 'react';
import { User, Mail, Shield, Smartphone, Key, Check, Lock, AlertCircle } from 'lucide-react';
import { UserAccount } from '../types';
import { authService } from '../services/authService';

interface ProfileTabProps {
  user: UserAccount;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user }) => {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setErrorMsg('As senhas não coincidem');
      setStatus('error');
      return;
    }
    if (passwords.new.length < 6) {
      setErrorMsg('Senha deve ter no mínimo 6 caracteres');
      setStatus('error');
      return;
    }

    // Submit to Supabase
    try {
      const { error } = await authService.updatePassword(passwords.new);
      if (error) {
        setErrorMsg('Erro ao atualizar senha: ' + error.message);
        setStatus('error');
      } else {
        setStatus('success');
        setPasswords({ current: '', new: '', confirm: '' });
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (e) {
      setErrorMsg('Erro inesperado ao atualizar senha.');
      setStatus('error');
    }
  };

  // 3. Loading State (Skeleton) - If user object is totally missing or empty (unlikely with auth, but possible in transit)
  if (!user) {
    return (
      <div className="space-y-8 animate-in fade-in pb-20">
        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-slate-100 rounded-[2rem] animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-4 w-20 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Dados do Usuário */}
      <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-green-500 shadow-xl">
            <User size={40} />
          </div>
          <div>
            {/* 1. Optional Chaining on nested properties (if UserAccount had them, e.g. address) and simple properties */}
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">
              {user?.name ?? 'Usuário'}
            </h2>
            <span className="inline-block mt-2 px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100">
              {/* 2. Nullish Coalescing fallback */}
              Nível: {user?.role?.toUpperCase() ?? 'USUÁRIO'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Mail size={18} className="text-slate-400" />
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">E-mail de acesso</p>
              <p className="text-sm font-bold text-slate-700">{user?.email ?? 'Sem e-mail'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Smartphone size={18} className="text-slate-400" />
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
              {/* Fallback to prevent uncontrolled input/display issues if prop passed to input */}
              <p className="text-sm font-bold text-slate-700">{user?.phone ?? 'Sem telefone'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Key size={20} />
          </div>
          <h3 className="text-base font-black uppercase tracking-tight text-slate-800">Segurança da Conta</h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Senha Atual</label>
            <div className="relative">
              <input
                type="password"
                required
                value={passwords.current ?? ''}
                onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold transition-all outline-none"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nova Senha</label>
              <input
                type="password"
                required
                value={passwords.new ?? ''}
                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-bold transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                value={passwords.confirm ?? ''}
                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-bold transition-all outline-none"
              />
            </div>
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl animate-in shake-1 duration-300">
              <AlertCircle size={16} />
              <p className="text-[10px] font-black uppercase tracking-widest">{errorMsg}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-xl animate-in zoom-in">
              <Check size={16} />
              <p className="text-[10px] font-black uppercase tracking-widest">Senha alterada com sucesso!</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-5 bg-slate-900 text-white rounded-[1.75rem] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Shield size={16} /> Atualizar Senha de Acesso
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileTab;
