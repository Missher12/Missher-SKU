
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { InventoryItem, InventoryCategory, LogFunction, ShowToastFunction, ConfirmFunction, AppSettings } from '../types';
import * as XLSX from 'xlsx';
import { 
  Plus, Search, Edit2, Trash2, ArrowDownCircle, ArrowUpCircle, 
  Printer, Truck, QrCode, Box, Download, 
  LayoutGrid, List, TrendingUp, AlertOctagon,
  FileSpreadsheet, UploadCloud, ChevronLeft, ChevronRight, MessageSquare,
  RefreshCw, Hash, Check, MapPin, Upload, MinusCircle, Sliders, Info, AlertTriangle, X,
  Building2, Calendar, Users, Filter
} from 'lucide-react';
import { LocationCell } from './LocationCell';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  isReadOnly?: boolean;
  onAddLog?: LogFunction;
  initialSearchTerm?: string;
  initialFilterStatus?: 'ALL' | 'LOW' | 'NORMAL';
  initialDepartment?: string;
  onDepartmentChange?: (dept: string) => void;
  onFilterStatusChange?: (status: 'ALL' | 'LOW' | 'NORMAL') => void;
  onShowToast?: ShowToastFunction;
  onConfirm?: ConfirmFunction;
  settings: AppSettings;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ 
  inventory, 
  setInventory, 
  isReadOnly = false, 
  onAddLog, 
  initialSearchTerm = '', 
  initialFilterStatus = 'ALL',
  initialDepartment = 'ALL',
  onDepartmentChange,
  onFilterStatusChange,
  onShowToast, 
  onConfirm, 
  settings 
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>(initialDepartment);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW' | 'NORMAL'>(initialFilterStatus);
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [jumpPage, setJumpPage] = useState('');

  useEffect(() => { if (initialSearchTerm) setSearchTerm(initialSearchTerm); }, [initialSearchTerm]);
  useEffect(() => { if (initialFilterStatus) setFilterStatus(initialFilterStatus); }, [initialFilterStatus]);
  useEffect(() => { if (initialDepartment) setFilterDepartment(initialDepartment); }, [initialDepartment]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory, filterDepartment, filterStatus, itemsPerPage]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isQuickSkuModalOpen, setIsQuickSkuModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'DIRECT' | 'DEDUCT'>('DIRECT');
  
  const [labelItem, setLabelItem] = useState<InventoryItem | null>(null);
  const [stockOperation, setStockOperation] = useState<'IN' | 'OUT'>('IN');
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);
  const [stockAmount, setStockAmount] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const initialFormState: Omit<InventoryItem, 'id'> = {
    name: '', sku: '', spec: '', barcode: '', supplier: '',
    category: InventoryCategory.ELECTRONICS, department: '项目部', purchaseDate: todayStr,
    quantity: 0, unit: '个', reorderPoint: 5, unitPrice: 0, location: '', locationImage: '', remark: '', image: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleUpdateInventoryLocationImage = (id: string, imageBase64: string) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, locationImage: imageBase64 } : i));
    if (onShowToast) onShowToast('存放位置示意图已更新', 'success');
  };
  const [quickSkuData, setQuickSkuData] = useState({ id: '', sku: '' });

  // 部门与管理状态
  const [customDepartments, setCustomDepartments] = useState<string[]>(['项目部', '宣传部', '行政部', '研发中心', '运营部', '采购部']);
  const [isDeptManageModalOpen, setIsDeptManageModalOpen] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');
  const [editingDeptTarget, setEditingDeptTarget] = useState<string | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');

  // 部门可选项列表
  const availableDepartments = useMemo(() => {
    const deptsFromItems = inventory.map(i => i.department).filter(Boolean) as string[];
    const set = new Set([...customDepartments, ...deptsFromItems]);
    return Array.from(set);
  }, [inventory, customDepartments]);

  const handleAddDepartment = () => {
    const trimmed = newDeptInput.trim();
    if (!trimmed) {
      if (onShowToast) onShowToast('请输入部门名称', 'warning');
      return;
    }
    if (availableDepartments.includes(trimmed)) {
      if (onShowToast) onShowToast('该部门已存在', 'warning');
      return;
    }
    setCustomDepartments(prev => [...prev, trimmed]);
    setNewDeptInput('');
    if (onShowToast) onShowToast(`部门【${trimmed}】添加成功`, 'success');
  };

  const handleRenameDepartment = (oldName: string) => {
    const trimmed = editingDeptValue.trim();
    if (!trimmed) {
      if (onShowToast) onShowToast('部门名称不能为空', 'warning');
      return;
    }
    if (trimmed === oldName) {
      setEditingDeptTarget(null);
      return;
    }
    // 批量更新库存物资中的部门名称
    setInventory(prev => prev.map(item => item.department === oldName ? { ...item, department: trimmed } : item));
    setCustomDepartments(prev => prev.map(d => d === oldName ? trimmed : d));
    if (filterDepartment === oldName) {
      setFilterDepartment(trimmed);
    }
    if (onAddLog) onAddLog('修改部门', '部门管理', oldName, `将部门【${oldName}】重命名为【${trimmed}】`);
    if (onShowToast) onShowToast(`已将部门【${oldName}】重命名为【${trimmed}】，关联物资已自动更新`, 'success');
    setEditingDeptTarget(null);
  };

  const handleDeleteDepartment = (deptName: string) => {
    const associatedCount = inventory.filter(i => (i.department || '通用/公共') === deptName).length;
    if (associatedCount > 0) {
      if (onShowToast) onShowToast(`部门【${deptName}】下尚有 ${associatedCount} 项关联物资，请先调拨或修改对应物资的部门`, 'warning');
      return;
    }
    setCustomDepartments(prev => prev.filter(d => d !== deptName));
    if (filterDepartment === deptName) setFilterDepartment('ALL');
    if (onShowToast) onShowToast(`部门【${deptName}】已删除`, 'info');
  };

  const kpiData = useMemo(() => ({
    lowStockItems: inventory.filter(i => i.quantity <= i.reorderPoint).length,
    totalItems: inventory.length,
    totalQuantity: inventory.reduce((sum, i) => sum + i.quantity, 0),
    departmentCount: availableDepartments.length
  }), [inventory, availableDepartments]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.remark || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'ALL' || i.category === filterCategory;
      const itemDept = i.department || '通用/公共';
      const matchesDepartment = filterDepartment === 'ALL' || itemDept === filterDepartment;
      const isLow = i.quantity <= i.reorderPoint;
      const matchesStatus = filterStatus === 'ALL' ? true : filterStatus === 'LOW' ? isLow : !isLow;
      return matchesSearch && matchesCategory && matchesDepartment && matchesStatus;
    });
  }, [inventory, searchTerm, filterCategory, filterDepartment, filterStatus]);

  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(start, start + itemsPerPage);
  }, [filteredInventory, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / itemsPerPage));
  const emptyRowsCount = Math.max(0, itemsPerPage - paginatedInventory.length);

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

  const generateRandomSku = (target: 'form' | 'quick') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // 使用设置中的前缀
    const customPrefix = settings.prefixConfig?.inventory || 'SKU';
    const result = `${customPrefix}-${randomPart}`;
    
    if (target === 'form') setFormData(prev => ({ ...prev, sku: result }));
    else setQuickSkuData(prev => ({ ...prev, sku: result }));
  };

  const handleDownloadTemplate = (mode: 'DIRECT' | 'DEDUCT' = importMode) => {
      if (mode === 'DIRECT') {
          const headers = ['物资名称', '归属部门', '采购日期', '单位', '规格型号', '当前库存数量', '存放位置', '备注'];
          const data = [headers, ['便携式无线高清投影仪', '项目部', '2026-03-15', '台', '极米 H3S', '10', '项目部器材库 B-01', '常规盘点入库']];
          const ws = XLSX.utils.aoa_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "直接更新模板");
          XLSX.writeFile(wb, "固定资产库存全量更新模板.xlsx");
      } else {
          const headers = ['物资名称', 'SKU/规格', '已用数量', '领用部门/领用人', '备注'];
          const data = [headers, ['对讲机', '摩托罗拉 X6', '2', '行政部', '活动消耗']];
          const ws = XLSX.utils.aoa_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "已用库存扣减模板");
          XLSX.writeFile(wb, "已用库存扣减核销模板.xlsx");
      }
  };

  const triggerImport = () => fileInputRef.current?.click();

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          if (importMode === 'DIRECT') {
              // 模式 1：直接更新/覆盖 (Direct Overwrite & Add)
              let updatedCount = 0;
              let addedCount = 0;
              let newInventory = [...inventory];

              workbook.SheetNames.forEach(sheetName => {
                  const worksheet = workbook.Sheets[sheetName];
                  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                  if (jsonData.length < 1) return;

                  let headerIndex = -1;
                  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                      if (jsonData[i].some(cell => {
                          const str = String(cell);
                          return str.includes('物资') || str.includes('名称') || str.includes('SKU');
                      })) { 
                          headerIndex = i; 
                          break; 
                      }
                  }
                  if (headerIndex === -1) return;

                  const headerRow = jsonData[headerIndex].map(h => String(h || '').trim());
                  const colIdx = {
                      name: headerRow.findIndex(h => h.includes('物资') || h.includes('名称')),
                      sku: headerRow.findIndex(h => h.includes('SKU') || h.includes('编号')),
                      dept: headerRow.findIndex(h => h.includes('部门') || h.includes('归属')),
                      purchaseDate: headerRow.findIndex(h => h.includes('采购') || h.includes('日期')),
                      unit: headerRow.findIndex(h => h.includes('单位')),
                      spec: headerRow.findIndex(h => h.includes('规格') || h.includes('型号')),
                      qty: headerRow.findIndex(h => h.includes('数量') || h.includes('库存')),
                      loc: headerRow.findIndex(h => h.includes('位置') || h.includes('货架')),
                      remark: headerRow.findIndex(h => h.includes('备注'))
                  };

                  const dataRows = jsonData.slice(headerIndex + 1);
                  let lastItemName = '';

                  dataRows.forEach((row, idx) => {
                      if (!row || row.length === 0) return;
                      let currentName = colIdx.name !== -1 ? String(row[colIdx.name] || '').trim() : '';
                      if (!currentName && lastItemName) currentName = lastItemName;
                      const skuInCell = colIdx.sku !== -1 ? String(row[colIdx.sku] || '').trim() : '';

                      if (!currentName && !skuInCell) return;
                      if (currentName) lastItemName = currentName;

                      const spec = colIdx.spec !== -1 ? String(row[colIdx.spec] || '').trim() : '';
                      const fullName = spec && !currentName.includes(spec) ? `${currentName} (${spec})` : currentName;
                      const rawQty = String(colIdx.qty !== -1 && row[colIdx.qty] !== undefined ? row[colIdx.qty] : '0');
                      const importedQty = parseInt(rawQty.match(/\d+/)?.[0] || '0', 10);
                      const unitStr = colIdx.unit !== -1 ? String(row[colIdx.unit] || '个').trim() : '个';
                      const locStr = colIdx.loc !== -1 ? String(row[colIdx.loc] || '未分区').trim() : '未分区';
                      const deptStr = colIdx.dept !== -1 ? String(row[colIdx.dept] || '项目部').trim() : '项目部';
                      const pDateStr = colIdx.purchaseDate !== -1 ? String(row[colIdx.purchaseDate] || todayStr).trim() : todayStr;
                      const remarkStr = colIdx.remark !== -1 ? String(row[colIdx.remark] || '').trim() : '';

                      // 匹配已有库存项目 (优先按 SKU，其次按名称)
                      let existingIdx = -1;
                      if (skuInCell) {
                          existingIdx = newInventory.findIndex(i => i.sku.toUpperCase() === skuInCell.toUpperCase());
                      }
                      if (existingIdx === -1 && currentName) {
                          existingIdx = newInventory.findIndex(i => 
                              i.name.toLowerCase() === currentName.toLowerCase() || 
                              i.name.toLowerCase() === fullName.toLowerCase()
                          );
                      }

                      if (existingIdx !== -1) {
                          // 直接覆盖更新现有物资的当前库存
                          newInventory[existingIdx] = {
                              ...newInventory[existingIdx],
                              quantity: importedQty,
                              ...(deptStr ? { department: deptStr } : {}),
                              ...(pDateStr ? { purchaseDate: pDateStr } : {}),
                              ...(locStr && locStr !== '未分区' ? { location: locStr } : {}),
                              ...(unitStr ? { unit: unitStr } : {}),
                              ...(remarkStr ? { remark: remarkStr } : {})
                          };
                          updatedCount++;
                      } else {
                          // 新增新物资
                          newInventory.push({
                              id: `imp-${Date.now()}-${sheetName}-${idx}`,
                              name: fullName || currentName, 
                              sku: skuInCell || `${settings.prefixConfig?.inventory || 'SKU'}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                              barcode: '', 
                              category: InventoryCategory.OTHER, 
                              department: deptStr,
                              purchaseDate: pDateStr,
                              quantity: importedQty,
                              unit: unitStr, 
                              location: locStr,
                              remark: remarkStr, 
                              unitPrice: 0, 
                              reorderPoint: 5, 
                              supplier: '', 
                              image: ''
                          });
                          addedCount++;
                      }
                  });
              });

              setInventory(newInventory);
              if (onAddLog) onAddLog('批量全量更新', '库存管理', 'Excel', `直接更新了 ${updatedCount} 项，新增 ${addedCount} 项物资`);
              if (onShowToast) onShowToast(`直接更新成功：同步了 ${updatedCount} 项现有库存，新增 ${addedCount} 项新物资`, 'success');

          } else {
              // 模式 2：已用库存扣减核销 (当前库存 = 现有库存 - 已用数量)
              let matchedCount = 0;
              let totalDeducted = 0;
              let lowStockAlertCount = 0;
              let newInventory = [...inventory];

              workbook.SheetNames.forEach(sheetName => {
                  const worksheet = workbook.Sheets[sheetName];
                  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                  if (jsonData.length < 1) return;

                  let headerIndex = -1;
                  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                      if (jsonData[i].some(cell => {
                          const str = String(cell);
                          return str.includes('物资') || str.includes('名称') || str.includes('已用') || str.includes('使用') || str.includes('领用') || str.includes('消耗');
                      })) { 
                          headerIndex = i; 
                          break; 
                      }
                  }
                  if (headerIndex === -1) return;

                  const headerRow = jsonData[headerIndex].map(h => String(h || '').trim());
                  const colIdx = {
                      name: headerRow.findIndex(h => h.includes('物资') || h.includes('名称')),
                      sku: headerRow.findIndex(h => h.includes('SKU') || h.includes('编号') || h.includes('规格')),
                      usedQty: headerRow.findIndex(h => h.includes('已用') || h.includes('使用') || h.includes('消耗') || h.includes('领用') || h.includes('数量'))
                  };

                  const dataRows = jsonData.slice(headerIndex + 1);
                  dataRows.forEach((row) => {
                      if (!row || row.length === 0) return;
                      const nameCell = colIdx.name !== -1 ? String(row[colIdx.name] || '').trim() : '';
                      const skuCell = colIdx.sku !== -1 ? String(row[colIdx.sku] || '').trim() : '';
                      if (!nameCell && !skuCell) return;

                      const rawUsed = String(colIdx.usedQty !== -1 && row[colIdx.usedQty] !== undefined ? row[colIdx.usedQty] : '0');
                      const usedQty = parseInt(rawUsed.match(/\d+/)?.[0] || '0', 10);
                      if (usedQty <= 0) return;

                      // 匹配对应物资
                      let existingIdx = -1;
                      if (skuCell) {
                          existingIdx = newInventory.findIndex(i => i.sku.toUpperCase() === skuCell.toUpperCase());
                      }
                      if (existingIdx === -1 && nameCell) {
                          existingIdx = newInventory.findIndex(i => 
                              i.name.toLowerCase() === nameCell.toLowerCase() ||
                              i.name.toLowerCase().includes(nameCell.toLowerCase())
                          );
                      }

                      if (existingIdx !== -1) {
                          const currentQty = newInventory[existingIdx].quantity;
                          const finalQty = Math.max(0, currentQty - usedQty);
                          newInventory[existingIdx] = {
                              ...newInventory[existingIdx],
                              quantity: finalQty
                          };
                          matchedCount++;
                          totalDeducted += usedQty;

                          if (finalQty <= newInventory[existingIdx].reorderPoint) {
                              lowStockAlertCount++;
                          }
                      }
                  });
              });

              setInventory(newInventory);
              if (onAddLog) onAddLog('已用库存扣减核销', '库存管理', 'Excel', `按已用库存扣减核销了 ${matchedCount} 项物资，共消耗 ${totalDeducted} 件`);
              
              if (lowStockAlertCount > 0) {
                  if (onShowToast) onShowToast(`已用扣减完成！核销 ${matchedCount} 项物资 (累计消耗 ${totalDeducted} 件)，有 ${lowStockAlertCount} 项库存触发预警`, 'warning');
              } else {
                  if (onShowToast) onShowToast(`已用扣减完成！成功核销 ${matchedCount} 项物资，自动计算 [当前库存 = 现有库存 - 已用数量]`, 'success');
              }
          }

          setIsImportModalOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsArrayBuffer(file);
  };

  const handleExport = () => {
    const data = inventory.map((item, idx) => ({ 
      "序号": idx + 1,
      "物料编码": item.sku, 
      "规格/型号": item.spec || '-',
      "单价(元)": item.unitPrice || 0,
      "总价(元)": (item.unitPrice || 0) * item.quantity,
      "物资名称": item.name, 
      "归属部门": item.department || '通用/公共',
      "采购日期": item.purchaseDate || '',
      "存放位置": item.location, 
      "单位": item.unit, 
      "分类": item.category, 
      "当前库存": item.quantity, 
      "预警阈值": item.reorderPoint,
      "备注": item.remark || '' 
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "库存清单");
    XLSX.writeFile(wb, "库存物资清单.xlsx");
  };

  const handleOpenModal = (item?: InventoryItem) => {
    if (isReadOnly) return;
    if (item) { setEditingId(item.id); setFormData({ ...item }); }
    else { setEditingId(null); setFormData(initialFormState); }
    setIsModalOpen(true);
  };

  const handleQuickSkuOpen = (item?: InventoryItem) => {
    if (isReadOnly) return;
    if (item) {
        setQuickSkuData({ id: item.id, sku: item.sku });
    } else {
        setQuickSkuData({ id: '', sku: '' });
    }
    setIsQuickSkuModalOpen(true);
  };

  const handleQuickSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSkuData.id || !quickSkuData.sku) return;
    setInventory(prev => prev.map(item => item.id === quickSkuData.id ? { ...item, sku: quickSkuData.sku } : item));
    if (onShowToast) onShowToast('SKU 编号修改成功', 'success');
    setIsQuickSkuModalOpen(false);
  };

  const handlePrintLabel = (item: InventoryItem) => { setLabelItem(item); setIsLabelModalOpen(true); };

  const isHighFrequencyGrowth = (item: InventoryItem) => {
    if (!item.purchaseDate) return false;
    const purchaseTime = new Date(item.purchaseDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - purchaseTime) / (1000 * 3600 * 24));
    // 采购日期在近 60 天内且当前数量大于预警点 (且>=15)，标记为高频增长物资
    return diffDays >= 0 && diffDays <= 60 && item.quantity >= 15 && item.quantity > item.reorderPoint;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setInventory(prev => prev.map(i => i.id === editingId ? { ...formData, id: editingId } : i));
      if (onShowToast) onShowToast('物资信息已更新', 'success');
    } else {
      const newItem = { ...formData, id: Math.random().toString(36).substr(2, 9) };
      setInventory(prev => [...prev, newItem]);
      if (isHighFrequencyGrowth(newItem)) {
        if (onShowToast) onShowToast('新物资已成功入库（已识别为「高频增长」物资）', 'success');
      } else {
        if (onShowToast) onShowToast('新物资已入库', 'success');
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    const action = () => { setInventory(prev => prev.filter(i => i.id !== id)); if (onShowToast) onShowToast('已删除', 'info'); };
    if (onConfirm) onConfirm('确认删除', '确定要删除此物资吗？', action);
    else if (window.confirm('确定要删除吗？')) action();
  };

  const handleOpenStockModal = (item: InventoryItem, type: 'IN' | 'OUT') => {
    if (isReadOnly) return;
    setSelectedStockItem(item); setStockOperation(type); setStockAmount(0); setIsStockModalOpen(true);
  };

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || stockAmount <= 0) return;
    const newQuantity = stockOperation === 'IN' ? selectedStockItem.quantity + stockAmount : selectedStockItem.quantity - stockAmount;
    setInventory(prev => prev.map(item => item.id === selectedStockItem.id ? { ...item, quantity: newQuantity } : item));
    if (onShowToast) onShowToast('库存已更新', 'success');
    setIsStockModalOpen(false);
  };

  const StockProgressBar = ({ current, max, compact = false }: { current: number, max: number, compact?: boolean }) => {
    const percentage = Math.min((current / Math.max(current, max * 3, 20)) * 100, 100);
    const isLow = current <= max;
    return (
      <div className="w-full">
        {!compact && <div className="flex justify-between text-[10px] mb-1 text-slate-500 font-medium"><span>{percentage.toFixed(0)}%</span><span className={isLow ? 'text-red-600 font-bold' : ''}>{current} {isLow ? '(低)' : ''}</span></div>}
        <div className={`w-full bg-slate-100 rounded-full overflow-hidden h-1.5`}><div className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }} /></div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI 基础统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between"><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">库存总 SKU</p><p className="text-2xl font-black text-slate-900 numeric-text mt-1">{kpiData.totalItems}</p></div><div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Box size={20} /></div></div>
         <div onClick={() => { setFilterStatus('LOW'); onFilterStatusChange?.('LOW'); }} className={`bg-white p-4 rounded-xl border shadow-xs flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${filterStatus === 'LOW' ? 'border-red-400 ring-2 ring-red-100 bg-red-50/20' : 'border-slate-200/80'}`}><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">缺货预警</p><p className={`text-2xl font-black numeric-text mt-1 ${kpiData.lowStockItems > 0 ? 'text-red-600' : 'text-slate-900'}`}>{kpiData.lowStockItems}</p></div><div className={`p-2.5 rounded-xl ${kpiData.lowStockItems > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}><AlertOctagon size={20} /></div></div>
         <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between"><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">物资总件数</p><p className="text-2xl font-black text-slate-900 numeric-text mt-1">{kpiData.totalQuantity}</p></div><div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><TrendingUp size={20} /></div></div>
         <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between"><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">覆盖部门数</p><p className="text-2xl font-black text-slate-900 numeric-text mt-1">{kpiData.departmentCount} <span className="text-xs font-normal text-slate-400">个部门</span></p></div><div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Building2 size={20} /></div></div>
      </div>

      {/* 部门快速切换与筛选栏 */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1 flex-1 min-w-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-200">
            <Building2 size={15} className="text-blue-600" /> 部门分布:
          </span>
          <button
            onClick={() => { setFilterDepartment('ALL'); onDepartmentChange?.('ALL'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              filterDepartment === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>全部部门</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] numeric-text ${filterDepartment === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {inventory.length}
            </span>
          </button>
          {availableDepartments.map(dept => {
            const deptCount = inventory.filter(i => (i.department || '通用/公共') === dept).length;
            return (
              <button
                key={dept}
                onClick={() => { setFilterDepartment(dept); onDepartmentChange?.(dept); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  filterDepartment === dept
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/80'
                }`}
              >
                <span>{dept}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] numeric-text ${
                  filterDepartment === dept ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {deptCount}
                </span>
              </button>
            );
          })}

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsDeptManageModalOpen(true)}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="管理并重命名部门架构"
            >
              <Building2 size={14} className="text-indigo-600" />
              <span>部门架构管理</span>
            </button>
          )}
        </div>
      </div>

      {/* 控制栏与操作 */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col xl:flex-row gap-4 justify-between items-center">
         <div className="flex flex-wrap items-center gap-3 w-full flex-1 min-w-0">
            <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 border border-slate-200">
               <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'LIST' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-400'}`} title="列表视图"><List size={18} /></button>
               <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'GRID' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-400'}`} title="卡片视图"><LayoutGrid size={18} /></button>
            </div>
            <div className="relative flex-1 max-w-sm flex items-center gap-2">
               <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="搜索物资、SKU、部门、位置、备注..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
               </div>
               {!isReadOnly && (
                <button 
                  onClick={() => handleQuickSkuOpen()} 
                  className="p-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  title="快捷修改编号"
                >
                  <Hash size={18} />
                </button>
               )}
            </div>
            <div className="hidden lg:flex gap-2">
                <select className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white text-slate-700 font-bold focus:ring-1 focus:ring-emerald-500 outline-none" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="ALL">所有分类</option>
                  {Object.values(InventoryCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white text-slate-700 font-bold focus:ring-1 focus:ring-emerald-500 outline-none" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as any); onFilterStatusChange?.(e.target.value as any); }}>
                  <option value="ALL">全部预警状态</option>
                  <option value="LOW">低库存预警</option>
                  <option value="NORMAL">库存正常</option>
                </select>
            </div>
         </div>

         <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
            <button onClick={() => handleDownloadTemplate(importMode)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"><FileSpreadsheet size={14} /> 模板</button>
            {!isReadOnly && (
                <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-100 text-xs font-bold transition-all active:scale-95"><UploadCloud size={14} /> 批量导入/扣减</button>
            )}
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"><Download size={14} /> 导出</button>
            {!isReadOnly && <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all shadow-md text-xs font-bold active:scale-95"><Plus size={14} /> 手动登记</button>}
         </div>
      </div>
      
      <div className="min-h-[400px]">
        {viewMode === 'LIST' ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 table-fixed min-w-[1200px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-3 py-4 w-[5%] text-center">序号</th>
                    <th className="px-3 py-4 w-[11%]">物料编码</th>
                    <th className="px-3 py-4 w-[11%]">规格/型号</th>
                    <th className="px-3 py-4 w-[13%]">单价/总价 (选填)</th>
                    <th className="px-4 py-4 w-[18%]">物资详情</th>
                    <th className="px-3 py-4 w-[12%]">存放位置</th>
                    <th className="px-3 py-4 w-[9%]">单位/分类</th>
                    <th className="px-3 py-4 w-[10%]">当前库存</th>
                    <th className="px-3 py-4 w-[6%]">备注</th>
                    <th className="px-4 py-4 w-[12%] text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInventory.map((item, index) => (
                      <tr key={item.id} className="hover:bg-emerald-50/20 transition-colors group h-[72px]">
                          {/* 1. 序号 */}
                          <td className="px-3 py-3 text-center text-xs font-bold text-slate-400 numeric-text">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>

                          {/* 2. 物料编码 */}
                          <td className="px-3 py-3">
                            <div 
                              className="font-mono text-xs font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded-md border border-slate-200/80 inline-flex items-center gap-1 cursor-pointer transition-colors" 
                              onClick={() => handleQuickSkuOpen(item)} 
                              title="点击快捷修改物料编码"
                            >
                              <Hash size={11} className="text-slate-400 group-hover:text-blue-500" />
                              <span className="truncate max-w-[100px]">{item.sku}</span>
                            </div>
                          </td>

                          {/* 3. 规格/型号 */}
                          <td className="px-3 py-3 text-xs text-slate-700">
                            <span className="truncate block font-medium max-w-[120px]" title={item.spec || '未设置'}>
                              {item.spec || <span className="text-slate-300">-</span>}
                            </span>
                          </td>

                          {/* 4. 单价总价（选填） */}
                          <td className="px-3 py-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="text-slate-500 text-[11px] flex items-center gap-1">
                                <span className="text-slate-400 text-[10px]">单价:</span>
                                <span className="font-bold text-slate-800 numeric-text">¥{(item.unitPrice || 0).toLocaleString()}</span>
                              </div>
                              <div className="text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                                <span className="text-emerald-600/80 text-[10px]">总价:</span>
                                <span className="numeric-text">¥{((item.unitPrice || 0) * item.quantity).toLocaleString()}</span>
                              </div>
                            </div>
                          </td>

                          {/* 5. 物资详情 */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 truncate text-sm" title={item.name}>{item.name}</span>
                              {isHighFrequencyGrowth(item) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200/80 shrink-0 inline-flex items-center gap-0.5 shadow-2xs animate-pulse" title="近60天采购且库存增长迅速，辅助业务决策">
                                  <TrendingUp size={10} />
                                  高频增长
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 inline-flex items-center gap-1">
                                <Building2 size={10} />
                                {item.department || '通用/公共'}
                              </span>
                              <span className="text-slate-400 font-mono inline-flex items-center gap-1">
                                <Calendar size={10} />
                                {item.purchaseDate || '未记录'}
                              </span>
                            </div>
                          </td>

                          {/* 6. 存放位置 */}
                          <td className="px-3 py-3">
                            <LocationCell location={item.location} locationImage={item.locationImage} editable={!isReadOnly} onImageChange={(img) => handleUpdateInventoryLocationImage(item.id, img)} />
                          </td>

                          {/* 7. 单位/分类 */}
                          <td className="px-3 py-3 text-xs">
                            <div className="font-bold text-slate-800">{item.unit || '个'}</div>
                            <div className="text-[10px] text-slate-400 truncate">{item.category}</div>
                          </td>

                          {/* 8. 当前库存 */}
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <span className="font-black text-sm text-slate-900 numeric-text">{item.quantity}</span>
                              <StockProgressBar current={item.quantity} max={item.reorderPoint} compact />
                            </div>
                          </td>

                          {/* 9. 备注 */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 text-xs text-slate-400 italic truncate max-w-[80px]" title={item.remark}>
                              {item.remark ? <><MessageSquare size={11} className="shrink-0" />{item.remark}</> : <span className="text-slate-300">-</span>}
                            </div>
                          </td>

                          {/* 操作 */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isReadOnly && (
                                <>
                                  <button onClick={() => handleOpenStockModal(item, 'IN')} className="px-1.5 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded border border-emerald-100 hover:bg-emerald-100 active:scale-95 transition-all">入库</button>
                                  <button onClick={() => handleOpenStockModal(item, 'OUT')} className="px-1.5 py-1 text-[10px] font-bold text-amber-600 bg-amber-50 rounded border border-amber-100 hover:bg-amber-100 active:scale-95 transition-all">出库</button>
                                </>
                              )}
                              <div className="w-px h-3.5 bg-slate-200 mx-0.5"></div>
                              <button onClick={() => handlePrintLabel(item)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="打印标签"><Printer size={15} /></button>
                              {!isReadOnly && (
                                <>
                                  <button onClick={() => handleOpenModal(item)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors" title="编辑"><Edit2 size={15} /></button>
                                  <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors" title="删除"><Trash2 size={15} /></button>
                                </>
                              )}
                            </div>
                          </td>
                      </tr>
                  ))}
                  {[...Array(emptyRowsCount)].map((_, i) => (
                      <tr key={`empty-${i}`} className="h-[72px] opacity-10 pointer-events-none">
                          <td colSpan={10} className="px-6 py-3"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
            {paginatedInventory.map(item => (
              <div key={item.id} className={`bg-white border rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group ${item.quantity <= item.reorderPoint ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}`}>
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          {item.department || '通用/公共'}
                        </span>
                        {item.purchaseDate && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                            <Calendar size={10} /> {item.purchaseDate}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="font-bold text-slate-900 truncate pr-2" title={item.name}>{item.name}</div>
                        {isHighFrequencyGrowth(item) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200/80 shrink-0 inline-flex items-center gap-0.5" title="高频增长">
                            <TrendingUp size={10} />
                            高频增长
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1 hover:text-blue-500 cursor-pointer" onClick={() => handleQuickSkuOpen(item)}>
                        <Hash size={10}/> {item.sku}
                      </div>
                    </div>
                    {item.quantity <= item.reorderPoint && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-xs shrink-0">缺货</span>}
                  </div>
                  <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center text-xs"><LocationCell location={item.location} locationImage={item.locationImage} editable={!isReadOnly} onImageChange={(img) => handleUpdateInventoryLocationImage(item.id, img)} /><div className="font-bold text-slate-800">{item.quantity} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span></div></div>
                      <StockProgressBar current={item.quantity} max={item.reorderPoint} compact />
                      {item.remark && <p className="text-[10px] text-slate-400 italic line-clamp-1 border-t border-slate-50 pt-2 flex items-center gap-1"><MessageSquare size={10}/> {item.remark}</p>}
                  </div>
                  <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex justify-between gap-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleOpenStockModal(item, 'IN')} className="p-1.5 bg-white border border-emerald-100 text-emerald-600 rounded hover:bg-emerald-50 active:scale-90 transition-transform"><ArrowDownCircle size={14}/></button>
                        <button onClick={() => handleOpenStockModal(item, 'OUT')} className="p-1.5 bg-white border border-amber-100 text-amber-600 rounded hover:bg-amber-50 active:scale-90 transition-transform"><ArrowUpCircle size={14}/></button>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handlePrintLabel(item)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"><Printer size={14}/></button>
                        <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14}/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                      </div>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 px-6 py-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <span>共 {filteredInventory.length} 条数据</span>
            <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
              <span>每页:</span>
              <select className="bg-transparent border-b border-slate-300 focus:outline-none py-0.5 cursor-pointer text-slate-800" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                <option value={12}>12 (对齐卡片)</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
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
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-2 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
              
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

      {isQuickSkuModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2"><Hash size={16} /> 快捷修改编号</h3>
              <button onClick={() => setIsQuickSkuModalOpen(false)} className="hover:text-slate-300 transition-colors">✕</button>
            </div>
            <form onSubmit={handleQuickSkuSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">选择物资</label>
                <select 
                  required 
                  className="w-full border border-slate-200 p-3 rounded-lg text-sm bg-slate-50 focus:ring-1 focus:ring-slate-900 outline-none"
                  value={quickSkuData.id}
                  onChange={(e) => {
                    const item = inventory.find(i => i.id === e.target.value);
                    if (item) setQuickSkuData({ id: item.id, sku: item.sku });
                  }}
                >
                  <option value="">-- 请选择要修改的物资 --</option>
                  {inventory.map(item => <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">新 SKU 编号</label>
                <div className="relative">
                    <input 
                      required 
                      type="text" 
                      className="w-full border-2 border-slate-100 p-4 rounded-xl text-xl font-mono font-black focus:border-slate-900 outline-none transition-all uppercase" 
                      value={quickSkuData.sku} 
                      onChange={e => setQuickSkuData({ ...quickSkuData, sku: e.target.value.toUpperCase() })} 
                      placeholder="输入新编号..."
                    />
                    <button type="button" onClick={() => generateRandomSku('quick')} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-900 transition-colors"><RefreshCw size={20} /></button>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all uppercase flex items-center justify-center gap-2">
                <Check size={18} /> 更新编号
              </button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl"><h3 className="text-lg font-bold text-slate-800">{editingId ? '编辑物资详情' : '新物资登记'}</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">物资名称 *</label><input required type="text" className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SKU 编号 / 自定义编号</label>
                    <div className="relative">
                        <input required type="text" className="w-full border border-slate-300 p-2 pr-10 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="支持任意字符..." />
                        <button type="button" onClick={() => generateRandomSku('form')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-600" title="随机生成"><RefreshCw size={14} /></button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <span>归属部门 *</span>
                      <span className="text-[10px] text-slate-400 font-normal">用于部门资产隔离</span>
                    </label>
                    <div className="space-y-2">
                      <input 
                        required 
                        type="text" 
                        className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-bold" 
                        value={formData.department || '项目部'} 
                        onChange={e => setFormData({...formData, department: e.target.value})} 
                        placeholder="请输入或选择部门..."
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {['项目部', '宣传部', '行政部', '研发中心', '运营部', '采购部'].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setFormData({...formData, department: d})}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                              formData.department === d
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <span>采购日期记录</span>
                      <span className="text-[10px] text-slate-400 font-normal">物资入库折旧基准</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="date" 
                        className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-slate-800" 
                        value={formData.purchaseDate || todayStr} 
                        onChange={e => setFormData({...formData, purchaseDate: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div><label className="block text-sm font-medium text-slate-700 mb-1">存放位置名称 *</label><input required type="text" className="w-full border border-slate-300 p-2 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="例如：A区-货架03" /></div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">存放位置照片/示意图</label>
                      <div className="flex items-center gap-2">
                          {formData.locationImage && (
                              <div className="relative w-9 h-9 rounded border overflow-hidden shrink-0 group">
                                  <img src={formData.locationImage} alt="位置图" className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => setFormData({...formData, locationImage: ''})} className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">删除</button>
                              </div>
                          )}
                          <label className="flex-1 border border-dashed border-slate-300 hover:border-emerald-500 rounded-lg py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs text-slate-600 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
                              <Upload size={14} className="text-emerald-600" />
                              <span>{formData.locationImage ? '更换位置照片' : '上传位置照片'}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => setFormData({...formData, locationImage: reader.result as string});
                                      reader.readAsDataURL(file);
                                  }
                              }} />
                          </label>
                      </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">规格 / 型号 (选填)</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800" 
                      value={formData.spec || ''} 
                      onChange={e => setFormData({...formData, spec: e.target.value})} 
                      placeholder="例如：27寸4K / i7-13700H / 1000ml" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <span>单价 (元) [选填]</span>
                      <span className="text-[10px] text-emerald-600 font-bold numeric-text">估算总价: ¥{((formData.unitPrice || 0) * (formData.quantity || 0)).toLocaleString()}</span>
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-slate-800" 
                      value={formData.unitPrice || 0} 
                      onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} 
                    />
                  </div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">计量单位</label><input required type="text" className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">当前数量</label><input required type="number" className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">预警点 (低库存提醒)</label><input required type="number" className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" value={formData.reorderPoint} onChange={e => setFormData({...formData, reorderPoint: Number(e.target.value)})} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">备注信息</label><textarea className="w-full border border-slate-300 p-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" rows={3} value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} /></div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button><button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition-transform font-bold shadow-md">确认并保存</button></div>
            </form>
          </div>
        </div>
      )}

      {isStockModalOpen && selectedStockItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
             <div className={`p-4 border-b flex justify-between items-center ${stockOperation === 'IN' ? 'bg-emerald-600' : 'bg-amber-500'}`}><h3 className="text-lg font-bold text-white flex items-center gap-2">{stockOperation === 'IN' ? '物资入库' : '物资出库'}</h3><button onClick={() => setIsStockModalOpen(false)} className="text-white">✕</button></div>
             <form onSubmit={handleStockSubmit} className="p-6 space-y-6"><div className="text-center"><p className="font-bold text-slate-900 text-xl">{selectedStockItem.name}</p><p className="text-sm text-slate-500 mt-1">当前存量: {selectedStockItem.quantity} {selectedStockItem.unit}</p></div><div><label className="block text-sm font-bold text-slate-700 mb-2">{stockOperation === 'IN' ? '增加数量' : '减少数量'}</label><input autoFocus required min="1" type="number" className="w-full border-2 p-4 rounded-xl text-3xl text-center font-bold" value={stockAmount === 0 ? '' : stockAmount} onChange={e => setStockAmount(Number(e.target.value))} /></div><button type="submit" className={`w-full py-4 rounded-lg text-white font-bold text-lg shadow-md active:scale-95 ${stockOperation === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>确认操作</button></form>
          </div>
        </div>
      )}

      {isLabelModalOpen && labelItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
              <div className="bg-white rounded-lg shadow-xl w-full max-sm p-6 text-center animate-slide-up"><h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-center gap-2"><Printer size={20} /> 资产标签预览</h3><div className="border-2 border-slate-800 rounded p-4 mx-auto w-64 bg-white text-left relative"><div className="absolute top-2 right-2"><QrCode size={40} /></div><div className="text-[10px] uppercase font-bold text-slate-500 mb-1">资产管家 Pro</div><div className="font-bold text-slate-900 leading-tight mb-2 w-3/4">{labelItem.name}</div><div className="space-y-1 text-xs font-mono"><div>位置: {labelItem.location}</div><div>SKU: {labelItem.sku}</div></div></div><div className="flex gap-3 justify-center mt-6"><button onClick={() => setIsLabelModalOpen(false)} className="px-4 py-2 border rounded hover:bg-slate-50 text-sm">取消</button><button onClick={() => setIsLabelModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium active:scale-95">打印标签</button></div></div>
          </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-slide-up">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">批量导入与库存计算</h3>
                  <p className="text-xs text-slate-400 mt-0.5">选择导入模式：支持直接全量覆盖或上传已用库存自动扣减</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Mode Selector Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">选择更新逻辑 / 模式</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode 1: Direct */}
                  <div 
                    onClick={() => setImportMode('DIRECT')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
                      importMode === 'DIRECT' 
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <RefreshCw size={15} className={importMode === 'DIRECT' ? 'text-emerald-600' : 'text-slate-400'} />
                        直接覆盖/全量更新
                      </span>
                      {importMode === 'DIRECT' && (
                        <span className="w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      上传新表格，按物资/SKU匹配更新当前数量，未匹配物资自动新增。
                    </p>
                    <div className="mt-2.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded w-fit">
                      适用：盘点/补货入库
                    </div>
                  </div>

                  {/* Mode 2: Deduct */}
                  <div 
                    onClick={() => setImportMode('DEDUCT')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
                      importMode === 'DEDUCT' 
                        ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <MinusCircle size={15} className={importMode === 'DEDUCT' ? 'text-amber-600' : 'text-slate-400'} />
                        已用库存扣减核销
                      </span>
                      {importMode === 'DEDUCT' && (
                        <span className="w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      上传已用/消耗量表格，自动计算：<br />
                      <span className="font-mono font-bold text-slate-700">当前库存 = 现有库存 - 已用数量</span>
                    </p>
                    <div className="mt-2.5 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded w-fit">
                      适用：部门领用/耗材核销
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Tip Banner */}
              <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                importMode === 'DIRECT' 
                  ? 'bg-blue-50/70 border-blue-100 text-blue-700' 
                  : 'bg-amber-50/70 border-amber-100 text-amber-800'
              }`}>
                <Info size={16} className="shrink-0 mt-0.5" />
                <div>
                  {importMode === 'DIRECT' ? (
                    <span><strong>直接更新说明：</strong>文件包含物资名称与最新数量。匹配到的现有库存将替换为文件中的数量，未包含物资保留。</span>
                  ) : (
                    <span><strong>已用扣减说明：</strong>文件包含物资名称/SKU与已用数量。系统自动计算：当前库存 = 现有库存 - 已用数量，并在扣减后检测低库存预警。</span>
                  )}
                </div>
              </div>

              {/* Download Template Link */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                <span className="text-slate-600 font-medium">尚未准备好表格文件？</span>
                <button 
                  type="button"
                  onClick={() => handleDownloadTemplate(importMode)}
                  className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  <FileSpreadsheet size={14} /> 导出 {importMode === 'DIRECT' ? '全量更新' : '已用扣减'} 示例模板
                </button>
              </div>

              {/* Drop & Upload Action Box */}
              <div className="space-y-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={triggerImport}
                  className={`w-full py-6 px-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 group ${
                    importMode === 'DIRECT'
                      ? 'border-emerald-300 hover:border-emerald-600 bg-emerald-50/30 hover:bg-emerald-50'
                      : 'border-amber-300 hover:border-amber-500 bg-amber-50/30 hover:bg-amber-50'
                  }`}
                >
                  <div className={`p-3 rounded-full transition-transform group-hover:scale-110 ${
                    importMode === 'DIRECT' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <UploadCloud size={28} />
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-sm text-slate-800">
                      点击选择或拖拽 Excel 文件上传
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      支持 .xlsx 或 .xls 格式，匹配后立即执行 {importMode === 'DIRECT' ? '覆盖更新' : '扣减核销'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setIsImportModalOpen(false)} 
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 部门架构管理 Modal */}
      {isDeptManageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-800 rounded-xl">
                  <Building2 size={20} className="text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base">企业部门架构管理</h3>
                  <p className="text-[11px] text-indigo-300">修改/重命名部门名称将同步更新所有关联物资</p>
                </div>
              </div>
              <button onClick={() => setIsDeptManageModalOpen(false)} className="text-indigo-300 hover:text-white p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* 新增部门栏 */}
              <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 space-y-2">
                <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-600" /> 新增部门架构
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDeptInput}
                    onChange={(e) => setNewDeptInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                    placeholder="请输入新部门名称（如：市场营销部）..."
                    className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddDepartment}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    确认添加
                  </button>
                </div>
              </div>

              {/* 部门名录列表 */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>已有部门名录 ({availableDepartments.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">点击“修改名称”将自动重命名全表对应数据</span>
                </h4>

                <div className="space-y-2">
                  {availableDepartments.map(dept => {
                    const itemCount = inventory.filter(i => (i.department || '通用/公共') === dept).length;
                    const isEditing = editingDeptTarget === dept;

                    return (
                      <div key={dept} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingDeptValue}
                              onChange={(e) => setEditingDeptValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRenameDepartment(dept)}
                              className="flex-1 border border-indigo-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameDepartment(dept)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-colors shrink-0"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDeptTarget(null)}
                              className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs transition-colors shrink-0"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                                <Building2 size={16} />
                              </span>
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-slate-800 block truncate">{dept}</span>
                                <span className="text-[10px] text-slate-400">
                                  关联物资: <strong className="text-slate-700 font-bold numeric-text">{itemCount}</strong> 件
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDeptTarget(dept);
                                  setEditingDeptValue(dept);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md text-xs font-bold transition-colors cursor-pointer"
                              >
                                重命名
                              </button>
                              {itemCount === 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDepartment(dept)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="删除未关联物资的空部门"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDeptManageModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                完成设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
