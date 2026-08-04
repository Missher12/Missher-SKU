
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShowToastFunction, Supplier, ConfirmFunction, SupplierContact, AppSettings } from '../types';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Star, Building2, User, CreditCard, ChevronDown, ImageIcon, Upload, Wand2, CheckCircle, AlertCircle, X, PlusCircle, MinusCircle, Tag, Landmark, Zap, Loader2, Copy, Users, Check, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { parseSupplierInfo } from '../services/geminiService';

// --- 预设数据源 ---
const SUGGESTED_CATEGORIES = [
  '办公文具', '打印耗材', 'IT 电子设备', '办公家具', '网络设施', 
  '保洁服务', '饮用水供应', '装修维修', '租赁服务', '软件服务'
];

const SUGGESTED_BANKS = [
  '中国工商银行', '中国建设银行', '中国银行', '中国农业银行', 
  '招商银行', '交通银行', '平安银行', '浦发银行', '中信银行', 
  '中国民生银行', '兴业银行', '广发银行', '邮储银行', '北京银行'
];

// --- Searchable Input Component ---
interface SearchableInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

const SearchableInput: React.FC<SearchableInputProps> = ({ value, onChange, options, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          required={required}
          className="w-full border border-slate-200 p-2.5 pr-8 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-sm"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <ChevronDown 
          size={16} 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" 
        />
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto animate-fade-in">
          {filteredOptions.map((opt, idx) => (
            <li 
              key={idx}
              className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-slate-700"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- MultiSelect Category Component ---
interface CategoryTagInputProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  suggestions: string[];
}

const CategoryTagInput: React.FC<CategoryTagInputProps> = ({ selectedCategories, onChange, suggestions }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const addCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (trimmed && !selectedCategories.includes(trimmed)) {
      onChange([...selectedCategories, trimmed]);
    }
    setInputValue('');
  };

  const removeCategory = (cat: string) => {
    onChange(selectedCategories.filter(c => c !== cat));
  };

  const filteredSuggestions = suggestions.filter(s => 
    !selectedCategories.includes(s) && 
    s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
        {selectedCategories.map(cat => (
          <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 group">
            <Tag size={10} />
            {cat}
            <button type="button" onClick={() => removeCategory(cat)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input 
          type="text" 
          className="w-full border border-slate-200 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-sm"
          placeholder="输入后按回车或从下方选择品类..."
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCategory(inputValue);
              setIsOpen(false);
            }
          }}
        />
        {isOpen && (inputValue || filteredSuggestions.length > 0) && (
          <ul className="absolute z-50 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.map((s, idx) => (
              <li key={idx} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-slate-700" onClick={() => { addCategory(s); setIsOpen(false); }}>
                {s}
              </li>
            ))}
            {inputValue && !suggestions.includes(inputValue) && !selectedCategories.includes(inputValue) && (
              <li className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-sm text-emerald-700 font-bold border-t" onClick={() => { addCategory(inputValue); setIsOpen(false); }}>
                + 添加自定义品类: "{inputValue}"
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

interface SupplierManagerProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  isReadOnly?: boolean;
  initialSearchTerm?: string;
  onShowToast?: ShowToastFunction;
  onConfirm?: ConfirmFunction;
  settings: AppSettings;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({ suppliers, setSuppliers, isReadOnly = false, initialSearchTerm = '', onShowToast, onConfirm, settings }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [smartPasteText, setSmartPasteText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  useEffect(() => {
    if (initialSearchTerm) setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const initialFormState: Omit<Supplier, 'id'> = {
    name: '',
    email: '',
    logo: '',
    contacts: [{ name: '', phone: '', email: '' }], 
    address: '',
    categories: [], 
    rating: 5,
    status: 'active',
    bankName: '',
    bankBranch: '',
    bankAccount: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleOpenModal = (supplier?: Supplier) => {
    if (isReadOnly) return;
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({ ...supplier });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setSmartPasteText('');
    setIsModalOpen(true);
  };

  const handleSmartIdentify = async () => {
    if (!smartPasteText.trim()) {
        if (onShowToast) onShowToast('请输入需要解析的内容', 'warning');
        return;
    }
    setIsAiProcessing(true);
    try {
        const result = await parseSupplierInfo(smartPasteText, settings);
        if (result) {
            setFormData(prev => ({
                ...prev,
                name: result.name || prev.name,
                address: result.address || prev.address,
                email: result.email || prev.email,
                bankName: result.bankName || prev.bankName,
                bankBranch: result.bankBranch || prev.bankBranch,
                bankAccount: result.bankAccount || prev.bankAccount,
                contacts: result.contacts && result.contacts.length > 0 ? result.contacts : prev.contacts
            }));
            if (onShowToast) onShowToast('AI 智能识别成功，已自动填充', 'success');
        } else {
            if (onShowToast) onShowToast('AI 解析返回空结果，请检查内容', 'warning');
        }
    } catch (err) {
        if (onShowToast) onShowToast('智能识别过程发生错误', 'error');
    } finally {
        setIsAiProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    
    if (editingId) {
      setSuppliers(prev => prev.map(s => s.id === editingId ? { 
          ...formData, 
          id: editingId,
          updatedAt: now 
      } : s));
      if (onShowToast) onShowToast('供应商档案已更新', 'success');
    } else {
      setSuppliers(prev => [...prev, { 
          ...formData, 
          id: Math.random().toString(36).substr(2, 9),
          createdAt: now, 
          updatedAt: now
      }]);
      if (onShowToast) onShowToast('新供应商已成功录入', 'success');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    const action = () => {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      if (onShowToast) onShowToast('供应商档案已移除', 'info');
    };
    if (onConfirm) onConfirm('确认删除', '确定要彻底删除该供应商档案吗？此操作无法撤销。', action);
    else if (window.confirm('确定要删除该供应商吗？')) action();
  };

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [jumpPage, setJumpPage] = useState('');

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory, filterStatus, itemsPerPage]);

  const kpiData = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    withBank: suppliers.filter(s => !!s.bankAccount).length,
    avgRating: suppliers.length > 0 ? (suppliers.reduce((sum, s) => sum + (s.rating || 5), 0) / suppliers.length).toFixed(1) : '5.0'
  }), [suppliers]);

  const getStatusLabel = (status: string) => {
      switch (status) {
          case 'active': return '合作中';
          case 'in_stock': return '在库内';
          case 'inactive': return '已停用';
          default: return '未知';
      }
  };

  const getStatusClass = (status: string) => {
      switch (status) {
          case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
          case 'in_stock': return 'bg-blue-50 text-blue-700 border-blue-100';
          case 'inactive': return 'bg-slate-50 text-slate-500 border-slate-100';
          default: return 'bg-slate-50 text-slate-500';
      }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(term) || 
        (s.email || '').toLowerCase().includes(term) ||
        (s.contacts || []).some(c => c.name.toLowerCase().includes(term) || c.phone.includes(term));
      const matchesCategory = filterCategory === 'ALL' || (s.categories || []).includes(filterCategory);
      const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [suppliers, searchTerm, filterCategory, filterStatus]);

  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(start, start + itemsPerPage);
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / itemsPerPage));
  const emptyRowsCount = Math.max(0, itemsPerPage - paginatedSuppliers.length);

  const getPageNumbers = () => {
    const pages = [];
    const threshold = 7;
    if (totalPages <= threshold) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const renderStars = (rating: number) => (
    <div className="flex justify-center text-amber-400">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={14} fill={i < rating ? "currentColor" : "none"} stroke="currentColor" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 顶部 KPI 汇总卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-bold uppercase">供应商总数</p><p className="text-2xl font-bold text-slate-800 mt-1">{kpiData.total}</p></div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><Building2 size={20} /></div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-bold uppercase">合作中供应商</p><p className="text-2xl font-bold text-emerald-600 mt-1">{kpiData.active}</p></div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={20} /></div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-bold uppercase">完备财务账户</p><p className="text-2xl font-bold text-blue-600 mt-1">{kpiData.withBank}</p></div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><CreditCard size={20} /></div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-bold uppercase">平均信用星级</p><p className="text-2xl font-bold text-amber-500 mt-1">{kpiData.avgRating} <span className="text-xs font-normal text-slate-400">/ 5.0</span></p></div>
            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-lg"><Star size={20} fill="currentColor" /></div>
         </div>
      </div>

      {/* 筛选与操作栏 */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
         <div className="flex flex-wrap items-center gap-3 w-full flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="快速查找供应商名称、联系人、手机号..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
            </div>
            <select 
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-600 font-bold outline-none" 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="ALL">所有品类</option>
              {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select 
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-600 font-bold outline-none" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">所有状态</option>
              <option value="active">合作中</option>
              <option value="in_stock">在库内</option>
              <option value="inactive">已停用</option>
            </select>
         </div>
         {!isReadOnly && (
            <button 
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm active:scale-95 whitespace-nowrap text-sm font-bold"
            >
                <Plus size={18} /> 新增供应商
            </button>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-[20%]">企业信息 (品类/状态)</th>
                <th className="px-6 py-4 w-[25%]">财务收款信息 (核心)</th>
                <th className="px-6 py-4 w-[35%]">业务负责人 (多联系人并行)</th>
                <th className="px-6 py-4 w-[10%] text-center">信用评分</th>
                <th className="px-6 py-4 w-[10%] text-center">操作管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSuppliers.length > 0 ? (
                paginatedSuppliers.map(supplier => (
                    <tr key={supplier.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                             {supplier.logo ? <img src={supplier.logo} alt={supplier.name} className="w-full h-full object-contain p-0.5" /> : <Building2 className="text-indigo-600" size={20} />}
                          </div>
                          <div className="min-w-0">
                              <div className="font-black text-slate-900 text-sm truncate" title={supplier.name}>{supplier.name}</div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                  {(supplier.categories || []).map(cat => (
                                      <span key={cat} className="inline-block px-1.5 py-0.5 rounded border border-indigo-100 text-[9px] text-indigo-600 bg-indigo-50 font-bold uppercase">{cat}</span>
                                  ))}
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border uppercase ${getStatusClass(supplier.status)}`}>
                                      {getStatusLabel(supplier.status)}
                                  </span>
                              </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                         <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs truncate" title={supplier.bankName}>
                                <Landmark size={14} className="text-indigo-500 shrink-0"/> {supplier.bankName || '未录入银行'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium pl-5 truncate" title={supplier.bankBranch}>
                                {supplier.bankBranch || '未录入支行网点'}
                            </div>
                            <div className="bg-white border border-slate-100 px-2 py-1.5 rounded font-mono text-indigo-700 tracking-wider text-[11px] font-bold select-all flex items-center justify-between">
                                {supplier.bankAccount || '-'}
                                <CreditCard size={12} className="opacity-30" />
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-2.5">
                          {supplier.contacts.map((contact, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 bg-white border border-slate-100 px-3 py-2 rounded-lg shadow-sm hover:border-indigo-300 transition-colors shrink-0 max-w-[180px]">
                                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shrink-0">
                                      <User size={14} />
                                  </div>
                                  <div className="min-w-0">
                                      <div className="font-bold text-slate-900 text-xs truncate">{contact.name}</div>
                                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                          <Phone size={10} className="text-slate-400" /> {contact.phone}
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {supplier.contacts.length === 0 && <span className="text-xs text-slate-300 italic">暂无联系人信息</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-center">
                        <div className="mt-2">{renderStars(supplier.rating)}</div>
                      </td>
                      <td className="px-6 py-4 text-center align-top">
                        <div className="flex justify-center gap-1.5 mt-1">
                          <button onClick={() => handleOpenModal(supplier)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-100 transition-all" title="编辑档案"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(supplier.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-100 transition-all" title="删除档案"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                            <Building2 size={40} className="opacity-20" />
                        </div>
                        <span className="text-sm font-medium">暂无供应商数据，点击上方“新增供应商”开始录入</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页与统计底栏 */}
        {filteredSuppliers.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
             <div className="text-xs text-slate-500">
               共 <span className="font-bold text-slate-700">{filteredSuppliers.length}</span> 家供应商，每页显示
               <select 
                 className="mx-1 border border-slate-200 rounded px-1.5 py-0.5 text-xs bg-white font-bold outline-none"
                 value={itemsPerPage}
                 onChange={(e) => setItemsPerPage(Number(e.target.value))}
               >
                 <option value={10}>10</option>
                 <option value={20}>20</option>
                 <option value={50}>50</option>
               </select>
               条
             </div>

             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((p, idx) => (
                    typeof p === 'number' ? (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === p ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={idx} className="px-1 text-slate-400 text-xs">...</span>
                    )
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
             </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] overflow-hidden animate-slide-up flex flex-col border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
                <Building2 className="text-indigo-600" size={24} />
                {editingId ? '完善供应商档案' : '录入新供应商'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
              {/* 板块: 智能解析 */}
              <div className="bg-indigo-50/60 p-6 rounded-2xl border border-indigo-100 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-indigo-700">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                            <Zap size={16} fill="currentColor" />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest">智能识别粘贴 (AI解析)</h4>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter">支持姓名、电话、地址、开户行全自动提取</span>
                  </div>
                  <div className="flex gap-4">
                    <textarea 
                        className="flex-1 border border-indigo-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-28 bg-white/90 resize-none shadow-sm placeholder:text-slate-300 transition-all font-medium"
                        placeholder="在此处粘贴非结构化文本 (如：微信消息、公司抬头信息、发票资料等)..."
                        value={smartPasteText}
                        onChange={(e) => setSmartPasteText(e.target.value)}
                    />
                    <button 
                        type="button"
                        disabled={isAiProcessing || !smartPasteText.trim()}
                        onClick={handleSmartIdentify}
                        className="w-32 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 flex flex-col items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs uppercase tracking-widest"
                    >
                        {isAiProcessing ? <Loader2 size={24} className="animate-spin" /> : <Wand2 size={24} />}
                        {isAiProcessing ? '识别中' : '智能解析'}
                    </button>
                  </div>
              </div>

              {/* 板块 1: 企业基础资料及财务信息 */}
              <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-50 pb-3">
                    <Building2 size={14}/> 企业基础资料与财务信息
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">企业全称 *</label>
                        <input required type="text" className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold placeholder:font-normal" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例如：北京XX科技有限公司" />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">企业通用邮箱</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input type="email" className="w-full border border-slate-200 pl-11 pr-4 py-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="company@example.com" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">当前合作状态</label>
                        <select className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold bg-white outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                            <option value="active">合作中 (Active)</option>
                            <option value="in_stock">在库内 (In-Stock)</option>
                            <option value="inactive">已停用 (Inactive)</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">办公/经营地址</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input type="text" className="w-full border border-slate-200 pl-11 pr-4 py-3 rounded-xl text-sm bg-white outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="输入详细地址信息" />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">核心供应品类</label>
                        <CategoryTagInput 
                            selectedCategories={formData.categories}
                            onChange={(cats) => setFormData({...formData, categories: cats})}
                            suggestions={SUGGESTED_CATEGORIES}
                        />
                      </div>

                      {/* 财务信息区域 */}
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="md:col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-1">
                          <CreditCard size={14} className="text-indigo-400"/> 核心财务收款信息
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-tighter">开户银行名称</label>
                          <SearchableInput 
                            value={formData.bankName} 
                            onChange={(val) => setFormData({...formData, bankName: val})} 
                            options={SUGGESTED_BANKS}
                            placeholder="请搜索或手动输入银行名称"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-tighter">开户网点 (支行名称)</label>
                          <input type="text" className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white outline-none focus:ring-1 focus:ring-indigo-300" value={formData.bankBranch} onChange={e => setFormData({...formData, bankBranch: e.target.value})} placeholder="XX银行XX省XX分行XX支行" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-tighter">结算银行账号 / 对公账号</label>
                          <div className="relative">
                            <input type="text" className="w-full border border-slate-200 p-4 rounded-xl text-lg font-mono font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white tracking-widest shadow-sm" value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} placeholder="输入完整的银行卡号或对公账号" />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200">
                                <Landmark size={24} />
                            </div>
                          </div>
                        </div>
                      </div>
                  </div>
              </div>

              {/* 板块 2: 联系人信息 */}
              <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <User size={14} /> 核心业务负责人 (可添加多个)
                    </h4>
                    <button type="button" onClick={() => setFormData({ ...formData, contacts: [...formData.contacts, { name: '', phone: '', email: '' }] })} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 text-xs font-black uppercase tracking-tighter hover:scale-105 transition-transform">
                      <PlusCircle size={16} /> 添加新联系人
                    </button>
                  </div>
                  <div className="space-y-4">
                      {formData.contacts.map((contact, idx) => (
                        <div key={idx} className="relative p-5 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-10 gap-4 items-end group hover:border-indigo-200 transition-all hover:shadow-md">
                            <div className="md:col-span-3">
                              <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-tighter">负责人姓名 *</label>
                              <input required type="text" placeholder="姓名" className="w-full border border-slate-100 p-2.5 rounded-lg text-sm outline-none bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-300" value={contact.name} onChange={e => {
                                  const newContacts = [...formData.contacts];
                                  newContacts[idx].name = e.target.value;
                                  setFormData({...formData, contacts: newContacts});
                              }} />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-tighter">业务手机号码 *</label>
                              <input required type="text" placeholder="手机号" className="w-full border border-slate-100 p-2.5 rounded-lg text-sm outline-none bg-slate-50 focus:bg-white font-mono focus:ring-1 focus:ring-indigo-300" value={contact.phone} onChange={e => {
                                  const newContacts = [...formData.contacts];
                                  newContacts[idx].phone = e.target.value;
                                  setFormData({...formData, contacts: newContacts});
                              }} />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-tighter">个人/业务邮箱</label>
                              <input type="email" placeholder="email@example.com" className="w-full border border-slate-100 p-2.5 rounded-lg text-sm outline-none bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-300" value={contact.email} onChange={e => {
                                  const newContacts = [...formData.contacts];
                                  newContacts[idx].email = e.target.value;
                                  setFormData({...formData, contacts: newContacts});
                              }} />
                            </div>
                            <div className="md:col-span-1 flex justify-center pb-2">
                              <button 
                                type="button" 
                                disabled={formData.contacts.length <= 1}
                                onClick={() => setFormData({...formData, contacts: formData.contacts.filter((_, i) => i !== idx)})} 
                                className="text-slate-200 hover:text-red-500 transition-colors disabled:opacity-0"
                              >
                                  <Trash2 size={20} />
                              </button>
                            </div>
                        </div>
                      ))}
                  </div>
              </div>
              
              <div className="pt-8 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all">取消退出</button>
                <button type="submit" className="px-14 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200 font-black text-sm uppercase tracking-[0.2em]">
                    {editingId ? '保存档案修改' : '确认录入档案'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
