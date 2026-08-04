
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComputerUsageRecord, ComputerType, ComputerSpecs, ComputerStatus, ShowToastFunction, ConfirmFunction, AppSettings } from '../types';
import * as XLSX from 'xlsx';
import { 
  Plus, Search, Edit2, Trash2, Monitor, Laptop, User, Cpu, 
  ChevronLeft, ChevronRight, FileSpreadsheet, UploadCloud, 
  Download, Wand2, Info, CircleDot, LayoutGrid, Gamepad2, HardDrive, Zap, Layers, Volume2, Wifi, X, Settings, Calendar, PlusCircle, MinusCircle
} from 'lucide-react';

interface ComputerUsageManagerProps {
  records: ComputerUsageRecord[];
  setRecords: React.Dispatch<React.SetStateAction<ComputerUsageRecord[]>>;
  isReadOnly?: boolean;
  initialSearchTerm?: string;
  onShowToast?: ShowToastFunction;
  onConfirm?: ConfirmFunction;
  settings: AppSettings;
}

export const ComputerUsageManager: React.FC<ComputerUsageManagerProps> = ({ records, setRecords, isReadOnly = false, initialSearchTerm = '', onShowToast, onConfirm, settings }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filterType, setFilterType] = useState<ComputerType | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [jumpPage, setJumpPage] = useState('');
  const [smartInputText, setSmartInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (initialSearchTerm) setSearchTerm(initialSearchTerm); }, [initialSearchTerm]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, itemsPerPage]);

  const initialSpecs: ComputerSpecs = { cpu: '', ram: '', gpu: '', storage: '', monitor: '', motherboard: '', soundCard: '', networkCard: '' };
  const initialFormState: Omit<ComputerUsageRecord, 'id'> = {
    deviceCode: '', assetName: '', type: ComputerType.LAPTOP, user: '', department: '',
    assignDate: new Date().toISOString().split('T')[0],
    notes: '', status: ComputerStatus.IN_USE, specs: initialSpecs
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- 导出功能 ---
  const handleExportExcel = () => {
    const data = records.map(r => ({
      "设备名称": r.assetName,
      "资产编号": r.deviceCode,
      "设备类型": r.type,
      "领用人": r.user,
      "部门": r.department,
      "领用日期": r.assignDate,
      "当前状态": r.status,
      "处理器(CPU)": r.specs?.cpu || '',
      "内存(RAM)": r.specs?.cpu || '',
      "显卡(GPU)": r.specs?.gpu || '',
      "硬盘(Storage)": r.specs?.storage || '',
      "显示器(Monitor)": r.specs?.monitor || '',
      "主板": r.specs?.motherboard || '',
      "备注说明": r.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "电脑领用清单");
    XLSX.writeFile(wb, `电脑领用记录_${new Date().toISOString().split('T')[0]}.xlsx`);
    if (onShowToast) onShowToast('导出成功', 'success');
  };

  // --- 下载模板功能 ---
  const handleDownloadTemplate = () => {
    const headers = [["设备名称", "资产编号", "设备类型", "领用人", "部门", "领用日期", "当前状态", "处理器(CPU)", "内存(RAM)", "显卡(GPU)", "硬盘(Storage)", "显示器(Monitor)", "主板", "备注说明"]];
    const example = [["行政台式机", "DT-2025-ABCD", "台式机", "张三", "行政部", "2025-01-01", "已领用", "Intel i7-13700", "32GB", "RTX 4060", "1TB SSD", "27寸显示器", "B760M", "测试数据"]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "领用录入模板");
    XLSX.writeFile(wb, "电脑领用批量导入模板.xlsx");
  };

  // --- 导入功能 ---
  const triggerImport = () => fileInputRef.current?.click();

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        if (onShowToast) onShowToast('Excel 文件中未发现有效数据', 'error');
        return;
      }

      const newRecords: ComputerUsageRecord[] = jsonData.map((row: any, idx: number) => ({
        id: `imp-${Date.now()}-${idx}`,
        assetName: row["设备名称"] || '未命名设备',
        deviceCode: row["资产编号"] || `IMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        type: (row["设备类型"] === '台式机' ? ComputerType.DESKTOP : ComputerType.LAPTOP),
        user: row["领用人"] || '未知',
        department: row["部门"] || '未分类',
        assignDate: row["领用日期"] || new Date().toISOString().split('T')[0],
        status: (Object.values(ComputerStatus).includes(row["当前状态"]) ? row["当前状态"] : ComputerStatus.IN_USE) as ComputerStatus,
        specs: {
          cpu: String(row["处理器(CPU)"] || ''),
          ram: String(row["内存(RAM)"] || ''),
          gpu: String(row["显卡(GPU)"] || ''),
          storage: String(row["硬盘(Storage)"] || ''),
          monitor: String(row["显示器(Monitor)"] || ''),
          motherboard: String(row["主板"] || ''),
          soundCard: '',
          networkCard: ''
        },
        notes: row["备注说明"] || ''
      }));

      setRecords(prev => [...prev, ...newRecords]);
      if (onShowToast) onShowToast(`已成功导入 ${newRecords.length} 条记录`, 'success');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // 格式化规格显示（用于列表页）
  const formatSpecDisplay = (specStr: string | undefined) => {
    if (!specStr) return { text: '-', count: 0, rawItems: [] };
    const items = specStr.split('\n')
      .map(i => i.trim())
      .filter(i => i && !i.endsWith('：') && !i.endsWith(':')); 
    
    if (items.length === 0) return { text: '-', count: 0, rawItems: [] };
    
    const counts: Record<string, number> = {};
    items.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    
    const summaryArr: string[] = [];
    const seen = new Set<string>();
    items.forEach(item => {
      if (!seen.has(item)) {
        const count = counts[item];
        summaryArr.push(count > 1 ? `${item} x${count}` : item);
        seen.add(item);
      }
    });

    return { text: summaryArr.join(' + '), count: items.length, rawItems: items };
  };

  const handleSmartIdentify = () => {
    if (!smartInputText.trim()) return;

    const lines = smartInputText.split('\n').map(l => l.trim()).filter(l => l);
    const result: Record<string, string[]> = {
      cpu: [], ram: [], gpu: [], storage: [], monitor: [], motherboard: [], soundCard: [], networkCard: []
    };

    let currentCategory: string | null = null;
    const categoryMap: Record<string, string> = {
      '处理器': 'cpu', 'cpu': 'cpu',
      '主板': 'motherboard', 'motherboard': 'motherboard',
      '内存': 'ram', 'ram': 'ram',
      '显卡': 'gpu', 'gpu': 'gpu',
      '显示器': 'monitor', 'monitor': 'monitor',
      '磁盘': 'storage', '硬盘': 'storage', '存储': 'storage', 'storage': 'storage',
      '声卡': 'soundCard', '音频': 'soundCard', 'audio': 'soundCard', 'sound': 'soundCard',
      '网卡': 'networkCard', '网络': 'networkCard', 'network': 'networkCard', 'ethernet': 'networkCard'
    };

    lines.forEach(line => {
      const lowerLine = line.replace(/[:：]/g, '').toLowerCase().trim();
      const foundCategoryKey = Object.keys(categoryMap).find(k => 
        lowerLine === k.toLowerCase() || 
        (lowerLine.startsWith(k.toLowerCase()) && (line.includes(':') || line.includes('：')))
      );
      
      if (foundCategoryKey) {
        currentCategory = categoryMap[foundCategoryKey];
        const content = line.split(/[:：]/)[1]?.trim();
        if (content) result[currentCategory].push(content);
      } else if (currentCategory && line) {
        result[currentCategory].push(line);
      }
    });

    setFormData({
      ...formData,
      specs: {
        cpu: result.cpu.join('\n') || formData.specs?.cpu || '',
        ram: result.ram.join('\n') || formData.specs?.ram || '',
        gpu: result.gpu.join('\n') || formData.specs?.gpu || '',
        storage: result.storage.join('\n') || formData.specs?.storage || '',
        monitor: result.monitor.join('\n') || formData.specs?.monitor || '',
        motherboard: result.motherboard.join('\n') || formData.specs?.motherboard || '',
        soundCard: result.soundCard.join('\n') || formData.specs?.soundCard || '',
        networkCard: result.networkCard.join('\n') || formData.specs?.networkCard || ''
      }
    });
    if (onShowToast) onShowToast('解析成功，已自动填充配置明细', 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) setRecords(prev => prev.map(r => r.id === editingId ? { ...formData, id: editingId } : r));
    else setRecords(prev => [...prev, { ...formData, id: Math.random().toString(36).substr(2, 9) }]);
    setIsModalOpen(false);
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = r.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.deviceCode.toLowerCase().includes(searchTerm.toLowerCase());
      return (filterType === 'ALL' || r.type === filterType) && matchesSearch;
    });
  }, [records, searchTerm, filterType]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const emptyRowsCount = Math.max(0, itemsPerPage - paginatedRecords.length);

  // 分页页码生成逻辑 (同步库存管理)
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

  const handleJumpPage = () => {
    const targetPage = parseInt(jumpPage);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      setCurrentPage(targetPage);
    }
    setJumpPage('');
  };

  const SpecItem = ({ icon: Icon, value, title }: { icon: any, value: string | undefined, title: string }) => {
    const { text, count, rawItems } = formatSpecDisplay(value);
    const tooltipText = `${title}:\n${rawItems.join('\n') || '-'}`;
    
    return (
      <div className="flex items-center gap-2 truncate group/spec" title={tooltipText}>
        <div className="relative flex items-center justify-center w-5 h-5 rounded-md bg-slate-50 border border-slate-100 group-hover/spec:bg-blue-50 group-hover/spec:border-blue-100 transition-colors">
          <Icon size={12} className={`${count > 1 ? 'text-blue-600' : 'text-slate-400'}`} />
          {count > 1 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[7px] px-1 rounded-full font-black border border-white shadow-sm">
              {count}
            </span>
          )}
        </div>
        <span className={`truncate text-[11px] ${count > 1 ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          {text}
        </span>
      </div>
    );
  };

  // 内部辅助组件：多项输入器（用于硬盘和显示器）
  const MultiItemInput = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void 
  }) => {
    const items = value ? value.split('\n') : [''];

    const updateItem = (index: number, newVal: string) => {
      const newItems = [...items];
      newItems[index] = newVal;
      onChange(newItems.join('\n'));
    };

    const addItem = () => {
      onChange([...items, ''].join('\n'));
    };

    const removeItem = (index: number) => {
      if (items.length <= 1) {
        onChange('');
        return;
      }
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems.join('\n'));
    };

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] text-slate-400 font-medium uppercase">{label}</label>
          <button 
            type="button" 
            onClick={addItem}
            className="text-blue-600 hover:text-blue-700 p-0.5 rounded transition-colors flex items-center gap-1"
          >
            <PlusCircle size={14} />
            <span className="text-[10px] font-bold">添加更多</span>
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 group/input">
              <input 
                type="text" 
                className="flex-1 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all" 
                value={item} 
                placeholder={`输入 ${label.split(' ')[0]} 信息...`}
                onChange={e => updateItem(idx, e.target.value)} 
              />
              {items.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeItem(idx)}
                  className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/input:opacity-100"
                >
                  <MinusCircle size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
        <div className="p-3 border-b border-slate-100 flex flex-col xl:flex-row gap-4 justify-between items-center bg-white">
          <div className="flex flex-wrap items-center gap-2 flex-1 w-full">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button onClick={() => setFilterType('ALL')} className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'ALL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>全部</button>
                <button onClick={() => setFilterType(ComputerType.DESKTOP)} className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${filterType === ComputerType.DESKTOP ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>台式机</button>
                <button onClick={() => setFilterType(ComputerType.LAPTOP)} className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${filterType === ComputerType.LAPTOP ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>笔记本</button>
            </div>
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="搜索领用人、编号或设备..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
             {/* 导入导出按钮组 */}
             <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"><FileSpreadsheet size={14} /> 模板</button>
             {!isReadOnly && (
                <div className="relative">
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                    <button onClick={triggerImport} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg hover:bg-blue-100 text-xs font-bold transition-all active:scale-95"><UploadCloud size={14} /> 导入</button>
                </div>
             )}
             <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"><Download size={14} /> 导出</button>
             
             {!isReadOnly && <button onClick={() => { setEditingId(null); setFormData(initialFormState); setSmartInputText(''); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-all shadow-md text-sm font-bold active:scale-95"><Plus size={18} /> 新增登记</button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 table-fixed min-w-[1200px]">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-[18%]">资产信息</th>
                <th className="px-6 py-4 w-[10%]">设备类型</th>
                <th className="px-6 py-4 w-[42%]">硬件核心规格 (8项)</th>
                <th className="px-6 py-4 w-[12%]">领用信息</th>
                <th className="px-6 py-4 w-[10%]">状态</th>
                <th className="px-6 py-4 w-[8%] text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50/50 h-[110px] transition-colors group">
                    <td className="px-6 py-3">
                        <div className="flex flex-col justify-center h-full space-y-1 pl-2 border-l-4 border-transparent group-hover:border-blue-500 transition-all">
                            <div className="font-black text-slate-900 text-sm truncate">{record.assetName}</div>
                            <div className="text-[10px] text-slate-400 font-mono tracking-wider">{record.deviceCode}</div>
                        </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className={`inline-flex flex-col items-center justify-center p-2 rounded-xl border w-16 h-16 transition-all ${record.type === ComputerType.DESKTOP ? 'bg-slate-900 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-900'}`}>
                        {record.type === ComputerType.DESKTOP ? <Monitor size={20} className="mb-1 text-blue-400" /> : <Laptop size={20} className="mb-1 text-indigo-500" />}
                        <span className="text-[9px] font-black uppercase">{record.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                        <div className="space-y-2">
                          <SpecItem icon={Cpu} title="处理器" value={record.specs?.cpu} />
                          <SpecItem icon={CircleDot} title="内存" value={record.specs?.ram} />
                          <SpecItem icon={LayoutGrid} title="主板" value={record.specs?.motherboard} />
                          <SpecItem icon={Volume2} title="声卡" value={record.specs?.soundCard} />
                        </div>
                        <div className="space-y-2">
                          <SpecItem icon={Gamepad2} title="显卡" value={record.specs?.gpu} />
                          <SpecItem icon={HardDrive} title="硬盘" value={record.specs?.storage} />
                          <SpecItem icon={Monitor} title="显示器" value={record.specs?.monitor} />
                          <SpecItem icon={Wifi} title="网卡" value={record.specs?.networkCard} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-800 text-xs">{record.user}</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">{record.department}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block text-[10px] font-black border px-2 py-1 rounded-md uppercase tracking-wider ${record.status === ComputerStatus.IN_USE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {!isReadOnly && (
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(record.id); setFormData(record); setSmartInputText(''); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600 p-2"><Edit2 size={16} /></button>
                          <button onClick={() => onConfirm?.('确认删除', '确定要删除此领用记录吗？', () => setRecords(prev => prev.filter(r => r.id !== record.id)))} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {emptyRowsCount > 0 && [...Array(emptyRowsCount)].map((_, i) => (
                  <tr key={`empty-${i}`} className="h-[110px] opacity-[0.03] pointer-events-none">
                    <td colSpan={6} className="px-6 py-3"><div className="h-4 bg-slate-400 rounded w-full"></div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部统计及分页 (同步库存管理悬浮条样式) */}
      <div className="mt-6 px-6 py-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <span>共 {filteredRecords.length} 条数据</span>
            <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
              <span>每页:</span>
              <select 
                className="bg-transparent border-b border-slate-300 focus:outline-none py-0.5 cursor-pointer text-slate-800" 
                value={itemsPerPage} 
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                className="p-2 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1 mx-2">
                {getPageNumbers().map((p, i) => (
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-2 text-slate-400 text-xs font-bold">...</span>
                    ) : (
                      <button 
                        key={`page-${p}`} 
                        onClick={() => setCurrentPage(p as number)} 
                        className={`w-8 h-8 rounded text-xs font-bold transition-all ${currentPage === p ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-200 text-slate-500'}`}
                      >
                        {p}
                      </button>
                    )
                ))}
              </div>
              
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                className="p-2 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">跳至</span>
                <input 
                  type="number" 
                  min="1" 
                  max={totalPages} 
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJumpPage()}
                  onBlur={handleJumpPage}
                  className="w-10 h-8 border border-slate-200 rounded text-center text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none text-slate-700" 
                />
                <span className="text-[10px] text-slate-400 font-bold uppercase">页</span>
              </div>
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[94vh] animate-slide-up overflow-hidden flex flex-col border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold text-[#1E293B] tracking-tight">{editingId ? '编辑记录' : '新增记录'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              {/* Section: 基本信息 */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-[#1E293B]">基本信息</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">设备名称 / 型号</label>
                    <input required type="text" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={formData.assetName} onChange={e => setFormData({...formData, assetName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">设备类型</label>
                    <select className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm outline-none bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ComputerType})}>
                      <option value={ComputerType.DESKTOP}>台式机</option>
                      <option value={ComputerType.LAPTOP}>笔记本</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">领用人</label>
                    <input required type="text" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm outline-none" value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">部门</label>
                    <input required type="text" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm outline-none" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">领用日期</label>
                    <div className="relative">
                      <input required type="date" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm outline-none pr-10" value={formData.assignDate} onChange={e => setFormData({...formData, assignDate: e.target.value})} />
                      <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">当前状态</label>
                    <select className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm outline-none bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ComputerStatus})}>
                      {Object.values(ComputerStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Section: 硬件配置 */}
              <section className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-5">
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-slate-600" />
                  <h4 className="text-sm font-bold text-[#1E293B]">硬件配置</h4>
                </div>

                {/* 智能粘贴区域 */}
                <div className="bg-[#EFF6FF] p-4 rounded-xl border border-[#DBEAFE] space-y-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600">
                    <Zap size={14} /> 智能粘贴导入 (支持鲁大师、鲁大师工具箱等格式)
                  </div>
                  <div className="flex gap-3">
                    <textarea 
                      className="flex-1 border border-blue-100 bg-white rounded-lg p-3 text-xs h-20 focus:ring-1 focus:ring-blue-400 outline-none scrollbar-hide resize-none placeholder:text-slate-300" 
                      placeholder="在此处粘贴配置信息 (例如: 处理器 英特尔 i5... 系统将自动识别并填充下方字段)" 
                      value={smartInputText} 
                      onChange={(e) => setSmartInputText(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      onClick={handleSmartIdentify} 
                      className="px-4 bg-[#2563EB] text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center shadow-sm active:scale-95"
                    >
                      识别填充
                    </button>
                  </div>
                </div>

                {/* 规格字段网格 */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400 font-medium uppercase">处理器 (CPU)</label>
                    <input type="text" className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white" value={formData.specs?.cpu} onChange={e => setFormData({...formData, specs: {...formData.specs!, cpu: e.target.value}})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400 font-medium uppercase">内存 (RAM)</label>
                    <input type="text" className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white" value={formData.specs?.ram} onChange={e => setFormData({...formData, specs: {...formData.specs!, ram: e.target.value}})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400 font-medium uppercase">主板</label>
                    <input type="text" className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white" value={formData.specs?.motherboard} onChange={e => setFormData({...formData, specs: {...formData.specs!, motherboard: e.target.value}})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400 font-medium uppercase">显卡 (GPU)</label>
                    <input type="text" className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white" value={formData.specs?.gpu} onChange={e => setFormData({...formData, specs: {...formData.specs!, gpu: e.target.value}})} />
                  </div>
                  
                  {/* 支持多项录入的字段 */}
                  <MultiItemInput 
                    label="硬盘 (Storage)" 
                    value={formData.specs?.storage || ''} 
                    onChange={val => setFormData({...formData, specs: {...formData.specs!, storage: val}})}
                  />
                  <MultiItemInput 
                    label="显示器 (Monitor)" 
                    value={formData.specs?.monitor || ''} 
                    onChange={val => setFormData({...formData, specs: {...formData.specs!, monitor: val}})}
                  />
                </div>
              </section>

              {/* Section: 备注说明 */}
              <section className="space-y-2">
                <label className="block text-sm font-bold text-[#1E293B]">备注说明</label>
                <textarea className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none min-h-[80px] bg-white resize-none" placeholder="输入其他补充说明..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </section>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-white sticky bottom-0 z-10">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-500 hover:text-slate-800 rounded-lg text-sm font-medium transition-all">取消</button>
              <button type="submit" onClick={handleSubmit} className="px-8 py-2.5 bg-[#4F46E5] text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-all">保存记录</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
