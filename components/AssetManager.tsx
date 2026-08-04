
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FixedAsset, AssetStatus, ShowToastFunction, ConfirmFunction, AppSettings } from '../types';
import * as XLSX from 'xlsx';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, FileSpreadsheet, UploadCloud, Download, RefreshCw, Calculator, Calendar, Coins, History, X, Info, Trash, CheckSquare, Square, MapPin, Upload } from 'lucide-react';
import { LocationCell } from './LocationCell';

interface AssetManagerProps {
  assets: FixedAsset[];
  setAssets: React.Dispatch<React.SetStateAction<FixedAsset[]>>;
  isReadOnly?: boolean;
  initialSearchTerm?: string;
  onShowToast?: ShowToastFunction;
  onConfirm?: ConfirmFunction;
  settings: AppSettings;
}

export const AssetManager: React.FC<AssetManagerProps> = ({ assets, setAssets, isReadOnly = false, initialSearchTerm = '', onShowToast, onConfirm, settings }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 多选状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [jumpPage, setJumpPage] = useState('');

  useEffect(() => { if (initialSearchTerm) setSearchTerm(initialSearchTerm); }, [initialSearchTerm]);
  useEffect(() => { 
    setCurrentPage(1); 
    setSelectedIds(new Set()); // 切换搜索或筛选时重置选择
  }, [searchTerm, statusFilter, itemsPerPage]);

  const initialFormState: Omit<FixedAsset, 'id'> = {
    name: '',
    assetCode: '',
    activationDate: new Date().toISOString().split('T')[0],
    depreciationStartDate: new Date().toISOString().split('T')[0],
    originalValue: 0,
    vatAmount: 0,
    netValueExTax: 0,
    usefulLifeYears: 5,
    residualRate: 5,
    residualValue: 0,
    monthlyDepreciation: 0,
    annualDepreciation: 0,
    monthsDepreciated: 0,
    currentMonthDepreciation: 0,
    accumulatedDepreciation: 0,
    netBookValue: 0,
    remainingDepreciation: 0,
    status: AssetStatus.ACTIVE,
    location: '',
    locationImage: ''
  };

  const [formData, setFormData] = useState<Omit<FixedAsset, 'id'>>(initialFormState);

  const handleUpdateAssetLocationImage = (id: string, imageBase64: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, locationImage: imageBase64 } : a));
    if (onShowToast) onShowToast('存放位置示意图已更新', 'success');
  };

  // --- 辅助工具：日期格式化 ---
  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    
    // 如果是数字（Excel 内部日期序列号）
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // 如果是字符串，尝试转换
    try {
      const dateStr = String(val).replace(/\//g, '-'); // 将 2024/10/1 转换为 2024-10-1
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Date parse error', e);
    }
    
    return String(val);
  };

  // --- 核心逻辑：数据修正 (基于当前时间重算所有资产) ---
  const handleRecalculateData = () => {
    onConfirm?.('数据财务修正', '系统将基于今天的时间重新计算所有资产的已提折旧、累计折旧及净值，确定继续吗？', () => {
      const now = new Date();
      const updatedAssets = assets.map(asset => {
        const startDate = new Date(asset.depreciationStartDate);
        if (isNaN(startDate.getTime())) return asset;

        // 1. 基本计算因子
        const resRate = asset.residualRate || 5;
        const resValue = Number((asset.originalValue * (resRate / 100)).toFixed(2));
        const depreciableTotal = asset.originalValue - resValue;
        const totalMonths = asset.usefulLifeYears * 12;
        
        // 2. 月折旧额
        const monthlyDep = totalMonths > 0 ? Number((depreciableTotal / totalMonths).toFixed(2)) : 0;
        
        // 3. 计算已提月份 (北京时间今天)
        let months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
        const monthsDepreciated = Math.max(0, months);
        
        // 4. 累计与净值
        const accumulatedDep = Number(Math.min(depreciableTotal, monthlyDep * monthsDepreciated).toFixed(2));
        const netValue = Number((asset.originalValue - accumulatedDep).toFixed(2));
        const remainingDep = Number((depreciableTotal - accumulatedDep).toFixed(2));

        return {
          ...asset,
          residualValue: resValue,
          monthlyDepreciation: monthlyDep,
          annualDepreciation: Number((monthlyDep * 12).toFixed(2)),
          monthsDepreciated: monthsDepreciated,
          currentMonthDepreciation: monthlyDep,
          accumulatedDepreciation: accumulatedDep,
          netBookValue: netValue,
          remainingDepreciation: remainingDep
        };
      });

      setAssets(updatedAssets);
      if (onShowToast) onShowToast('所有资产财务数据已修正至当前日期', 'success');
    });
  };

  // --- 自动计算逻辑 (表单内部使用) ---
  useEffect(() => {
    const calc = { ...formData };
    calc.netValueExTax = Number((calc.originalValue - calc.vatAmount).toFixed(2));
    calc.residualValue = Number((calc.originalValue * (calc.residualRate / 100)).toFixed(2));
    const depreciableTotal = calc.originalValue - calc.residualValue;
    const totalMonths = calc.usefulLifeYears * 12;
    if (totalMonths > 0) {
      calc.monthlyDepreciation = Number((depreciableTotal / totalMonths).toFixed(2));
      calc.annualDepreciation = Number((calc.monthlyDepreciation * 12).toFixed(2));
      calc.currentMonthDepreciation = calc.monthlyDepreciation;
    }
    const startDate = new Date(calc.depreciationStartDate);
    const now = new Date();
    let months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    calc.monthsDepreciated = Math.max(0, months);
    calc.accumulatedDepreciation = Number(Math.min(depreciableTotal, calc.monthlyDepreciation * calc.monthsDepreciated).toFixed(2));
    calc.netBookValue = Number((calc.originalValue - calc.accumulatedDepreciation).toFixed(2));
    calc.remainingDepreciation = Number((depreciableTotal - calc.accumulatedDepreciation).toFixed(2));

    if (JSON.stringify(calc) !== JSON.stringify(formData)) {
      setFormData(calc);
    }
  }, [formData.originalValue, formData.vatAmount, formData.residualRate, formData.usefulLifeYears, formData.depreciationStartDate]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.assetCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assets, searchTerm, statusFilter]);

  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(start, start + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / itemsPerPage));
  const emptyRowsCount = Math.max(0, itemsPerPage - paginatedAssets.length);

  const getPageNumbers = () => {
    const pages = [];
    const threshold = 7;
    if (totalPages <= threshold) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
      else if (currentPage >= totalPages - 3) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  // --- 多选处理 ---
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedAssets.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    onConfirm?.('批量删除', `确定要删除选中的 ${selectedIds.size} 项资产吗？`, () => {
      setAssets(prev => prev.filter(a => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
      if (onShowToast) onShowToast('批量删除成功', 'success');
    });
  };

  const handleClearAll = () => {
    onConfirm?.('清空资产库', '警告：此操作将永久删除系统内所有固定资产记录，确定继续吗？', () => {
      setAssets([]);
      setSelectedIds(new Set());
      if (onShowToast) onShowToast('资产库已清空', 'warning');
    });
  };

  // --- 智能导入逻辑 (自动读取表头) ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (rawRows.length < 2) {
              if (onShowToast) onShowToast('Excel 文件数据不足', 'error');
              return;
          }

          // 1. 扫描前10行寻找表头
          let headerIdx = -1;
          const targetHeaders = ['名称', '资产编号', '启用日期', '折旧起始日期', '原值', '增值税', '折旧年限', '残值率'];
          for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
              const row = rawRows[i].map(c => String(c || '').trim());
              if (row.some(c => targetHeaders.some(t => c.includes(t)))) {
                  headerIdx = i;
                  break;
              }
          }

          if (headerIdx === -1) {
              if (onShowToast) onShowToast('未识别到标准表头，请参考模板格式', 'error');
              return;
          }

          const headerRow = rawRows[headerIdx].map(c => String(c || '').trim());
          const findCol = (keywords: string[]) => headerRow.findIndex(h => keywords.some(k => h.includes(k)));

          const mapping = {
              name: findCol(['名称', '设备名', '资产名']),
              code: findCol(['资产编号', '编号', 'Code']),
              actDate: findCol(['启用日期', '使用日期']),
              depDate: findCol(['折旧起始', '起始日期']),
              original: findCol(['原值', '原价', '价值']),
              vat: findCol(['增值税', '税额']),
              years: findCol(['折旧年限', '年限']),
              rate: findCol(['残值率', '残值百分比']),
              location: findCol(['位置', '存放', '部门']),
              status: findCol(['状态'])
          };

          // 2. 解析数据行
          const dataRows = rawRows.slice(headerIdx + 1);
          const newAssets: FixedAsset[] = dataRows.filter(row => row.length > 0 && row[mapping.name]).map((row, idx) => {
              const original = Number(row[mapping.original] || 0);
              const vat = Number(row[mapping.vat] || 0);
              const years = Number(row[mapping.years] || 5);
              
              // 修正残值率识别逻辑
              let rateRaw = row[mapping.rate];
              let rate = 5; // 默认值
              if (typeof rateRaw === 'number') {
                  // 如果是 0.05 这种小数格式，转换为 5
                  rate = rateRaw <= 1 ? Number((rateRaw * 100).toFixed(2)) : rateRaw;
              } else if (typeof rateRaw === 'string') {
                  rate = Number(rateRaw.replace('%', ''));
              }
              
              const baseAsset: FixedAsset = {
                  id: `imp-${Date.now()}-${idx}`,
                  name: String(row[mapping.name] || '未命名'),
                  assetCode: String(row[mapping.code] || `AST-${Date.now()}-${idx}`),
                  activationDate: parseExcelDate(row[mapping.actDate]),
                  depreciationStartDate: parseExcelDate(row[mapping.depDate]),
                  originalValue: original,
                  vatAmount: vat,
                  netValueExTax: Number((original - vat).toFixed(2)),
                  usefulLifeYears: years,
                  residualRate: rate,
                  residualValue: Number((original * (rate / 100)).toFixed(2)),
                  monthlyDepreciation: 0,
                  annualDepreciation: 0,
                  monthsDepreciated: 0,
                  currentMonthDepreciation: 0,
                  accumulatedDepreciation: 0,
                  netBookValue: original,
                  remainingDepreciation: original,
                  status: String(row[mapping.status]).includes('在用') ? AssetStatus.ACTIVE : AssetStatus.MAINTENANCE,
                  location: String(row[mapping.location] || '')
              };
              return baseAsset;
          });

          setAssets(prev => [...prev, ...newAssets]);
          if (onShowToast) onShowToast(`智能匹配表头成功，导入 ${newAssets.length} 条数据`, 'success');
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsArrayBuffer(file);
  };

  const handleExport = () => {
    const data = assets.map(a => ({
      "名称": a.name, "资产编号": a.assetCode, "启用日期": a.activationDate, "折旧起始日期": a.depreciationStartDate, "原值": a.originalValue, "增值税": a.vatAmount, "不含税价值": a.netValueExTax, "折旧年限": a.usefulLifeYears, "残值率％": a.residualRate, "残值": a.residualValue, "月折旧额": a.monthlyDepreciation, "年计提折旧额": a.annualDepreciation, "已提折旧月份": a.monthsDepreciated, "本月折旧额": a.currentMonthDepreciation, "累计折旧额": a.accumulatedDepreciation, "净值": a.netBookValue, "待计提折旧": a.remainingDepreciation, "状态": a.status, "存放位置": a.location || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "固定资产清单");
    XLSX.writeFile(wb, `固定资产清单_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) setAssets(prev => prev.map(a => a.id === editingId ? { ...formData, id: editingId } : a));
    else setAssets(prev => [...prev, { ...formData, id: Math.random().toString(36).substr(2, 9) }]);
    setIsModalOpen(false);
  };

  const generateCode = () => {
    const prefix = settings.prefixConfig?.asset || 'ASSET';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(2);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    setFormData({ ...formData, assetCode: `${prefix}-${dateStr}-${random}` });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
        <div className="p-3 border-b border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full min-w-0">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="搜索资产名称、编号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            {selectedIds.size > 0 ? (
                <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-all border border-red-100">
                    <Trash2 size={14} /> 删除选中 ({selectedIds.size})
                </button>
            ) : (
                <select className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                    <option value="ALL">全部状态</option>{Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
             {!isReadOnly && (
                <button onClick={handleClearAll} className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-red-500 text-xs font-bold transition-all">
                    <Trash size={14} /> 全部清空
                </button>
             )}
             <div className="w-px h-6 bg-slate-100 mx-1 hidden sm:block"></div>
             
             {/* 数据修正按钮 */}
             {!isReadOnly && (
               <button 
                 onClick={handleRecalculateData} 
                 className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg hover:bg-amber-100 text-xs font-bold transition-all active:scale-95"
                 title="根据今天时间重算所有资产折旧"
               >
                 <RefreshCw size={14} /> 数据修正
               </button>
             )}

             <button onClick={() => {
                const headers = [['名称', '资产编号', '启用日期', '折旧起始日期', '原值', '增值税', '折旧年限', '残值率％', '存放位置', '状态']];
                const ws = XLSX.utils.aoa_to_sheet(headers);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
                XLSX.writeFile(wb, "固定资产导入模板.xlsx");
             }} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold transition-all"><FileSpreadsheet size={14} /> 模板</button>
             
             {!isReadOnly && (
                 <><input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                 <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg hover:bg-blue-100 text-xs font-bold transition-all active:scale-95"><UploadCloud size={14} /> 自动识别导入</button></>
             )}
             <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"><Download size={14} /> 导出</button>
             {!isReadOnly && <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-lg hover:bg-slate-800 transition-all shadow-md text-sm font-bold active:scale-95"><Plus size={18} /> 新增资产</button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-600 table-fixed min-w-[2300px]">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-[50px] text-center">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                        {selectedIds.size === paginatedAssets.length && paginatedAssets.length > 0 ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                    </button>
                </th>
                <th className="px-4 py-4 w-[180px]">名称</th>
                <th className="px-4 py-4 w-[160px]">资产编号</th>
                <th className="px-4 py-4 w-[160px]">存放位置</th>
                <th className="px-4 py-4 w-[100px]">启用日期</th>
                <th className="px-4 py-4 w-[110px]">折旧起始日期</th>
                <th className="px-4 py-4 w-[100px]">原值</th>
                <th className="px-4 py-4 w-[100px]">增值税</th>
                <th className="px-4 py-4 w-[120px]">不含税价值</th>
                <th className="px-4 py-4 w-[80px]">折旧年限</th>
                <th className="px-4 py-4 w-[80px]">残值率％</th>
                <th className="px-4 py-4 w-[100px]">残值</th>
                <th className="px-4 py-4 w-[100px]">月折旧额</th>
                <th className="px-4 py-4 w-[120px]">年计提折旧额</th>
                <th className="px-4 py-4 w-[100px]">已提折旧月份</th>
                <th className="px-4 py-4 w-[100px]">本月折旧额</th>
                <th className="px-4 py-4 w-[120px]">累计折旧额</th>
                <th className="px-4 py-4 w-[100px]">净值</th>
                <th className="px-4 py-4 w-[120px]">待计提折旧</th>
                <th className="px-4 py-4 w-[100px] text-right sticky right-0 bg-slate-50 shadow-[-4px_0_8px_rgba(0,0,0,0.02)]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAssets.map(asset => (
                  <tr key={asset.id} className={`hover:bg-slate-50/80 transition-colors h-[50px] group ${selectedIds.has(asset.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-2 text-center">
                        <button onClick={() => toggleSelect(asset.id)} className="text-slate-300 hover:text-blue-600 transition-colors">
                            {selectedIds.has(asset.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                        </button>
                    </td>
                    <td className="px-4 py-2 font-black text-slate-900 truncate">{asset.name}</td>
                    <td className="px-4 py-2 font-mono text-slate-500">{asset.assetCode}</td>
                    <td className="px-4 py-2">
                      <LocationCell 
                        location={asset.location} 
                        locationImage={asset.locationImage} 
                        editable={!isReadOnly} 
                        onImageChange={(img) => handleUpdateAssetLocationImage(asset.id, img)} 
                      />
                    </td>
                    <td className="px-4 py-2">{asset.activationDate}</td>
                    <td className="px-4 py-2">{asset.depreciationStartDate}</td>
                    <td className="px-4 py-2 font-bold text-slate-800">¥{asset.originalValue.toLocaleString()}</td>
                    <td className="px-4 py-2 text-slate-400">¥{asset.vatAmount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-slate-500">¥{asset.netValueExTax.toLocaleString()}</td>
                    <td className="px-4 py-2 font-bold">{asset.usefulLifeYears} 年</td>
                    <td className="px-4 py-2">{asset.residualRate}%</td>
                    <td className="px-4 py-2 text-slate-500">¥{asset.residualValue.toLocaleString()}</td>
                    <td className="px-4 py-2 font-bold text-blue-600">¥{asset.monthlyDepreciation.toLocaleString()}</td>
                    <td className="px-4 py-2 text-blue-400">¥{asset.annualDepreciation.toLocaleString()}</td>
                    <td className="px-4 py-2 font-bold text-indigo-600">{asset.monthsDepreciated} 月</td>
                    <td className="px-4 py-2">¥{asset.currentMonthDepreciation.toLocaleString()}</td>
                    <td className="px-4 py-2 font-bold text-orange-600">¥{asset.accumulatedDepreciation.toLocaleString()}</td>
                    <td className="px-4 py-2 font-black text-emerald-600">¥{asset.netBookValue.toLocaleString()}</td>
                    <td className="px-4 py-2 text-rose-500">¥{asset.remainingDepreciation.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_8px_rgba(0,0,0,0.02)] transition-colors">
                      {!isReadOnly && <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingId(asset.id); setFormData(asset); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600 p-1"><Edit2 size={14} /></button><button onClick={() => onConfirm?.('确认删除', '确定要删除此资产吗？', () => setAssets(prev => prev.filter(a => a.id !== asset.id)))} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={14} /></button></div>}
                    </td>
                  </tr>
                ))}
                {[...Array(emptyRowsCount)].map((_, i) => (<tr key={`empty-${i}`} className="h-[50px] opacity-5 pointer-events-none"><td colSpan={20} className="px-6 py-3"><div className="h-2 bg-slate-100 rounded w-full"></div></td></tr>))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <span>共 {filteredAssets.length} 条数据</span>
                <div className="flex items-center gap-2 border-l border-slate-300 pl-4">每页:<select className="bg-transparent border-b border-slate-300 py-0.5 cursor-pointer text-slate-800 focus:outline-none" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}><option value={12}>12</option><option value={24}>24</option><option value={48}>48</option></select></div>
            </div>
            <div className="flex items-center gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
                <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map((p, i) => (
                      p === '...' ? (
                        <span key={`dots-${i}`} className="px-2 text-slate-400 text-xs font-bold">...</span>
                      ) : (
                        <button key={`page-${p}`} onClick={() => setCurrentPage(p as number)} className={`w-8 h-8 rounded text-xs font-bold transition-all ${currentPage === p ? 'bg-slate-900 text-white shadow-md' : 'hover:bg-slate-200 text-slate-500'}`}>{p}</button>
                      )
                    ))}
                </div>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-2 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
            </div>
        </div>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 overflow-hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col animate-slide-up border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calculator className="text-blue-600" /> {editingId ? '资产财务明细维护' : '新资产会计入账'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
              <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info size={14}/> 基本身份信息</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">资产名称 *</label>
                          <input required type="text" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">资产编号 *</label>
                          <div className="relative">
                            <input required type="text" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm font-mono outline-none" value={formData.assetCode} onChange={e => setFormData({...formData, assetCode: e.target.value})} />
                            <button type="button" onClick={generateCode} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><RefreshCw size={14} /></button>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">状态</label>
                          <select className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm bg-white outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as AssetStatus})}>
                              {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      <div className="space-y-1 md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase">存放位置名称</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                              <MapPin size={16} />
                            </span>
                            <input 
                              type="text" 
                              placeholder="例如：主楼 302 会议室 / 仓库 A-01 货架" 
                              className="w-full border border-slate-200 pl-9 pr-3 py-2.5 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                              value={formData.location || ''} 
                              onChange={e => setFormData({...formData, location: e.target.value})} 
                            />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">存放位置照片/示意图</label>
                          <div className="flex items-center gap-3">
                            {formData.locationImage ? (
                              <div className="relative w-10 h-10 rounded-lg border border-slate-200 overflow-hidden shrink-0 group">
                                <img src={formData.locationImage} alt="存放位置照片" className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => setFormData({ ...formData, locationImage: '' })}
                                  className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold"
                                >
                                  删除
                                </button>
                              </div>
                            ) : null}
                            <label className="flex-1 border border-dashed border-slate-300 hover:border-indigo-500 rounded-lg py-2 px-3 flex items-center justify-center gap-2 text-xs text-slate-500 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
                              <Upload size={14} className="text-indigo-600" />
                              <span className="truncate">{formData.locationImage ? '更换位置照片' : '上传位置照片'}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setFormData({ ...formData, locationImage: reader.result as string });
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="space-y-4 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> 时间周期与原值</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">启用日期</label>
                          <input required type="date" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm bg-white outline-none" value={formData.activationDate} onChange={e => setFormData({...formData, activationDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">折旧起始日期</label>
                          <input required type="date" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm bg-white outline-none" value={formData.depreciationStartDate} onChange={e => setFormData({...formData, depreciationStartDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">原值 (含税) *</label>
                          <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                              <input required type="number" step="0.01" className="w-full border border-slate-200 pl-8 pr-3 py-2.5 rounded-lg text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={formData.originalValue || ''} onChange={e => setFormData({...formData, originalValue: Number(e.target.value)})} />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">增值税额</label>
                          <input type="number" step="0.01" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm outline-none" value={formData.vatAmount || ''} onChange={e => setFormData({...formData, vatAmount: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-400 uppercase opacity-60">不含税价值 (自动计算)</label>
                          <div className="bg-slate-200/50 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-500 italic">¥ {formData.netValueExTax.toLocaleString()}</div>
                      </div>
                  </div>
              </div>
              <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Coins size={14}/> 折旧算法配置</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">折旧年限 (年) *</label>
                          <input required type="number" min="1" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm font-bold outline-none" value={formData.usefulLifeYears} onChange={e => setFormData({...formData, usefulLifeYears: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase">残值率 (%)</label>
                          <div className="relative">
                            <input required type="number" step="0.1" className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm outline-none" value={formData.residualRate} onChange={e => setFormData({...formData, residualRate: Number(e.target.value)})} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-400 uppercase opacity-60">残值 (自动计算)</label>
                          <div className="bg-slate-200/50 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-500 italic">¥ {formData.residualValue.toLocaleString()}</div>
                      </div>
                  </div>
              </div>
              <div className="bg-blue-600 p-6 rounded-xl border border-blue-700 shadow-xl shadow-blue-100 space-y-6">
                  <h4 className="text-xs font-black text-blue-100 uppercase tracking-widest flex items-center gap-2"><History size={14}/> 实时会计核算结果</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div><p className="text-[10px] text-blue-100 font-bold uppercase mb-1">月折旧额</p><p className="text-white text-lg font-black tracking-tight">¥{formData.monthlyDepreciation.toLocaleString()}</p></div>
                      <div><p className="text-[10px] text-blue-100 font-bold uppercase mb-1">年计提折旧额</p><p className="text-white text-lg font-black tracking-tight">¥{formData.annualDepreciation.toLocaleString()}</p></div>
                      <div><p className="text-[10px] text-blue-100 font-bold uppercase mb-1">已提月份</p><p className="text-white text-lg font-black tracking-tight">{formData.monthsDepreciated} 个月</p></div>
                      <div><p className="text-[10px] text-blue-100 font-bold uppercase mb-1">累计折旧</p><p className="text-white text-lg font-black tracking-tight">¥{formData.accumulatedDepreciation.toLocaleString()}</p></div>
                      <div className="col-span-2 bg-white/10 p-4 rounded-lg"><p className="text-[10px] text-blue-100 font-bold uppercase mb-1">当前净值 (账面价值)</p><p className="text-emerald-400 text-2xl font-black tracking-tight">¥{formData.netBookValue.toLocaleString()}</p></div>
                      <div className="col-span-2 bg-white/10 p-4 rounded-lg"><p className="text-[10px] text-blue-100 font-bold uppercase mb-1">剩余待计提总额</p><p className="text-amber-400 text-2xl font-black tracking-tight">¥{formData.remainingDepreciation.toLocaleString()}</p></div>
                  </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-white sticky bottom-0 z-10 rounded-b-xl">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-500 hover:text-slate-900 rounded-lg text-sm font-bold transition-colors">取消退出</button>
                <button type="submit" onClick={handleSubmit} className="px-10 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-black text-sm active:scale-95">入账保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
