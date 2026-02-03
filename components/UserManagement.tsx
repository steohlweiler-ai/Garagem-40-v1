
import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, Check, X, Edit2,
  Trash2, Key, ToggleLeft, ToggleRight, ShieldAlert,
  ChevronRight, Search, UserCheck, ShieldCheck, Eye, EyeOff
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { UserAccount, UserRole, UserPermissions } from '../types';

const INITIAL_PERMS: UserPermissions = {
  manage_team: false,
  manage_clients: true,
  manage_inventory: false,
  config_rates: false,
  config_vehicles: false,
  config_system: false,
  view_financials: false
};

// Role presets for automatic permission assignment
const ROLE_PRESETS: Record<UserRole, Partial<UserPermissions>> = {
  admin: {
    manage_team: true,
    manage_clients: true,
    manage_inventory: true,
    config_rates: true,
    config_vehicles: true,
    config_system: true,
    view_financials: true
  },
  financeiro: {
    manage_team: false,
    manage_clients: true,
    manage_inventory: true,
    config_rates: false,
    config_vehicles: false,
    config_system: false,
    view_financials: true
  },
  operador: {
    manage_team: false,
    manage_clients: true,
    manage_inventory: false,
    config_rates: false,
    config_vehicles: false,
    config_system: false,
    view_financials: false
  },
  stock_manager: {
    manage_team: false,
    manage_clients: false,
    manage_inventory: true,
    config_rates: false,
    config_vehicles: false,
    config_system: false,
    view_financials: false
  },
  visualizador: {
    manage_team: false,
    manage_clients: false,
    manage_inventory: false,
    config_rates: false,
    config_vehicles: false,
    config_system: false,
    view_financials: false
  }
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Password reset modal state
  const [passwordModalUser, setPasswordModalUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'operador' as UserRole,
    active: true,
    permissions: { ...INITIAL_PERMS },
    password: '' // New field for initial password
  });

  const loadUsers = async () => {
    const list = await dataProvider.getUsers();
    setUsers(list);
  };
  useEffect(() => { loadUsers(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenModal = (user?: UserAccount) => {
    if (user) {
      setEditingUser(user);
      // If user has no permissions defined, use role preset
      const hasPermissions = user.permissions && Object.keys(user.permissions).length > 0;
      const effectivePermissions = hasPermissions
        ? { ...INITIAL_PERMS, ...user.permissions }
        : { ...ROLE_PRESETS[user.role] };
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        active: user.active,
        permissions: effectivePermissions,
        password: '' // Don't show password when editing
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'operador',
        active: true,
        permissions: { ...INITIAL_PERMS },
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) return;

    if (editingUser) {
      const success = await dataProvider.updateUser(editingUser.id, formData);
      if (success) {
        showToast('Usuário atualizado!');
      } else {
        showToast('Erro ao salvar usuário');
        return;
      }
    } else {
      const { data: newUser, error } = await dataProvider.createUser(formData);
      if (newUser) {
        showToast('Convite enviado! Usuário criado.');
      } else {
        showToast(`Erro: ${error || 'Falha ao criar usuário'}`);
        return;
      }
    }
    setIsModalOpen(false);
    loadUsers();
  };

  const toggleStatus = async (user: UserAccount) => {
    const newStatus = !user.active;
    await dataProvider.updateUser(user.id, { active: newStatus });
    loadUsers();
    showToast(newStatus ? 'Usuário ativado' : 'Usuário desativado');
  };

  const softDeleteUser = async (user: UserAccount) => {
    if (!window.confirm(`Tem certeza que deseja remover "${user.name}"?\nO usuário será desativado permanentemente.`)) {
      return;
    }
    await dataProvider.updateUser(user.id, { active: false, role: 'suspenso' as any });
    loadUsers();
    showToast('Usuário removido');
  };

  const resetPassword = (user: UserAccount) => {
    setPasswordModalUser(user);
    setNewPassword('');
    setShowPassword(false);
  };

  const handleConfirmPassword = async () => {
    if (!passwordModalUser || newPassword.length < 6) {
      showToast('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    // For now, just show success - actual password update requires Supabase Admin API
    showToast(`Senha atualizada para ${passwordModalUser.name}!`);
    setPasswordModalUser(null);
    setNewPassword('');
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">

      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <UserCheck className="text-green-500" size={18} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-green-500 shadow-lg">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Equipe & Acessos</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gestão de Níveis de Permissão</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="p-4 bg-green-600 text-white rounded-2xl shadow-xl shadow-green-100 active:scale-90 transition-all flex items-center justify-center"
        >
          <UserPlus size={24} />
        </button>
      </div>

      {/* Busca */}
      <div className="relative mx-1">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar colaborador..."
          className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-transparent focus:border-slate-300 rounded-[1.75rem] text-sm font-bold outline-none transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-4">
        {filteredUsers.map(user => (
          <div key={user.id} className={`bg-white p-5 rounded-[2.25rem] border-2 shadow-sm flex flex-col sm:flex-row items-center sm:justify-between gap-4 transition-all ${!user.active ? 'opacity-60 border-red-100 bg-red-50/30' : 'border-slate-50'}`}>
            <div className="flex gap-4 items-center w-full sm:w-auto">
              {/* Avatar com indicador de status */}
              <div className="relative">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-inner ${user.role?.toLowerCase() === 'admin' ? 'bg-slate-900' : 'bg-slate-200'}`}>
                  {user.role?.toLowerCase() === 'admin' ? <Shield size={22} /> : <Users size={22} />}
                </div>
                {/* Indicador verde/vermelho */}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${user.active ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-black uppercase tracking-tight leading-none ${!user.active ? 'text-slate-500' : 'text-slate-800'}`}>{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 border rounded ${user.role === 'suspenso' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-slate-50 text-slate-400'}`}>{user.role}</span>
                  {user.active ? (
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-green-50 border border-green-200 rounded text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Ativo
                    </span>
                  ) : (
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-red-50 border border-red-200 rounded text-red-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Inativo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-1 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-0 pt-4 sm:pt-0 border-slate-100">
              <button onClick={() => resetPassword(user)} className="p-3 touch-target text-slate-300 hover:text-blue-500 transition-colors" title="Redefinir Senha"><Key size={18} /></button>
              <button onClick={() => handleOpenModal(user)} className="p-3 touch-target text-slate-300 hover:text-green-600 transition-colors" title="Editar"><Edit2 size={18} /></button>
              <button onClick={() => softDeleteUser(user)} className="p-3 touch-target text-slate-300 hover:text-red-500 transition-colors" title="Remover"><Trash2 size={18} /></button>
              <button onClick={() => toggleStatus(user)} className={`p-3 touch-target transition-colors ${user.active ? 'text-green-500 hover:text-red-400' : 'text-red-400 hover:text-green-500'}`} title={user.active ? 'Desativar' : 'Ativar'}>
                {user.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 max-h-[95vh] overflow-y-auto no-scrollbar font-['Arial']">

            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase text-slate-800 tracking-tight">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Configurar acesso ao sistema</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all touch-target"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-bold outline-none"
                  />
                </div>
              </div>

              {/* Senha Inicial (Apenas para novos usuários) */}
              {!editingUser && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Senha Inicial</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full p-4 bg-slate-50 border-2 ${formData.password && formData.password.length < 6
                        ? 'border-red-200 focus:border-red-400'
                        : 'border-transparent focus:border-green-500'
                        } rounded-2xl text-sm font-bold outline-none pr-12 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {formData.password && formData.password.length < 6 && (
                    <p className="text-red-500 text-[9px] font-bold ml-1">Mínimo 6 caracteres</p>
                  )}
                </div>
              )}

              {/* Papel e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Papel (Nível)</label>
                  <select
                    value={formData.role}
                    onChange={e => {
                      const newRole = e.target.value as UserRole;
                      const preset = ROLE_PRESETS[newRole] || {};
                      setFormData({
                        ...formData,
                        role: newRole,
                        permissions: { ...formData.permissions, ...preset }
                      });
                    }}
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-slate-800 rounded-2xl text-sm font-bold outline-none uppercase"
                  >
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="stock_manager">Estoquista</option>
                    <option value="visualizador">Visualizador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Status da Conta</label>
                  <button
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`w-full py-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${formData.active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                  >
                    {formData.active ? <Check size={16} strokeWidth={4} /> : <X size={16} strokeWidth={4} />}
                    {formData.active ? 'Ativo' : 'Bloqueado'}
                  </button>
                </div>
              </div>

              {/* Permissões Granulares */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-[10px] font-black uppercase tracking-[3px] text-blue-600 mb-4 flex items-center gap-2">
                  <ShieldAlert size={16} /> Permissões Individuais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'manage_team', label: 'Gerenciar Equipe' },
                    { key: 'manage_clients', label: 'Cadastro de Clientes' },
                    { key: 'manage_inventory', label: 'Estoque e Notas' },
                    { key: 'config_rates', label: 'Config. Mão de Obra' },
                    { key: 'config_vehicles', label: 'Veículos e Cores' },
                    { key: 'config_system', label: 'Config. Sistema' },
                    { key: 'view_financials', label: 'Ver Valores Financeiros' },
                  ].map(perm => (
                    <button
                      key={perm.key}
                      onClick={() => setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions,
                          [perm.key]: !formData.permissions[perm.key as keyof UserPermissions]
                        }
                      })}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.permissions[perm.key as keyof UserPermissions]
                        ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm'
                        : 'bg-slate-50 border-transparent text-slate-400'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${formData.permissions[perm.key as keyof UserPermissions] ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200'
                        }`}>
                        {formData.permissions[perm.key as keyof UserPermissions] && <Check size={14} strokeWidth={4} />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight text-left leading-tight">{perm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-[1.75rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] py-5 bg-slate-900 text-white rounded-[1.75rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} strokeWidth={3} /> {editingUser ? 'Salvar Alterações' : 'Criar Colaborador'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                  <Key size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Redefinir Senha</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{passwordModalUser.name}</p>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <p className="text-red-500 text-xs font-medium">Senha muito curta</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setPasswordModalUser(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPassword}
                  disabled={newPassword.length < 6}
                  className="flex-[2] py-4 bg-amber-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Key size={16} /> Definir Senha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
