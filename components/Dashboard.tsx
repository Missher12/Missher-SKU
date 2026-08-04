
import React, { useState } from 'react';
import { ViewState, FixedAsset, InventoryItem, AssetStatus, Contract, ContractStatus, Supplier } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DollarSign, Box, AlertTriangle, Activity, FileText, Users, Clock, ArrowUpRight, TrendingUp, ShieldCheck, Tag, Layers, ChevronRight, Sparkles } from 'lucide-react';

interface DashboardProps {
  assets: FixedAsset[];
  inventory: InventoryItem[];
  contracts: Contract[];
  suppliers: Supplier[];
  onNavigate?: (view: ViewState, filterStatus?: 'ALL' | 'LOW' | 'NORMAL') => void;
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const STATUS_COLORS = ['#10B981', '#F59E0B', '#64748B', '#EF4444']; // Active, Pending, Expired, Terminated

export const Dashboard: React.FC<DashboardProps> = ({ assets, inventory, contracts, suppliers, onNavigate }) => {
  const [highValueView, setHighValueView] = useState<'value' | 'lowStock'>('value');

  // --- 基础统计计算 ---
  const totalAssetValue = assets.reduce((sum, asset) => sum + (asset.netBookValue || asset.originalValue || 0), 0);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalContractValue = contracts.filter(c => c.status === ContractStatus.ACTIVE).reduce((sum, c) => sum + c.amount, 0);
  
  const lowStockList = inventory.filter(i => i.quantity <= i.reorderPoint);
  const lowStockCount = lowStockList.length;
  const activeSuppliersCount = suppliers.filter(s => s.status === 'active').length;
  const pendingContractsCount = contracts.filter(c => c.status === ContractStatus.PENDING).length;

  // --- 图表数据准备 ---
  const statusData = [
    { name: '在用', value: assets.filter(a => a.status === AssetStatus.ACTIVE).length },
    { name: '维修中', value: assets.filter(a => a.status === AssetStatus.MAINTENANCE).length },
    { name: '已报废', value: assets.filter(a => a.status === AssetStatus.RETIRED).length },
    { name: '已丢失', value: assets.filter(a => a.status === AssetStatus.LOST).length },
  ].filter(d => d.value > 0);

  const contractStatusData = [
    { name: '生效中', value: contracts.filter(c => c.status === ContractStatus.ACTIVE).length },
    { name: '审批中', value: contracts.filter(c => c.status === ContractStatus.PENDING).length },
    { name: '已过期', value: contracts.filter(c => c.status === ContractStatus.EXPIRED).length },
    { name: '已终止', value: contracts.filter(c => c.status === ContractStatus.TERMINATED).length },
  ].filter(d => d.value > 0);

  // 高价值库存榜单 Top 5
  const topInventoryItems = [...inventory]
    .map(i => ({ ...i, totalVal: i.quantity * i.unitPrice }))
    .sort((a, b) => b.totalVal - a.totalVal)
    .slice(0, 5);

  const maxInventoryVal = topInventoryItems.length > 0 ? topInventoryItems[0].totalVal : 1;

  const contractTypeData = contracts.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + curr.amount;
      return acc;
  }, {} as Record<string, number>);
  
  const contractChartData = Object.keys(contractTypeData).map(key => ({ name: key, value: contractTypeData[key] }));

  // 近期增加资产
  const recentAssets = [...assets]
      .sort((a, b) => new Date(b.activationDate || '2026-01-01').getTime() - new Date(a.activationDate || '2026-01-01').getTime())
      .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 个 Spike 统一设计指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 固定资产总值 */}
        <div 
          onClick={() => onNavigate?.('assets')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider">固定资产账面总值</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight numeric-text mb-2">
            ¥{totalAssetValue.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span className="inline-flex items-center text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
              {assets.length} 件在册
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-blue-600 font-bold flex items-center gap-0.5 transition-colors">
              查看详情 <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* 库存物资总值与低库存预警 */}
        <div 
          onClick={() => onNavigate?.('inventory', lowStockCount > 0 ? 'LOW' : 'ALL')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all group cursor-pointer relative"
          title="点击一键筛选低库存物资"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider">库存物资总结存</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${lowStockCount > 0 ? 'bg-amber-50 text-amber-600 ring-2 ring-amber-200' : 'bg-emerald-50 text-emerald-600'}`}>
              <Box size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight numeric-text mb-2">
            ¥{totalInventoryValue.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between gap-1">
            {lowStockCount > 0 ? (
              <span 
                onClick={(e) => { e.stopPropagation(); onNavigate?.('inventory', 'LOW'); }}
                className="inline-flex items-center text-amber-800 font-bold bg-amber-100/80 hover:bg-amber-200/80 px-2.5 py-1 rounded-md border border-amber-300 transition-colors shadow-2xs"
              >
                <AlertTriangle size={13} className="mr-1 text-amber-600" /> {lowStockCount} 项低库存预警
              </span>
            ) : (
              <span className="inline-flex items-center text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                <ShieldCheck size={12} className="mr-1" /> 现有库存充裕
              </span>
            )}
            <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5 transition-colors bg-amber-50 group-hover:bg-amber-100 px-2 py-1 rounded-md">
              一键筛选 <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* 生效合同总额 */}
        <div 
          onClick={() => onNavigate?.('contracts')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-300 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider">履约中合同总额</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight numeric-text mb-2">
            ¥{totalContractValue.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span className="inline-flex items-center text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
              {pendingContractsCount} 份待审批
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-purple-600 font-bold flex items-center gap-0.5 transition-colors">
              查看合同 <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* 合作供应商 */}
        <div 
          onClick={() => onNavigate?.('suppliers')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider">活跃供应商名录</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight numeric-text mb-2">
            {activeSuppliersCount} <span className="text-xs font-normal text-slate-400">家</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span className="text-slate-400">共 <strong className="text-slate-800 numeric-text">{suppliers.length}</strong> 家名录</span>
            <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 font-bold flex items-center gap-0.5 transition-colors">
              名录库 <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* 主展示区：图表与排行榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左侧 2 栏：分布与支出 */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          
          {/* 资产与合同状态 饼图卡片组 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
             {/* 资产分布 */}
             <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[340px]">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div> 资产在册状态占比
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">总计 {assets.length} 件</span>
                </div>
                
                <div className="flex items-center justify-center gap-3 py-1 flex-1 min-h-0">
                  <div className="w-36 h-36 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={4} dataKey="value" stroke="none">
                              {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                          </Pie>
                          <Tooltip formatter={(val: number) => [`${val} 件`, '数量']} />
                      </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-slate-400">资产总数</span>
                        <span className="text-base font-black text-slate-800 numeric-text">{assets.length}</span>
                      </div>
                  </div>

                  {/* 图例解析 */}
                  <div className="space-y-1.5 text-xs flex-1 overflow-y-auto custom-scrollbar max-h-[220px]">
                    {statusData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="font-medium text-slate-700 truncate text-[11px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800 numeric-text text-xs shrink-0">{item.value} 件</span>
                      </div>
                    ))}
                  </div>
                </div>
            </div>

            {/* 合同状态 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[340px]">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-600"></div> 采购合同执行进度
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">共 {contracts.length} 份</span>
                </div>
                
                <div className="flex items-center justify-center gap-3 py-1 flex-1 min-h-0">
                  <div className="w-36 h-36 relative shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={contractStatusData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={4} dataKey="value" stroke="none">
                              {contractStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />))}
                          </Pie>
                          <Tooltip formatter={(val: number) => [`${val} 份`, '合同数']} />
                      </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-slate-400">生效中</span>
                        <span className="text-base font-black text-emerald-600 numeric-text">
                          {contracts.filter(c => c.status === ContractStatus.ACTIVE).length}
                        </span>
                      </div>
                  </div>

                  <div className="space-y-1.5 text-xs flex-1 overflow-y-auto custom-scrollbar max-h-[220px]">
                    {contractStatusData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }}></span>
                          <span className="font-medium text-slate-700 truncate text-[11px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800 numeric-text text-xs shrink-0">{item.value} 份</span>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
          </div>

          {/* 合同采购支出分类型条形图 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs min-w-0 h-[340px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-600" /> 采购与服务支出类型结构 (RMB)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">按合同类别汇总统计的总合同履约金额分布</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-0 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contractChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fill: '#64748B' }} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748B' }} formatter={(val: number) => `¥${val / 10000}万`} />
                      <Tooltip 
                        cursor={{ fill: '#F8FAFC' }} 
                        formatter={(value: number) => [`¥${value.toLocaleString()}`, '总金额']}
                        contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', color: '#FFF', border: 'none', fontSize: '12px' }}
                      />
                      <Bar dataKey="value" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
        </div>

        {/* 右侧 1 栏：重构版【高价值库存排行榜】与近期资产入库 */}
        <div className="space-y-6 min-w-0 flex flex-col justify-between">
          
          {/* 精美重构版：高价值库存 / 低库存 Leaderboard 卡片 (固定高度 340px，内容溢出自动内部滚动) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[340px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {highValueView === 'value' ? '高价值库存排行榜' : '低库存预警提醒'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {highValueView === 'value' ? '物资结存价值最高 TOP 5' : `当前共有 ${lowStockCount} 项达到预警阈值`}
                    </p>
                  </div>
                </div>

                {/* 切视角按钮 */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
                  <button 
                    onClick={() => setHighValueView('value')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${highValueView === 'value' ? 'bg-white text-slate-800 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    价值榜
                  </button>
                  <button 
                    onClick={() => setHighValueView('lowStock')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${highValueView === 'lowStock' ? 'bg-amber-500 text-white shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    低库存 ({lowStockCount})
                  </button>
                </div>
              </div>

              {/* 榜单与预警列表内容 (flex-1 自动撑开， overflow-y-auto 支持自适应滚动) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {highValueView === 'value' ? (
                  topInventoryItems.map((item, index) => {
                    const percent = Math.min(100, Math.round((item.totalVal / maxInventoryVal) * 100));
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* 排名勋章 */}
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                              index === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                              index === 1 ? 'bg-slate-300 text-slate-800' :
                              index === 2 ? 'bg-amber-700/20 text-amber-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-slate-800 truncate" title={item.name}>{item.name}</span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-slate-900 numeric-text">¥{item.totalVal.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* 动态占比进度条与标签说明 */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                index === 0 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                index === 1 ? 'bg-gradient-to-r from-blue-600 to-indigo-500' :
                                'bg-slate-400'
                              }`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 w-20 text-right">
                            {item.quantity} {item.unit} × ¥{item.unitPrice}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* 低库存预警视图 - 高度由 flex-1 填满，列表过多自动流畅滚动 */
                  lowStockList.length > 0 ? (
                    lowStockList.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => onNavigate?.('inventory', 'LOW')}
                        className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center justify-between text-xs hover:bg-amber-100/80 transition-colors cursor-pointer group/row"
                        title="点击一键查阅全部低库存预警项目"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-800 truncate group-hover/row:text-amber-900" title={item.name}>{item.name}</div>
                          <div className="text-[10px] text-amber-700/90 mt-0.5 flex items-center gap-2">
                            <span>部门: <strong className="font-bold">{item.department || '通用/公共'}</strong></span>
                            <span>预警阀值: <span className="numeric-text font-bold">{item.reorderPoint}</span> {item.unit}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-amber-500 text-white font-bold rounded-md text-[10px] numeric-text shadow-2xs">
                            仅余 {item.quantity} {item.unit}
                          </span>
                          <ArrowUpRight size={13} className="text-amber-700 opacity-60 group-hover/row:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
                      <ShieldCheck size={32} className="text-emerald-500/60 mb-2" />
                      <span>🎉 暂无低库存预警物资，当前库存非常充足</span>
                    </div>
                  )
                )}
              </div>
          </div>

          {/* 近期入库履历 (固定高度 340px，自适应内部滚动) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden h-[340px] flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={15} className="text-blue-600" /> 近期建档入库资产
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">最新流水</span>
              </div>

              <div className="divide-y divide-slate-100 flex-1 overflow-y-auto custom-scrollbar">
                  {recentAssets.length > 0 ? recentAssets.map(asset => (
                      <div key={asset.id} className="p-3.5 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center shrink-0 text-blue-600 font-bold text-xs">
                                  <Box size={16} />
                              </div>
                              <div className="min-w-0">
                                  <p className="font-bold text-slate-800 text-xs truncate" title={asset.name}>{asset.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                      <span className="numeric-text">{asset.activationDate}</span>
                                      {asset.assetCode && <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-500 font-mono text-[9px]">{asset.assetCode}</span>}
                                  </p>
                              </div>
                          </div>
                          <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-slate-900 numeric-text">¥{(asset.originalValue || 0).toLocaleString()}</p>
                              <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border ${asset.status === AssetStatus.ACTIVE ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                  {asset.status}
                              </span>
                          </div>
                      </div>
                  )) : <div className="p-8 text-center text-slate-400 text-xs">暂无在册登记记录</div>}
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};

