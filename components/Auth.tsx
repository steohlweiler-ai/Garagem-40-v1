import React, { useState } from 'react';
import { Car as CarIcon, Mail, Lock, User, Briefcase, ChevronRight, LogIn } from 'lucide-react';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';

interface AuthProps {
  onLogin: (userData: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // const [workshopName, setWorkshopName] = useState(''); // Removed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // @ts-ignore
    const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
    if (USE_MOCK) {
      setTimeout(() => {
        const generatedName = 'Oficina de ' + email.split('@')[0];
        // Note que no Mock você usava 'role', confirmando que o App espera isso
        onLogin({ email, name: mode === 'register' ? generatedName : 'Usuário Mock', role: 'admin' });
        setLoading(false);
      }, 500);
      return;
    }

    try {
      if (mode === 'login') {
        // --- FLUXO DE LOGIN ---
        const { user, error: authError } = await authService.signInWithPassword(email, password);

        if (authError) throw authError;
        if (!user) throw new Error('Erro ao autenticar');

        // Busca o perfil no Supabase
        const profile = await profileService.getProfileByUserId(user.id);
        console.log('Profile loaded:', profile);

        if (profile) {
          onLogin(profile);
        } else {
          // Fallback: Se não existir perfil, tenta criar
          const newProfile = await profileService.ensureUserProfile(user);
          console.log('New Profile created:', newProfile);

          if (newProfile) {
            onLogin(newProfile);
          } else {
            throw new Error('Perfil de usuário não encontrado.');
          }
        }

      } else {
        // --- FLUXO DE CADASTRO ---
        if (password !== confirmPassword) {
          throw new Error('As senhas não conferem.');
        }

        const generatedName = 'Oficina de ' + email.split('@')[0];
        const { user, error: signUpError } = await authService.signUp(email, password, { name: generatedName });

        if (signUpError) throw signUpError;
        if (!user) throw new Error('Erro ao criar conta');

        // Cria o perfil imediatamente
        const profile = await profileService.ensureUserProfile(user, { name: generatedName });
        if (profile) {
          console.log('Registered Profile:', profile);
          onLogin(profile);
        } else {
          throw new Error('Conta criada, mas erro ao gerar perfil.');
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || 'Erro desconhecido ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Placeholder para futura integração OAuth
    console.log("Iniciando login com Google...");
    // onLogin({ email: 'google-user@gmail.com', name: 'Google User' });
    alert("Login com Google requer configuração OAuth no Supabase. Use Email/Senha por enquanto.");
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
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
              }`}
          >
            <LogIn size={14} /> Entrar
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
              }`}
          >
            <User size={14} /> Criar Conta
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wide rounded-xl border border-red-100 flex items-center justify-center text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

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
            disabled={loading}
            className={`w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-green-100 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processando...' : (mode === 'login' ? 'Entrar no Sistema' : 'Criar minha Conta')}
            {!loading && <ChevronRight size={18} />}
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
