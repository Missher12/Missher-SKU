
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ViewState, FixedAsset, InventoryItem, AssetStatus, InventoryCategory, ComputerUsageRecord, ComputerType, ComputerStatus, Supplier, Contract, ContractStatus, ContractType, AppSettings, User, AuditLog, LogFunction, AiProvider, ToastMessage, ToastType } from './types';
import { LayoutDashboard, Package, Box, Sparkles, Menu, X, Settings, Monitor, Users, FileText, Upload, Shield, UserPlus, Edit, Trash2, Activity, UserCog, LogOut, Bell, Search as SearchIcon, ChevronRight, Lock, Phone, Key, CheckSquare, Square, Globe, HardDrive, Volume2, Wifi, ChevronDown, Plus, Eye, Check, Image as ImageIcon, Hash, Bot, Loader2, Save, Moon, Sun, AlignLeft, LayoutGrid } from 'lucide-react';
import { testAiConnection } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { AssetManager } from './components/AssetManager';
import { InventoryManager } from './components/InventoryManager';
import { ComputerUsageManager } from './components/ComputerUsageManager';
import { SupplierManager } from './components/SupplierManager';
import { ContractManager } from './components/ContractManager';
import { LogCenter } from './components/LogCenter';
import { UserManager } from './components/UserManager';
import { AiConfigManager } from './components/AiConfigManager';
import { GlobalAiAssistant } from './components/GlobalAiAssistant';
import { AiInsights } from './components/AiInsights';
import { Login } from './components/Login';
import { ToastContainer } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';

const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Failed to load ${key} from storage`, e);
        return fallback;
    }
};

const saveToStorage = <T,>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Failed to save ${key} to storage`, e);
    }
};

const ALL_VIEWS: ViewState[] = ['dashboard', 'assets', 'computer-usage', 'inventory', 'suppliers', 'contracts', 'analysis', 'logs', 'settings'];

const MODULE_NAMES: Record<ViewState, string> = {
    'dashboard': '仪表盘',
    'assets': '固定资产',
    'computer-usage': '电脑领用',
    'inventory': '库存管理',
    'suppliers': '供应商库',
    'contracts': '合同归档',
    'analysis': '智能分析',
    'logs': '日志中心',
    'settings': '系统设置'
};

const DEFAULT_ADMIN: User = {
    id: 'admin-default',
    name: '系统管理员',
    email: 'admin@local',
    phone: '17688485520', 
    password: 'password',
    role: 'admin',
    department: 'IT',
    status: 'active',
    lastLogin: '-',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    canChangePassword: true,
    accessibleViews: ALL_VIEWS
};

const DEFAULT_ASSETS: FixedAsset[] = [
  {
    id: 'asset-01',
    name: 'MacBook Pro M3 Max 16寸',
    assetCode: 'ASSET-2024-001',
    activationDate: '2024-01-15',
    depreciationStartDate: '2024-02-01',
    originalValue: 24999,
    vatAmount: 2876.3,
    netValueExTax: 22122.7,
    usefulLifeYears: 4,
    residualRate: 5,
    residualValue: 1249.95,
    monthlyDepreciation: 494.77,
    annualDepreciation: 5937.24,
    monthsDepreciated: 6,
    currentMonthDepreciation: 494.77,
    accumulatedDepreciation: 2968.62,
    netBookValue: 22030.38,
    remainingDepreciation: 20780.43,
    status: AssetStatus.ACTIVE,
    location: '研发中心 401 工位',
    locationImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'asset-02',
    name: 'Dell UltraSharp 27寸 4K 显示器',
    assetCode: 'ASSET-2024-002',
    activationDate: '2024-02-10',
    depreciationStartDate: '2024-03-01',
    originalValue: 4500,
    vatAmount: 517.7,
    netValueExTax: 3982.3,
    usefulLifeYears: 5,
    residualRate: 5,
    residualValue: 225,
    monthlyDepreciation: 71.25,
    annualDepreciation: 855,
    monthsDepreciated: 5,
    currentMonthDepreciation: 71.25,
    accumulatedDepreciation: 356.25,
    netBookValue: 4143.75,
    remainingDepreciation: 3918.75,
    status: AssetStatus.ACTIVE,
    location: '设计部 302 办公室',
    locationImage: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80'
  }
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-01',
    name: '罗技 MX Master 3S 无线鼠标',
    sku: 'SKU-MOUSE-001',
    barcode: '690123456789',
    supplier: '罗技官方旗舰店',
    category: InventoryCategory.ELECTRONICS,
    department: '项目部',
    purchaseDate: '2026-01-10',
    quantity: 18,
    unit: '个',
    reorderPoint: 5,
    unitPrice: 599,
    location: 'IT 备件库 A-02 货架',
    locationImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    remark: '项目部高频领用办公配件'
  },
  {
    id: 'inv-02',
    name: '便携式无线高清投影仪',
    sku: 'SKU-PROJ-002',
    barcode: '690987654321',
    supplier: '极米科技',
    category: InventoryCategory.ELECTRONICS,
    department: '项目部',
    purchaseDate: '2026-02-15',
    quantity: 2,
    unit: '台',
    reorderPoint: 4,
    unitPrice: 3299,
    location: '项目部器材库 B-01',
    remark: '项目外场汇报专用，急需补货'
  },
  {
    id: 'inv-03',
    name: '专业单反相机补光灯套装',
    sku: 'SKU-CAM-003',
    barcode: '690112233445',
    supplier: '神牛摄影器材',
    category: InventoryCategory.HARDWARE,
    department: '宣传部',
    purchaseDate: '2026-03-01',
    quantity: 6,
    unit: '套',
    reorderPoint: 2,
    unitPrice: 1280,
    location: '宣传部影音室 C-03',
    remark: '企业宣传片与活动拍摄'
  },
  {
    id: 'inv-04',
    name: '宣传展会统一易拉宝展架',
    sku: 'SKU-DISP-004',
    barcode: '690556677889',
    supplier: '印易得广告制作',
    category: InventoryCategory.OTHER,
    department: '宣传部',
    purchaseDate: '2026-03-20',
    quantity: 3,
    unit: '个',
    reorderPoint: 8,
    unitPrice: 180,
    location: '宣传部物料库 C-01',
    remark: '品牌路演巡展物料，低于安全线'
  },
  {
    id: 'inv-05',
    name: 'A4 70g 多功能复印纸 (5包/箱)',
    sku: 'SKU-PAPER-005',
    barcode: '690998877665',
    supplier: '得力办公专营店',
    category: InventoryCategory.STATIONERY,
    department: '行政部',
    purchaseDate: '2026-02-28',
    quantity: 30,
    unit: '箱',
    reorderPoint: 10,
    unitPrice: 125,
    location: '行政总仓 D-05 货架',
    remark: '日常打印办公耗材'
  },
  {
    id: 'inv-06',
    name: '商务定制特种纸烫金手提袋',
    sku: 'SKU-BAG-006',
    barcode: '690334455667',
    supplier: '恒美包装制品',
    category: InventoryCategory.OTHER,
    department: '行政部',
    purchaseDate: '2026-04-05',
    quantity: 4,
    unit: '包',
    reorderPoint: 10,
    unitPrice: 220,
    location: '行政外联库 D-02',
    remark: '接待与客户拜访礼品袋，严重不足'
  },
  {
    id: 'inv-07',
    name: 'Cat6 六类双屏蔽千兆网线 (10米)',
    sku: 'SKU-NET-007',
    barcode: '690778899001',
    supplier: '绿联旗舰店',
    category: InventoryCategory.HARDWARE,
    department: '研发中心',
    purchaseDate: '2026-01-22',
    quantity: 45,
    unit: '根',
    reorderPoint: 15,
    unitPrice: 38,
    location: '研发实验室网络柜',
    remark: '服务器与测试机房布线'
  },
  {
    id: 'inv-08',
    name: 'Type-C 10-in-1 多功能扩展坞',
    sku: 'SKU-HUB-008',
    barcode: '690223344556',
    supplier: '绿联旗舰店',
    category: InventoryCategory.ELECTRONICS,
    department: '研发中心',
    purchaseDate: '2026-03-10',
    quantity: 3,
    unit: '个',
    reorderPoint: 6,
    unitPrice: 289,
    location: '研发IT配件箱',
    remark: '开发人员领用配发配件，库存预警'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const stored = localStorage.getItem('app_users');
      if (stored) {
          const users = JSON.parse(stored) as User[];
          return users.find(u => u.role === 'admin') || DEFAULT_ADMIN;
      }
      return DEFAULT_ADMIN;
  });

  const [view, setView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => loadFromStorage('app_dark_mode', false));

  useEffect(() => {
    saveToStorage('app_dark_mode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  const [assets, setAssets] = useState<FixedAsset[]>(() => {
      const loaded = loadFromStorage<FixedAsset[]>('app_assets', []);
      return loaded.length > 0 ? loaded : DEFAULT_ASSETS;
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
      const loaded = loadFromStorage<InventoryItem[]>('app_inventory', []);
      return loaded.length > 0 ? loaded : DEFAULT_INVENTORY;
  });
  const [computerRecords, setComputerRecords] = useState<ComputerUsageRecord[]>(() => loadFromStorage('app_records', []));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadFromStorage('app_suppliers', []));
  const [contracts, setContracts] = useState<Contract[]>(() => loadFromStorage('app_contracts', []));
  
  const [users, setUsers] = useState<User[]>(() => {
      let loadedUsers = loadFromStorage<User[]>('app_users', []);
      if (loadedUsers.length === 0) loadedUsers.push(DEFAULT_ADMIN);
      return loadedUsers;
  });

  const [logs, setLogs] = useState<AuditLog[]>(() => loadFromStorage('app_logs', []));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [targetSearchTerm, setTargetSearchTerm] = useState('');
  const [inventoryFilterStatus, setInventoryFilterStatus] = useState<'ALL' | 'LOW' | 'NORMAL'>('ALL');

  const handleNavigate = (targetView: ViewState, filterStatus?: 'ALL' | 'LOW' | 'NORMAL') => {
    setView(targetView);
    if (filterStatus) {
      setInventoryFilterStatus(filterStatus);
    }
  };

  const [settings, setSettings] = useState<AppSettings>(() => loadFromStorage('app_settings', {
    appName: 'FFACG-Pro',
    logoUrl: '', 
    faviconUrl: '',
    loginHeadline: '全方位的企业资产\n与库存智能化管理平台',
    loginDescription: '集成 AI 智能分析，助力企业实现数据驱动的决策。',
    loginCopyrightText: `© ${new Date().getFullYear()} FFACG Enterprise.`,
    prefixConfig: {
      asset: 'ASSET',
      inventory: 'SKU',
      desktop: 'DT',
      laptop: 'LT'
    },
    aiConfig: {
      provider: 'gemini',
      modelName: 'gemini-3-flash-preview',
      creativityLevel: 0.7,
      apiKey: '', 
      baseUrl: ''
    }
  }));

  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [settingsTab, setSettingsTab] = useState<'basic' | 'ai' | 'logs' | 'users'>('basic');
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [savingSettingsTab, setSavingSettingsTab] = useState<string | null>(null);

  const handleSaveSettings = (tabKey: 'basic' | 'ai', toastMessage: string) => {
    setSavingSettingsTab(tabKey);
    setTimeout(() => {
      setSettings(tempSettings);
      setSavingSettingsTab(null);
      addToast(`✨ ${toastMessage}`, 'success');
    }, 500);
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    addToast('正在发起 AI 服务接口连通性测试...', 'info');
    try {
      const result = await testAiConnection(tempSettings);
      if (result.success) {
        addToast(`✅ ${result.message}`, 'success');
      } else {
        addToast(`❌ 测试连接失败: ${result.message}`, 'error');
      }
    } catch (e: any) {
      addToast(`❌ 连通测试发生异常: ${e.message || '网络无法到达'}`, 'error');
    } finally {
      setIsTestingAi(false);
    }
  };

  useEffect(() => { localStorage.setItem('app_assets', JSON.stringify(assets)); }, [assets]);
  useEffect(() => { localStorage.setItem('app_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('app_records', JSON.stringify(computerRecords)); }, [computerRecords]);
  useEffect(() => { localStorage.setItem('app_suppliers', JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem('app_contracts', JSON.stringify(contracts)); }, [contracts]);
  useEffect(() => { localStorage.setItem('app_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('app_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('app_settings', JSON.stringify(settings)); }, [settings]);

  const addToast = (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString();
      setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
      setConfirmConfig({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setConfirmConfig(null); } });
  };

  const addLog: LogFunction = (action, module, target, details) => {
      const newLog: AuditLog = {
          id: Math.random().toString(36).substr(2, 9),
          operator: currentUser?.name || '系统', 
          action, module, target, details,
          timestamp: new Date().toLocaleString()
      };
      setLogs(prev => [newLog, ...prev]);
  };

  const handleLogout = () => {
      addLog('用户登出', '安全审计', currentUser?.name || '未知', '退出系统');
      setCurrentUser(null);
  };

  const handleUpdatePassword = (oldPass: string, newPass: string) => {
      if (!currentUser) return;
      if (oldPass !== currentUser.password) {
          addToast('旧密码不正确', 'error');
          return;
      }
      const updatedUser = { ...currentUser, password: newPass };
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      setCurrentUser(updatedUser); 
      addToast('密码已更新', 'success');
      setIsChangePasswordOpen(false);
  };

  const [isMiniSidebar, setIsMiniSidebar] = useState<boolean>(false);

  const NavItem = ({ id, label, icon: Icon, badge, alert }: { id: ViewState, label: string, icon: any, badge?: number | string, alert?: boolean }) => {
    const isActive = view === id;
    return (
      <button
        onClick={() => { setView(id); setTargetSearchTerm(''); if (window.innerWidth < 1024) setSidebarOpen(false); }}
        className={`w-full flex items-center ${isMiniSidebar ? 'justify-center px-0 py-3' : 'px-3.5 py-2.5'} rounded-xl text-xs font-bold transition-all cursor-pointer group relative ${
          isActive 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold' 
            : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/80'
        }`}
        title={isMiniSidebar ? label : undefined}
      >
        <Icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
        
        {!isMiniSidebar && (
          <span className="ml-3 truncate text-xs">{label}</span>
        )}

        {badge !== undefined && (
          <span className={`numeric-text transition-all ${
            isMiniSidebar 
              ? 'absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-black rounded-full ring-2 ring-white shadow-xs' 
              : 'ml-auto px-2 py-0.5 rounded-full text-[11px] font-black'
          } ${
            alert 
              ? 'bg-rose-500 text-white animate-pulse' 
              : isActive 
                ? 'bg-white text-blue-700 font-black shadow-2xs' 
                : 'bg-slate-200/90 text-slate-800 font-black border border-slate-300/50'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  const SidebarGroupLabel = ({ label }: { label: string }) => {
    if (isMiniSidebar) return <div className="h-px bg-slate-200/80 my-3 mx-2"></div>;
    return (
      <div className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-5 mb-2">
        {label}
      </div>
    );
  };

  if (!currentUser) return <Login users={users} onLogin={setCurrentUser} appName={settings.appName} onShowToast={addToast} logoUrl={settings.logoUrl} headline={settings.loginHeadline} description={settings.loginDescription} copyrightText={settings.loginCopyrightText} />;

  return (
    <div className="flex h-screen bg-[#F4F6F9] overflow-hidden relative font-sans text-slate-800">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog isOpen={!!confirmConfig} title={confirmConfig?.title || ''} message={confirmConfig?.message || ''} onConfirm={confirmConfig?.onConfirm || (() => {})} onCancel={() => setConfirmConfig(null)} />
      <ChangePasswordDialog isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} onSubmit={handleUpdatePassword} />

      {/* 移动端遮罩 */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-xs transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Spike Admin 风格 Mini Sidebar (左侧精美侧边栏) */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${isMiniSidebar ? 'w-20' : 'w-64'} bg-white border-r border-slate-200/80 transform transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-sm`}>
        {/* Brand Logo & Mini Toggle Header */}
        <div className={`h-16 ${isMiniSidebar ? 'px-2 justify-center' : 'px-4 justify-between'} flex items-center border-b border-slate-100 shrink-0 relative`}>
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 mx-auto">
              {settings.logoUrl ? <img src={settings.logoUrl} className="w-5 h-5 object-contain" /> : <Package size={20} />}
            </div>
            {!isMiniSidebar && (
              <div className="min-w-0">
                <h1 className="text-sm font-black text-slate-900 tracking-tight truncate">{settings.appName}</h1>
                <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase block -mt-0.5">Spike Admin</span>
              </div>
            )}
          </div>

          {!isMiniSidebar && (
            <button 
              onClick={() => setIsMiniSidebar(!isMiniSidebar)}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="折叠侧边栏"
            >
              <ChevronRight size={18} className="transform rotate-180" />
            </button>
          )}
        </div>

        {/* Sidebar Menu Nav Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
          <SidebarGroupLabel label="核心工作区" />
          <NavItem id="dashboard" label="仪表盘看板" icon={LayoutDashboard} />
          <NavItem 
            id="inventory" 
            label="物资库存管理" 
            icon={Box} 
            badge={inventory.length} 
            alert={inventory.some(i => i.quantity <= i.reorderPoint)} 
          />
          <NavItem id="computer-usage" label="电脑领用登记" icon={Monitor} badge={computerRecords.length} />
          <NavItem id="assets" label="固定资产卡片" icon={Settings} badge={assets.length} />

          <SidebarGroupLabel label="企业资源管理" />
          <NavItem id="suppliers" label="供应商名册" icon={Users} badge={suppliers.length} />
          <NavItem id="contracts" label="合同在线归档" icon={FileText} badge={contracts.length} />

          <SidebarGroupLabel label="系统配置设置" />
          <NavItem id="settings" label="系统设置" icon={Settings} />
        </div>

        {/* Bottom Sidebar Footer / Mini Toggle */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button 
            onClick={() => setIsMiniSidebar(!isMiniSidebar)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl border border-slate-200/60 shadow-2xs transition-all cursor-pointer"
            title={isMiniSidebar ? "展开侧边栏" : "折叠侧边栏"}
          >
            <ChevronRight size={16} className={`transform transition-transform ${isMiniSidebar ? '' : 'rotate-180'}`} />
            {!isMiniSidebar && <span>折叠侧边栏</span>}
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Spike Admin Top Floating Header Bar (Exact match to screenshot) */}
        <header className="bg-white/95 backdrop-blur-md border border-slate-200/70 rounded-[22px] px-5 py-2.5 mx-4 md:mx-6 mt-4 mb-2 flex items-center justify-between gap-3 z-20 shrink-0 shadow-sm">
          {/* Left Menu Toggle */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(!isSidebarOpen);
                } else {
                  setIsMiniSidebar(!isMiniSidebar);
                }
              }}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="切换侧边栏"
            >
              <AlignLeft size={20} />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Pill Search Field */}
            <div className="relative hidden sm:flex items-center">
              <SearchIcon size={15} className="absolute left-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="尝试搜索......" 
                className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-44 md:w-56 transition-all text-slate-700 placeholder-slate-400 font-medium"
              />
            </div>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer" 
              title={isDarkMode ? "切换亮色模式" : "切换暗黑模式"}
            >
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* Notification Bell (Navigate to Log Center) */}
            <button 
              onClick={() => setView('logs')} 
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer" 
              title="查看日志中心记录"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-orange-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white shadow-2xs">
                {logs.length || 5}
              </span>
            </button>

            {/* AI Assistant Pill */}
            <button 
              onClick={() => setIsAiOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-sm shadow-blue-500/20 cursor-pointer group"
            >
              <Bot size={15} className="group-hover:rotate-12 transition-transform" />
              <span>AI 助手</span>
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 my-auto"></div>

            {/* User Profile Area */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="relative shrink-0">
                <img 
                  src={currentUser?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80"} 
                  alt={currentUser?.name || "系统管理员"} 
                  className="w-9 h-9 rounded-full object-cover border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";
                  }}
                />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{currentUser?.name || '系统管理员'}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{currentUser?.role === 'admin' ? '系统管理员' : currentUser?.role}</p>
              </div>
              <div className="flex items-center gap-0.5 ml-1">
                <button onClick={() => setIsChangePasswordOpen(true)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer" title="修改密码"><Key size={13} /></button>
                <button onClick={handleLogout} className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer" title="退出登录"><LogOut size={13} /></button>
              </div>
            </div>
          </div>
        </header>

        {/* Spike Page Canvas Main */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-[#F4F6F9]">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {view === 'dashboard' && <Dashboard assets={assets} inventory={inventory} contracts={contracts} suppliers={suppliers} onNavigate={handleNavigate} />}
            {view === 'assets' && <AssetManager assets={assets} setAssets={setAssets} isReadOnly={currentUser.role === 'viewer'} onShowToast={addToast} onConfirm={requestConfirm} settings={settings} />}
            {view === 'computer-usage' && <ComputerUsageManager records={computerRecords} setRecords={setComputerRecords} isReadOnly={currentUser.role === 'viewer'} onShowToast={addToast} onConfirm={requestConfirm} settings={settings} />}
            {view === 'inventory' && (
              <InventoryManager 
                inventory={inventory} 
                setInventory={setInventory} 
                isReadOnly={currentUser.role === 'viewer'} 
                onAddLog={addLog} 
                initialFilterStatus={inventoryFilterStatus}
                onFilterStatusChange={setInventoryFilterStatus}
                onShowToast={addToast} 
                onConfirm={requestConfirm} 
                settings={settings} 
              />
            )}
            {/* Fix: Added missing settings prop to SupplierManager */}
            {view === 'suppliers' && <SupplierManager suppliers={suppliers} setSuppliers={setSuppliers} isReadOnly={currentUser.role === 'viewer'} onShowToast={addToast} onConfirm={requestConfirm} settings={settings} />}
            {/* Fix: Added missing settings prop to ContractManager */}
            {view === 'contracts' && <ContractManager contracts={contracts} setContracts={setContracts} suppliers={suppliers} isReadOnly={currentUser.role === 'viewer'} onShowToast={addToast} onConfirm={requestConfirm} settings={settings} />}
            {view === 'settings' && (
                <div className="w-full space-y-6 pb-20 animate-fade-in">
                    {/* Settings Navigation Sub-Tabs */}
                    <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <button 
                            type="button"
                            onClick={() => setSettingsTab('basic')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                settingsTab === 'basic' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Settings size={15} /> 基础与编码规则
                        </button>
                        <button 
                            type="button"
                            onClick={() => setSettingsTab('ai')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                settingsTab === 'ai' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Sparkles size={15} /> AI 服务接口设置
                        </button>
                        <button 
                            type="button"
                            onClick={() => setSettingsTab('logs')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                settingsTab === 'logs' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Activity size={15} /> 操作日志中心
                        </button>
                        <button 
                            type="button"
                            onClick={() => setSettingsTab('users')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                settingsTab === 'users' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Shield size={15} /> 账号与权限管理
                        </button>
                    </div>

                    {/* Sub-Tab 1: Basic & Code Prefix Config */}
                    {settingsTab === 'basic' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* 板块：编码规则配置 */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <Hash className="text-blue-500" size={24} />
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">编码规则配置 (自定义前缀)</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">为各类固定资产、领用设备和库存物资定制统一业务编码格式</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">固定资产前缀</label>
                                        <input type="text" className="w-full border border-slate-200 p-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none bg-[#F8FAFC] font-bold text-slate-800" value={tempSettings.prefixConfig.asset} onChange={e => setTempSettings({...tempSettings, prefixConfig: {...tempSettings.prefixConfig, asset: e.target.value}})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">库存物资前缀</label>
                                        <input type="text" className="w-full border border-slate-200 p-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none bg-[#F8FAFC] font-bold text-slate-800" value={tempSettings.prefixConfig.inventory} onChange={e => setTempSettings({...tempSettings, prefixConfig: {...tempSettings.prefixConfig, inventory: e.target.value}})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">台式机编号前缀</label>
                                        <input type="text" className="w-full border border-slate-200 p-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none bg-[#F8FAFC] font-bold text-slate-800" value={tempSettings.prefixConfig.desktop} onChange={e => setTempSettings({...tempSettings, prefixConfig: {...tempSettings.prefixConfig, desktop: e.target.value}})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">笔记本编号前缀</label>
                                        <input type="text" className="w-full border border-slate-200 p-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none bg-[#F8FAFC] font-bold text-slate-800" value={tempSettings.prefixConfig.laptop} onChange={e => setTempSettings({...tempSettings, prefixConfig: {...tempSettings.prefixConfig, laptop: e.target.value}})} />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-4 italic">提示：修改前缀后，新生成的资产或物资编号将自动按新格式排号，历史编号不受影响。</p>
                            </div>

                            {/* 板块：一般设置 */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <Settings className="text-slate-400" size={24} />
                                    <h3 className="text-lg font-bold text-slate-800">系统标识与品牌管理</h3>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">系统名称 / 企业名称</label>
                                        <input type="text" className="w-full border border-slate-200 p-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none text-lg font-bold bg-[#F8FAFC]" value={tempSettings.appName} onChange={e => setTempSettings({...tempSettings, appName: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-2">LOGO 图片链接 (URL)</label>
                                            <div className="flex gap-4">
                                                <div className="relative flex-1">
                                                    <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                    <input type="text" className="w-full border border-slate-200 pl-12 pr-4 py-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none bg-[#F8FAFC]" placeholder="https://example.com/logo.png" value={tempSettings.logoUrl} onChange={e => setTempSettings({...tempSettings, logoUrl: e.target.value})} />
                                                </div>
                                                <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                                                    {tempSettings.logoUrl ? <img src={tempSettings.logoUrl} className="w-10 h-10 object-contain" /> : <Box className="text-slate-300" />}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-2">网站图标 (Favicon URL)</label>
                                            <div className="flex gap-4">
                                                <div className="relative flex-1">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                    <input type="text" className="w-full border border-slate-200 pl-12 pr-4 py-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none bg-[#F8FAFC]" placeholder="https://example.com/favicon.ico" value={tempSettings.faviconUrl} onChange={e => setTempSettings({...tempSettings, faviconUrl: e.target.value})} />
                                                </div>
                                                <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                                                    {tempSettings.faviconUrl ? <img src={tempSettings.faviconUrl} className="w-10 h-10 object-contain" /> : <ImageIcon className="text-slate-300" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 板块：登录页个性化配置 */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <Monitor className="text-slate-400" size={24} />
                                    <h3 className="text-lg font-bold text-slate-800">登录页个性化文案配置</h3>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">宣传标题 (支持换行)</label>
                                        <textarea className="w-full border border-slate-200 p-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none min-h-[100px] bg-[#F8FAFC] text-sm" value={tempSettings.loginHeadline} onChange={e => setTempSettings({...tempSettings, loginHeadline: e.target.value})} />
                                        <p className="text-[11px] text-slate-400 mt-2">显示在登录页面左侧主屏标题区域。</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">宣传描述</label>
                                        <textarea className="w-full border border-slate-200 p-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none min-h-[120px] bg-[#F8FAFC] text-sm" value={tempSettings.loginDescription} onChange={e => setTempSettings({...tempSettings, loginDescription: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">底部版权信息</label>
                                        <input type="text" className="w-full border border-slate-200 p-4 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none bg-[#F8FAFC] text-sm" value={tempSettings.loginCopyrightText} onChange={e => setTempSettings({...tempSettings, loginCopyrightText: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button 
                                    type="button"
                                    disabled={savingSettingsTab !== null}
                                    onClick={() => handleSaveSettings('basic', '基础与编码规则设置已保存生效！')} 
                                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-200 text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {savingSettingsTab === 'basic' ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>正在保存...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            <span>保存基础规则</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sub-Tab 2: AI Config */}
                    {settingsTab === 'ai' && (
                        <AiConfigManager 
                            settings={settings} 
                            setSettings={setSettings} 
                            addToast={addToast} 
                            logAction={addLog} 
                        />
                    )}

                    {/* Sub-Tab 3: Embedded Logs Center */}
                    {settingsTab === 'logs' && (
                        <div className="animate-fade-in">
                            <LogCenter logs={logs} />
                        </div>
                    )}

                    {/* Sub-Tab 4: Users & Permissions */}
                    {settingsTab === 'users' && (
                        <UserManager 
                            users={users} 
                            setUsers={setUsers} 
                            currentUser={currentUser} 
                            addToast={addToast} 
                            confirm={requestConfirm} 
                            logAction={addLog} 
                        />
                    )}
                </div>
            )}
          </div>
        </main>
      </div>
      <GlobalAiAssistant assets={assets} inventory={inventory} contracts={contracts} suppliers={suppliers} records={computerRecords} settings={settings} currentUser={currentUser} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
