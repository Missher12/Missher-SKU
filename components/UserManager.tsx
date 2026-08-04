import React, { useState, useMemo } from 'react';
import { User, ViewState, ShowToastFunction, ConfirmFunction, LogFunction } from '../types';
import { 
  Users, UserPlus, Shield, Edit, Trash2, Key, Search, Filter, 
  Check, X, ShieldAlert, Lock, Smartphone, Mail, Building, Clock, 
  CheckCircle2, Eye, RotateCcw, UserCheck, UserX, Square, Sliders,
  Plus, CheckSquare, ShieldCheck, Sparkles, KeyRound
} from 'lucide-react';

interface UserManagerProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User | null;
  addToast: ShowToastFunction;
  confirm: ConfirmFunction;
  logAction?: LogFunction;
}

const MODULE_OPTIONS: { key: ViewState; label: string; desc: string; iconColor: string }[] = [
  { key: 'dashboard', label: '仪表盘', desc: '全盘资产看板与数据预警', iconColor: 'text-blue-500' },
  { key: 'assets', label: '固定资产', desc: '资产档案卡片与卡片盘点', iconColor: 'text-emerald-500' },
  { key: 'inventory', label: '库房物资', desc: '耗材库存与出入库履历', iconColor: 'text-amber-500' },
  { key: 'computer-usage', label: '电脑用况', desc: '办公电脑领用与配置明细', iconColor: 'text-cyan-500' },
  { key: 'suppliers', label: '供应商', desc: '名录库与资质付款账号', iconColor: 'text-indigo-500' },
  { key: 'contracts', label: '采购合同', desc: '合同档案与付款履约履历', iconColor: 'text-purple-500' },
  { key: 'logs', label: '操作日志', desc: '审计流水与审计检索', iconColor: 'text-slate-500' },
  { key: 'settings', label: '系统设置', desc: '编码规则与AI密钥配置', iconColor: 'text-rose-500' }
];

const DEFAULT_DEPARTMENTS = [
  '信息技术部', '行政部', '财务部', '研发中心', '运营部', '采购部', '人力资源部'
];

export const UserManager: React.FC<UserManagerProps> = ({
  users,
  setUsers,
  currentUser,
  addToast,
  confirm,
  logAction
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'matrix'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    department: string;
    role: 'admin' | 'user' | 'viewer';
    status: 'active' | 'disabled';
    password?: string;
    canChangePassword: boolean;
    accessibleViews: ViewState[];
  }>({
    name: '',
    phone: '',
    email: '',
    department: '信息技术部',
    role: 'user',
    status: 'active',
    password: '',
    canChangePassword: true,
    accessibleViews: ['dashboard', 'assets', 'inventory', 'computer-usage']
  });

  // Password Reset Modal State
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Computed Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const activeCount = users.filter(u => u.status === 'active').length;
    const disabledCount = users.filter(u => u.status === 'disabled').length;
    return { total, adminCount, activeCount, disabledCount };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = 
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.phone.includes(term) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.department && u.department.toLowerCase().includes(term));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Open Modal for Create or Edit
  const handleOpenModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        phone: userToEdit.phone,
        email: userToEdit.email || '',
        department: userToEdit.department || '信息技术部',
        role: userToEdit.role,
        status: userToEdit.status,
        password: '',
        canChangePassword: userToEdit.canChangePassword ?? true,
        accessibleViews: userToEdit.accessibleViews || ['dashboard', 'assets', 'inventory']
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        department: '信息技术部',
        role: 'user',
        status: 'active',
        password: '',
        canChangePassword: true,
        accessibleViews: ['dashboard', 'assets', 'inventory', 'computer-usage']
      });
    }
    setIsModalOpen(true);
  };

  // Preset Select Role -> auto select view permissions
  const handleRoleChange = (newRole: 'admin' | 'user' | 'viewer') => {
    let views: ViewState[] = [];
    if (newRole === 'admin') {
      views = MODULE_OPTIONS.map(m => m.key);
    } else if (newRole === 'user') {
      views = ['dashboard', 'assets', 'inventory', 'computer-usage', 'suppliers', 'contracts'];
    } else {
      views = ['dashboard', 'assets', 'inventory'];
    }
    setFormData(prev => ({ ...prev, role: newRole, accessibleViews: views }));
  };

  // Select / Deselect All Modules
  const handleSelectAllModules = (selectAll: boolean) => {
    setFormData(prev => ({
      ...prev,
      accessibleViews: selectAll ? MODULE_OPTIONS.map(m => m.key) : []
    }));
  };

  // Toggle Module Permission Checkbox
  const handleToggleModule = (modKey: ViewState) => {
    setFormData(prev => {
      const exists = prev.accessibleViews.includes(modKey);
      const updated = exists 
        ? prev.accessibleViews.filter(k => k !== modKey)
        : [...prev.accessibleViews, modKey];
      return { ...prev, accessibleViews: updated };
    });
  };

  // Save User (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('请填写用户姓名', 'warning');
      return;
    }
    if (!formData.phone.trim()) {
      addToast('请填写联系电话', 'warning');
      return;
    }

    if (editingUser) {
      // Update
      const updatedUser: User = {
        ...editingUser,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        department: formData.department,
        role: formData.role,
        status: formData.status,
        canChangePassword: formData.canChangePassword,
        accessibleViews: formData.accessibleViews
      };

      if (formData.password && formData.password.trim().length >= 6) {
        updatedUser.password = formData.password.trim();
      }

      setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
      addToast(`已成功更新用户 ${updatedUser.name} 账号信息`, 'success');
      logAction?.('编辑账号', '权限设置', updatedUser.name, `更新了用户 ${updatedUser.name} (${updatedUser.phone}) 的角色与权限`);
    } else {
      // Create
      const newId = `user-${Date.now().toString().slice(-4)}`;
      const newUser: User = {
        id: newId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        department: formData.department,
        role: formData.role,
        status: formData.status,
        password: formData.password?.trim() || '123456',
        lastLogin: '从未登录',
        createdAt: new Date().toISOString().split('T')[0],
        canChangePassword: formData.canChangePassword,
        accessibleViews: formData.accessibleViews
      };

      setUsers(prev => [...prev, newUser]);
      addToast(`已创建用户 ${newUser.name} 账号`, 'success');
      logAction?.('新增账号', '权限设置', newUser.name, `创建新用户账号：${newUser.name} (${newUser.role})`);
    }

    setIsModalOpen(false);
  };

  // Toggle Single User Status (Active <-> Disabled)
  const handleToggleStatus = (targetUser: User) => {
    if (currentUser?.id === targetUser.id) {
      addToast('无法停用您当前正使用的账号', 'warning');
      return;
    }

    const nextStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    const statusText = nextStatus === 'active' ? '启用' : '暂停';

    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, status: nextStatus } : u));
    addToast(`账号 ${targetUser.name} 已更新为【${statusText}】`, 'info');
    logAction?.('变更账号状态', '权限设置', targetUser.name, `将用户 ${targetUser.name} 的状态变更：${statusText}`);
  };

  // Delete User
  const handleDeleteUser = (targetUser: User) => {
    if (currentUser?.id === targetUser.id) {
      addToast('无法删除您当前正登录的账号', 'error');
      return;
    }
    if (targetUser.id === 'user-admin-01' || (targetUser.role === 'admin' && stats.adminCount <= 1)) {
      addToast('系统必须保留至少一位超级管理员账号，不可注销', 'error');
      return;
    }

    confirm(
      '确认注销账号？',
      `您确定要彻底注销用户【${targetUser.name} (${targetUser.phone})】吗？操作后该用户将无法再登录系统。`,
      () => {
        setUsers(prev => prev.filter(u => u.id !== targetUser.id));
        addToast(`已成功删除用户 ${targetUser.name}`, 'success');
        logAction?.('注销账号', '权限设置', targetUser.name, `注销了用户账号：${targetUser.name}`);
      }
    );
  };

  // Execute Reset Password
  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser) return;
    if (!newPasswordInput || newPasswordInput.length < 6) {
      addToast('新密码长度不能少于 6 个字符', 'warning');
      return;
    }

    setUsers(prev => prev.map(u => u.id === resetPassUser.id ? { ...u, password: newPasswordInput.trim() } : u));
    addToast(`🔑 已重置用户 ${resetPassUser.name} 的登录密码`, 'success');
    logAction?.('重置密码', '权限设置', resetPassUser.name, `重置了用户 ${resetPassUser.name} 的登录密码`);
    setResetPassUser(null);
    setNewPasswordInput('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 顶部统计卡片组 - 精致现代化高密度布局 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">系统用户总数</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-800 numeric-text">{stats.total}</span>
              <span className="text-xs text-slate-400 font-medium">个账号</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">超级管理员</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-purple-600 numeric-text">{stats.adminCount}</span>
              <span className="text-xs text-purple-400 font-medium">人</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">正常服务账号</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-600 numeric-text">{stats.activeCount}</span>
              <span className="text-xs text-emerald-500 font-medium">人</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">已暂停/冻结</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-500 numeric-text">{stats.disabledCount}</span>
              <span className="text-xs text-slate-400 font-medium">人</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <UserX size={20} />
          </div>
        </div>
      </div>

      {/* 主面板容器 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* 控制层顶栏：分类Tab + 检索 + 操作 */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setActiveSubTab('list')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'list' 
                    ? 'bg-white text-slate-800 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                账号成员列表 ({users.length})
              </button>
              <button
                onClick={() => setActiveSubTab('matrix')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'matrix' 
                    ? 'bg-white text-slate-800 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                角色访问权限矩阵
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeSubTab === 'list' && (
              <>
                {/* 搜索框 */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="按姓名/电话/部门搜索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>

                {/* 角色下拉筛选 */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">全部角色</option>
                  <option value="admin">系统管理员</option>
                  <option value="user">业务操作员</option>
                  <option value="viewer">只读访客</option>
                </select>

                {/* 状态下拉筛选 */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">全部状态</option>
                  <option value="active">正常服务</option>
                  <option value="disabled">暂停冻结</option>
                </select>
              </>
            )}

            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 bg-[#059669] hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus size={15} />
              <span>新建账号</span>
            </button>
          </div>
        </div>

        {/* 内容展示区 */}
        {activeSubTab === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 w-[220px]">用户成员</th>
                  <th className="px-5 py-3.5 w-[140px]">归属部门</th>
                  <th className="px-5 py-3.5 w-[140px]">角色权限</th>
                  <th className="px-5 py-3.5">已授权功能模块</th>
                  <th className="px-5 py-3.5 w-[110px]">服务状态</th>
                  <th className="px-5 py-3.5 w-[130px] text-right">管理操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => {
                    const isSelf = currentUser?.id === u.id;
                    const views = u.accessibleViews || ['dashboard', 'assets', 'inventory'];
                    const isFullAccess = views.length >= MODULE_OPTIONS.length;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 用户成员列 */}
                        <td className="px-5 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                              u.role === 'admin' 
                                ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {u.name.charAt(0) || '用'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <span className="truncate">{u.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold shrink-0">
                                    当前账号
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 numeric-text truncate">
                                <span>{u.phone}</span>
                                {u.email && <span className="truncate opacity-75">· {u.email}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 归属部门 */}
                        <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 text-slate-700 rounded-lg font-medium text-xs">
                            <Building size={13} className="text-slate-400 shrink-0" />
                            <span>{u.department || '未分配'}</span>
                          </div>
                        </td>

                        {/* 角色权限 */}
                        <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            u.role === 'admin' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200/80' 
                              : u.role === 'user' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200/80' 
                              : 'bg-slate-100 text-slate-600 border-slate-200/80'
                          }`}>
                            <Shield size={13} className="shrink-0" />
                            <span>{u.role === 'admin' ? '系统管理员' : u.role === 'user' ? '业务操作员' : '只读访客'}</span>
                          </span>
                        </td>

                        {/* 授权功能模块 */}
                        <td className="px-5 py-3.5 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isFullAccess ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-md text-[11px] font-bold">
                                <Sparkles size={11} /> 全部模块 ({MODULE_OPTIONS.length}) 完全控制
                              </span>
                            ) : (
                              views.map(viewKey => {
                                const targetMod = MODULE_OPTIONS.find(m => m.key === viewKey);
                                return (
                                  <span key={viewKey} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium border border-slate-200/60 whitespace-nowrap">
                                    {targetMod?.label || viewKey}
                                  </span>
                                );
                              })
                            )}
                            <span className="text-[10px] text-slate-400 ml-1 whitespace-nowrap">
                              {u.canChangePassword ? '· 允许个人改密' : ''}
                            </span>
                          </div>
                        </td>

                        {/* 服务状态 */}
                        <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title="点击切换状态"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                              u.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            <span>{u.status === 'active' ? '正常服务' : '暂停冻结'}</span>
                          </button>
                        </td>

                        {/* 管理操作 */}
                        <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap">
                          <div className="flex justify-end items-center gap-1">
                            <button
                              onClick={() => { setResetPassUser(u); setNewPasswordInput(''); }}
                              title="重置登录密码"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                            >
                              <KeyRound size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenModal(u)}
                              title="编辑账号特权"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="注销此用户"
                              disabled={isSelf}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-20 disabled:hover:bg-transparent"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users size={32} className="text-slate-300" />
                        <p className="text-sm font-medium">未搜到符合条件的用户账号</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* 角色权限矩阵视图 */
          <div className="p-5 space-y-5">
            <div className="bg-blue-50/80 border border-blue-200/60 p-4 rounded-xl text-xs text-blue-900 flex items-start gap-3">
              <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h5 className="font-bold text-sm text-blue-950">内置系统角色与默认功能授权矩阵</h5>
                <p className="text-blue-700 mt-0.5 leading-relaxed">
                  系统提供 3 种标准角色模型，您可以在「编辑账号」弹窗中为单个账号单独增减特定模块的操作许可：
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">业务功能模块</th>
                    <th className="p-4 text-center w-40 bg-purple-50/60 text-purple-900 border-l border-slate-200">
                      系统管理员 (Admin)
                    </th>
                    <th className="p-4 text-center w-40 bg-blue-50/60 text-blue-900 border-l border-slate-200">
                      业务操作员 (User)
                    </th>
                    <th className="p-4 text-center w-40 bg-slate-100/60 text-slate-800 border-l border-slate-200">
                      只读访客 (Viewer)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULE_OPTIONS.map(mod => (
                    <tr key={mod.key} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          <span className={mod.iconColor}>●</span>
                          <span>{mod.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{mod.desc}</div>
                      </td>
                      <td className="p-4 text-center bg-purple-50/20 border-l border-slate-100">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                          <CheckCircle2 size={15} /> 完全控制 (读写)
                        </span>
                      </td>
                      <td className="p-4 text-center bg-blue-50/20 border-l border-slate-100">
                        {['dashboard', 'assets', 'inventory', 'computer-usage', 'suppliers', 'contracts'].includes(mod.key) ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                            <CheckCircle2 size={15} /> 业务读写
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <Lock size={13} /> 默认隐藏
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center bg-slate-50/40 border-l border-slate-100">
                        {['dashboard', 'assets', 'inventory'].includes(mod.key) ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-bold text-xs">
                            <Eye size={14} /> 仅可查看
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <Lock size={13} /> 默认隐藏
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 新建/编辑用户 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* 头部 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  {editingUser ? <Edit size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {editingUser ? `编辑账号: ${editingUser.name}` : '新建系统登录账号'}
                  </h3>
                  <p className="text-[11px] text-slate-400">配置账号基本身份、团队角色与细粒度访问模块</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 表单内容 */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    姓名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：李明"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    手机号码 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="13800138000"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs numeric-text focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">工作邮箱</label>
                  <input
                    type="email"
                    placeholder="liming@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs numeric-text focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">归属部门</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                  >
                    {DEFAULT_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 角色与服务状态选择 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">角色模型</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'admin', label: '管理员', badge: '全特权' },
                      { key: 'user', label: '操作员', badge: '业务读写' },
                      { key: 'viewer', label: '只读员', badge: '无修改' }
                    ].map(r => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => handleRoleChange(r.key as any)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          formData.role === r.key 
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-2xs' 
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{r.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.badge}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">服务状态</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        formData.status === 'active' 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' 
                          : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" /> 正常启用
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: 'disabled' }))}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        formData.status === 'disabled' 
                          ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold' 
                          : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-center gap-1">
                        <Lock size={13} className="text-rose-600" /> 暂停冻结
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* 密码 */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingUser ? '重置密码 (留空则保持原密码)' : '初始登录密码'}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? '保持原密码请留空' : '设置初始登录密码 (至少 6 位)'}
                  value={formData.password || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 细粒度功能模块勾选 */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">模块授权许可</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectAllModules(formData.accessibleViews.length < MODULE_OPTIONS.length)}
                      className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      {formData.accessibleViews.length < MODULE_OPTIONS.length ? '全选模块' : '清空模块'}
                    </button>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.canChangePassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, canChangePassword: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>允许修改个人密码</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MODULE_OPTIONS.map(mod => {
                    const isChecked = formData.accessibleViews.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        onClick={() => handleToggleModule(mod.key)}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked 
                            ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold' 
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs">{mod.label}</span>
                        {isChecked ? <CheckCircle2 size={14} className="text-blue-600 shrink-0" /> : <Square size={14} className="text-slate-300 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  {editingUser ? '保存变更' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 重置密码 Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">重置登录密码</h3>
                <p className="text-[11px] text-slate-400">正在修改账号 【{resetPassUser.name}】 的口令</p>
              </div>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">设置新密码</label>
                <input
                  type="text"
                  required
                  placeholder="请输入至少 6 位的新密码"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs numeric-text focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 shadow-xs cursor-pointer"
                >
                  确认重置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
