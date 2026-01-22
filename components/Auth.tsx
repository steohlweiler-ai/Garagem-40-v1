import React, { useState } from 'react';
import { Car as CarIcon, Mail, Lock, User, Briefcase, ChevronRight, LogIn } from 'lucide-react';

interface AuthProps {
  onLogin: (userData: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [workshopName, setWorkshopName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulação de autenticação
    onLogin({ email, name: mode === 'register' ? workshopName : 'Usuário' });
  };

  const handleGoogleLogin = () => {
    // Placeholder para futura integração OAuth
    console.log("Iniciando login com Google...");
    onLogin({ email: 'google-user@gmail.com', name: 'Google User' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      {/* Topo / Logo */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="w-20 h-20 bg-green-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-green-100 rotate-3 transition-transform hover:rotate-0">
          <CarIcon size={40} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">
            GARAGEM<span className="text-green-600">40</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[3px] mt-2">
            Sistema de gestão de veículos
          </p>
        </div>
      </div>

      {/* Card de Autenticação */}
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        
        {/* Abas */}
        <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
          <button 
            onClick={() => setMode('login')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
              mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
            }`}
          >
            <LogIn size={14} /> Entrar
          </button>
          <button 
            onClick={() => setMode('register')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
              mode === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
            }`}
          >
            <User size={14} /> Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Oficina</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  placeholder="Minha Oficina Mecânica"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none"
                />
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none"
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            </div>
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl text-sm font-bold transition-all outline-none"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>
          )}

          <button 
            type="submit"
            className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-green-100 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
          >
            {mode === 'login' ? 'Entrar no Sistema' : 'Criar minha Conta'}
            <ChevronRight size={18} />
          </button>
        </form>

        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <span className="relative bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-600 flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-slate-50"
        >
          <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-5 h-5" alt="Google" />
          {mode === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'}
        </button>
      </div>

      <p className="mt-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center opacity-60">
        © 2024 Garagem 40. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default Auth;
