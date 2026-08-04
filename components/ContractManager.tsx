
import React, { useState, useEffect, useMemo } from 'react';
import { Contract, ContractStatus, ContractType, Supplier, ContractFile, ShowToastFunction, ConfirmFunction, AppSettings } from '../types';
import { Plus, Search, Edit2, Trash2, FileText, Paperclip, Upload, X, Receipt, ArrowRight, ExternalLink, Loader2, Sparkles, ChevronLeft, ChevronRight, CheckCircle, DollarSign, AlertCircle, Building, FileCheck } from 'lucide-react';
import { extractAmountFromImage } from '../services/geminiService';

interface ContractManagerProps {
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  suppliers: Supplier[];
  isReadOnly?: boolean;
  initialSearchTerm?: string;
  onShowToast?: ShowToastFunction;
  onConfirm?: ConfirmFunction;
  settings: AppSettings;
}

// 辅助组件：时间进度条
const DateProgressBar = ({ startDate, endDate, status }: { startDate: string, endDate: string, status: ContractStatus }) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    
    if (status === ContractStatus.TERMINATED) return <div className="h-1.5 w-24 bg-red-200 rounded-full"></div>;
    
    let percentage = 0;
    if (now > end) percentage = 100;
    else if (now < start) percentage = 0;
    else percentage = ((now - start) / (end - start)) * 100;

    return (
        <div className="flex flex-col gap-1 w-32">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{startDate}</span>
                <span>{endDate}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full ${percentage >= 100 ? 'bg-slate-400' : percentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// 辅助组件：文件列表项 (Modal中使用)
const FileItem: React.FC<{ file: ContractFile, icon: any, colorClass: string, onDelete: () => void }> = ({ file, icon: Icon, colorClass, onDelete }) => (
  <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-xs shadow-sm group hover:border-blue-300 transition-colors">
      <div className="flex items-center gap-2 overflow-hidden min-w-0 cursor-pointer" onClick={() => window.open(file.url, '_blank')}>
          <Icon size={14} className={`${colorClass} shrink-0`} />
          <span className="truncate text-slate-600 font-medium hover:text-blue-600 hover:underline" title={file.name}>{file.name}</span>
      </div>
      <button 
          type="button" 
          onClick={onDelete} 
          className="text-slate-300 hover:text-red-500 shrink-0 ml-1 p-1 rounded hover:bg-red-50"
      >
          <X size={14} />
      </button>
  </div>
);

export const ContractManager: React.FC<ContractManagerProps> = ({ contracts, setContracts, suppliers, isReadOnly = false, initialSearchTerm = '', onShowToast, onConfirm, settings }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  useEffect(() => {
    if (initialSearchTerm) setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const initialFormState: Omit<Contract, 'id'> = {
    contractNumber: '',
    title: '',
    supplierId: '',
    supplierName: '',
    type: '', 
    amount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: ContractStatus.ACTIVE,
    attachments: []
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleOpenModal = (contract?: Contract) => {
    if (isReadOnly) return;
    if (contract) {
      setEditingId(contract.id);
      setFormData({ ...contract });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
    const finalData = {
        ...formData,
        supplierName: selectedSupplier ? selectedSupplier.name : formData.supplierName
    };

    if (editingId) {
      setContracts(prev => prev.map(c => c.id === editingId ? { ...finalData, id: editingId } : c));
      if (onShowToast) onShowToast('合同信息已更新', 'success');
    } else {
      setContracts(prev => [...prev, { ...finalData, id: Math.random().toString(36).substr(2, 9) }]);
      if (onShowToast) onShowToast('新合同已归档', 'success');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    const action = () => {
        setContracts(prev => prev.filter(c => c.id !== id));
        if (onShowToast) onShowToast('合同已删除', 'info');
    };
    if (onConfirm) onConfirm('确认删除', '确定要删除该合同归档吗？', action);
    else if (window.confirm('确定要删除该合同归档吗？')) action();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'invoice') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    const newAttachments: ContractFile[] = fileList.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: URL.createObjectURL(file),
        type: type,
        uploadDate: new Date().toISOString().split('T')[0]
    }));

    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));

    const targetFile = fileList[0];
    if (targetFile.type.startsWith('image/')) {
        setIsAiProcessing(true);
        if (onShowToast) onShowToast(`AI 正在识别${type === 'contract' ? '合同' : '发票'}金额...`, 'info');
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = (event.target?.result as string).split(',')[1];
            try {
                const extractedAmount = await extractAmountFromImage(base64Data, targetFile.type, settings);
                if (extractedAmount !== null && extractedAmount > 0) {
                    setFormData(prev => ({ ...prev, amount: extractedAmount }));
                    if (onShowToast) onShowToast(`AI 识别成功: ¥${extractedAmount.toLocaleString()}`, 'success');
                }
            } catch (err) {
                console.error("AI 识别错误:", err);
            } finally {
                setIsAiProcessing(false);
            }
        };
        reader.readAsDataURL(targetFile);
    }

    e.target.value = '';
  };

  const removeAttachment = (fileId: string) => {
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(f => f.id !== fileId) }));
  };

  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, filterStatus, itemsPerPage]);

  const kpiData = useMemo(() => ({
    total: contracts.length,
    activeAmount: contracts.filter(c => c.status === ContractStatus.ACTIVE).reduce((sum, c) => sum + (c.amount || 0), 0),
    pending: contracts.filter(c => c.status === ContractStatus.PENDING).length,
    hasAttachment: contracts.filter(c => c.attachments && c.attachments.length > 0).length
  }), [contracts]);

  const contractTypes = useMemo(() => {
    const types = new Set<string>();
    contracts.forEach(c => { if (c.type) types.add(c.type); });
    return Array.from(types);
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = c.title.toLowerCase().includes(term) || 
        c.contractNumber.toLowerCase().includes(term) ||
        c.supplierName.toLowerCase().includes(term);
      const matchesType = filterType === 'ALL' || c.type === filterType;
      const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contracts, searchTerm, filterType, filterStatus]);

  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(start, start + itemsPerPage);
  }, [filteredContracts, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / itemsPerPage));

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

  const getStatusStyle = (status: ContractStatus) => {
      switch (status) {
          case ContractStatus.ACTIVE: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
          case ContractStatus.PENDING: return 'bg-amber-50 text-amber-700 border-amber-200';
          case ContractStatus.EXPIRED: return 'bg-slate-50 text-slate-600 border-slate-200';
          case ContractStatus.TERMINATED: return 'bg-red-50 text-red-700 border-red-200';
          default: return 'bg-gray-50 text-gray-700';
      }
  };

  return (
    <div className="space-y-6">
      {/* 顶部 KPI 汇总卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-bold uppercase">合同归档总数</p><p className="text-2xl font-bold text-slate-800 mt-1">{kpiData.total}</p></div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={20} /></div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-bold uppercase">生效合同总额</p><p className="text-2xl font-bold text-emerald-600 mt-1">¥{kpiData.activeAmount.toLocaleString()}</p></div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-bold uppercase">待审批/即期处理</p><p className="text-2xl font-bold text-amber-500 mt-1">{kpiData.pending}</p></div>
            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-lg"><AlertCircle size={20} /></div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs text-slate-500 font-bold uppercase">附件已归档</p><p className="text-2xl font-bold text-blue-600 mt-1">{kpiData.hasAttachment} <span className="text-xs font-normal text-slate-400">份</span></p></div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><FileCheck size={20} /></div>
         </div>
      </div>

      {/* 筛选与操作栏 */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
         <div className="flex flex-wrap items-center gap-3 w-full flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="搜索合同号、标题、供应商..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
            </div>
            <select 
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-600 font-bold outline-none" 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">所有类型</option>
              {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select 
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-600 font-bold outline-none" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">所有状态</option>
              <option value={ContractStatus.ACTIVE}>生效中</option>
              <option value={ContractStatus.PENDING}>审批中</option>
              <option value={ContractStatus.EXPIRED}>已到期</option>
              <option value={ContractStatus.TERMINATED}>已解约</option>
            </select>
         </div>
         {!isReadOnly && (
            <button 
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm active:scale-95 whitespace-nowrap text-sm font-bold"
            >
                <Plus size={18} /> 新建合同
            </button>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-[25%]">合同信息</th>
                <th className="px-4 py-3 w-[20%]">供应商</th>
                <th className="px-4 py-3 w-[20%]">履约周期</th>
                <th className="px-4 py-3 w-[15%]">金额</th>
                <th className="px-4 py-3 w-[15%]">附件归档</th>
                <th className="px-4 py-3 w-[5%] text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContracts.length > 0 ? (
                paginatedContracts.map(contract => (
                  <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                            <div className="font-bold text-slate-900 text-sm truncate" title={contract.title}>{contract.title}</div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{contract.contractNumber}</span>
                                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-bold truncate max-w-[120px]">{contract.type || '未分类'}</span>
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                       <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0">{contract.supplierName.charAt(0)}</div>
                           <div className="text-sm text-slate-700 truncate" title={contract.supplierName}>{contract.supplierName}</div>
                       </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                        <DateProgressBar startDate={contract.startDate} endDate={contract.endDate} status={contract.status} />
                    </td>
                    <td className="px-4 py-3 align-top">
                        <div className="font-mono font-bold text-slate-800 text-sm">¥{contract.amount.toLocaleString()}</div>
                        <span className={`inline-flex mt-2 items-center px-1.5 py-0.5 rounded text-[9px] font-black border uppercase ${getStatusStyle(contract.status)}`}>
                            {contract.status}
                        </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                            {contract.attachments.slice(0, 2).map(f => (
                                <div key={f.id} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors truncate" onClick={() => window.open(f.url, '_blank')}>
                                    {f.type === 'contract' ? <FileText size={12} className="text-blue-400" /> : <Receipt size={12} className="text-amber-400" />}
                                    {f.name}
                                </div>
                            ))}
                            {contract.attachments.length > 2 && <span className="text-[10px] text-slate-400 italic">...等 {contract.attachments.length} 个文件</span>}
                            {contract.attachments.length === 0 && <span className="text-[10px] text-slate-300 italic">暂无附件</span>}
                        </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                        <div className="flex justify-end gap-1">
                            <button onClick={() => handleOpenModal(contract)} className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition-colors" title="编辑"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(contract.id)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="删除"><Trash2 size={16} /></button>
                        </div>
                    </td>
                  </tr>
                ))
              ) : <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">未发现相关合同归档记录。</td></tr>}
            </tbody>
          </table>
        </div>

        {/* 分页与统计底栏 */}
        {filteredContracts.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
             <div className="text-xs text-slate-500">
               共 <span className="font-bold text-slate-700">{filteredContracts.length}</span> 份合同，每页显示
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-slide-up flex flex-col border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? '编辑合同详情' : '新建合同归档'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">合同标题 *</label>
                    <input required type="text" className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">合同编号 *</label>
                    <input required type="text" className="w-full border border-slate-200 p-2.5 rounded-lg text-sm font-mono bg-white outline-none" value={formData.contractNumber} onChange={e => setFormData({...formData, contractNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">合同类型</label>
                    <input 
                      type="text" 
                      placeholder="例如: 采购合同, 软件授权..." 
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={formData.type} 
                      onChange={e => setFormData({...formData, type: e.target.value})} 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">关联供应商</label>
                    <select required className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white outline-none" value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                        <option value="">请选择供应商...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">生效日期</label>
                    <input required type="date" className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">截止日期</label>
                    <input required type="date" className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white outline-none" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex justify-between items-center">
                        合同总额 (¥)
                        {isAiProcessing && <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-black animate-pulse"><Loader2 size={10} className="animate-spin" /> AI 识别中...</span>}
                    </label>
                    <div className="relative">
                        <input 
                            required 
                            type="number" 
                            className={`w-full border border-slate-200 p-2.5 rounded-lg text-sm font-bold bg-white outline-none transition-all ${isAiProcessing ? 'opacity-50' : 'opacity-100'}`} 
                            value={formData.amount} 
                            onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                        />
                        {formData.amount > 0 && !isAiProcessing && <Sparkles size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 opacity-50" />}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">当前状态</label>
                    <select className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white outline-none font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ContractStatus})}>
                        {Object.values(ContractStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <Sparkles size={16} className="text-indigo-500" />
                          <span className="text-indigo-700">AI 智能辅助：上传图片自动提取金额</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                              <label className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider"><FileText size={14} /> 合同原件/扫描件</label>
                              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 text-center transition-all hover:bg-white hover:border-indigo-400 group relative">
                                  <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                      <Upload size={24} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                      <span className="text-xs text-slate-500 font-bold">点击上传图片/PDF</span>
                                      <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'contract')} />
                                  </label>
                              </div>
                              <div className="flex flex-col gap-2">
                                  {formData.attachments.filter(f => f.type === 'contract').map(file => (
                                      <FileItem key={file.id} file={file} icon={FileText} colorClass="text-blue-500" onDelete={() => removeAttachment(file.id)} />
                                  ))}
                              </div>
                          </div>
                          <div className="space-y-3">
                              <label className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider"><Receipt size={14} /> 财务发票凭证</label>
                              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 text-center transition-all hover:bg-white hover:border-amber-400 group relative">
                                  <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                      <Upload size={24} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                                      <span className="text-xs text-slate-500 font-bold">点击上传发票凭证</span>
                                      <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'invoice')} />
                                  </label>
                              </div>
                              <div className="flex flex-col gap-2">
                                  {formData.attachments.filter(f => f.type === 'invoice').map(file => (
                                      <FileItem key={file.id} file={file} icon={Receipt} colorClass="text-amber-500" onDelete={() => removeAttachment(file.id)} />
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-bold transition-all">取消</button>
                <button type="submit" className="px-10 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-95 transition-all shadow-lg font-black text-sm uppercase tracking-widest">保存归档记录</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
