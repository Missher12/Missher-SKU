import React, { useState } from 'react';
import { AuditLog } from '../types';
import { Search, Clock, User, Activity, FileText, Filter, RotateCcw, ShieldCheck, Database, Sliders } from 'lucide-react';

interface LogCenterProps {
  logs: AuditLog[];
}

export const LogCenter: React.FC<LogCenterProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('ALL');

  // 提取所有不重复的模块用于筛选
  const modules = Array.from(new Set(logs.map(log => log.module)));

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term ||
      log.action.toLowerCase().includes(term) || 
      log.operator.toLowerCase().includes(term) ||
      log.target.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.module.toLowerCase().includes(term);
    
    const matchesModule = filterModule === 'ALL' || log.module === filterModule;

    return matchesSearch && matchesModule;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // 按时间倒序

  // 模块颜色的对比样式
  const getModuleBadgeStyle = (moduleName: string) => {
    if (moduleName.includes('资产')) return 'bg-blue-50 text-blue-700 border-blue-200/80';
    if (moduleName.includes('库存') || moduleName.includes('物资')) return 'bg-amber-50 text-amber-700 border-amber-200/80';
    if (moduleName.includes('电脑') || moduleName.includes('设备')) return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    if (moduleName.includes('合同') || moduleName.includes('供应商')) return 'bg-purple-50 text-purple-700 border-purple-200/80';
    if (moduleName.includes('系统') || moduleName.includes('安全') || moduleName.includes('日志')) return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 顶部简要统计卡片组 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">系统日志记录数</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5 numeric-text">{logs.length} <span className="text-xs font-normal text-slate-400">条</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Database size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">覆盖业务模块</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5 numeric-text">{modules.length} <span className="text-xs font-normal text-slate-400">个</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">安全审计保留期</div>
            <div className="text-xl font-bold text-emerald-600 mt-0.5 numeric-text">180 <span className="text-xs font-normal text-slate-400">天</span></div>
          </div>
        </div>
      </div>

      {/* 顶部多功能检索与筛选区域 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Search size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">日志检索与关键流水追踪</h3>
              <p className="text-xs text-slate-400 mt-0.5">支持按操作员名称、业务模块、动作及详情关键词多维实时搜索</p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* 模块下拉筛选 */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-[#F8FAFC]">
               <Filter size={14} className="text-slate-400 shrink-0" />
               <select 
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-2"
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
               >
                   <option value="ALL">全部模块 ({logs.length})</option>
                   {modules.map(m => <option key={m} value={m}>{m}</option>)}
               </select>
            </div>

            {/* 顶部主搜索框 */}
            <div className="relative w-full sm:w-80 md:w-96">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="搜索操作员姓名、归属模块或日志内容..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-xs bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>

            {(searchTerm || filterModule !== 'ALL') && (
              <button 
                onClick={() => { setSearchTerm(''); setFilterModule('ALL'); }}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                title="重置全部筛选"
              >
                <RotateCcw size={14} />
                <span>重置</span>
              </button>
            )}
          </div>
        </div>

        {/* 快捷搜索标签建议 */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-medium shrink-0">快捷过滤关键词:</span>
          {['超级管理员', '资产管理', '库存明细', '采购合同', '系统设置'].map(tag => (
            <button
              key={tag}
              onClick={() => setSearchTerm(tag)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                searchTerm === tag 
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              #{tag}
            </button>
          ))}
          {searchTerm && (
            <span className="ml-auto text-[11px] font-bold text-blue-600 numeric-text">
              匹配到 {filteredLogs.length} 条记录
            </span>
          )}
        </div>
      </div>

      {/* 主表单卡片 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* 卡片头部说明 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <Sliders className="text-blue-600 shrink-0" size={18} />
            <h3 className="text-sm font-bold text-slate-800">操作审计日志明细</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">按时间倒序排列</span>
        </div>

        {/* 表格内容 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 w-[165px]">操作时间</th>
                <th className="px-5 py-3.5 w-[130px]">操作员</th>
                <th className="px-5 py-3.5 w-[120px]">归属业务模块</th>
                <th className="px-5 py-3.5 w-[190px]">操作动作</th>
                <th className="px-5 py-3.5">详细记录说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 操作时间 */}
                    <td className="px-5 py-3.5 whitespace-nowrap align-middle">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium numeric-text">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>{log.timestamp}</span>
                      </div>
                    </td>

                    {/* 操作员 */}
                    <td className="px-5 py-3.5 whitespace-nowrap align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {log.operator.charAt(0) || '管'}
                        </div>
                        <span className="font-bold text-slate-800 text-xs">{log.operator}</span>
                      </div>
                    </td>

                    {/* 涉及模块 */}
                    <td className="px-5 py-3.5 whitespace-nowrap align-middle">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${getModuleBadgeStyle(log.module)}`}>
                        {log.module}
                      </span>
                    </td>

                    {/* 动作与目标对象 */}
                    <td className="px-5 py-3.5 whitespace-nowrap align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs shrink-0">{log.action}</span>
                        {log.target && (
                          <span className="text-[10px] bg-slate-100/90 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/80 font-medium numeric-text truncate max-w-[130px]" title={log.target}>
                            {log.target}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 详细记录说明 */}
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-1.5 rounded-lg border border-slate-200/50 text-slate-700 text-xs">
                        <FileText size={13} className="text-slate-400 shrink-0" />
                        <span className="numeric-text truncate max-w-[550px]" title={log.details}>{log.details}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Activity size={32} className="text-slate-300" />
                        <p className="text-sm font-medium">未找到符合搜索条件的日志记录</p>
                        <p className="text-xs text-slate-400">请尝试更换关键字或取消模块筛选条件</p>
                      </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 页脚统计 */}
        <div className="bg-slate-50/80 px-6 py-3.5 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center font-medium">
            <span>显示 <strong className="text-slate-800 numeric-text">{filteredLogs.length}</strong> 条符合条件的审计记录</span>
            <span className="text-slate-400 text-[11px]">操作日志自动加密归档存储</span>
        </div>
      </div>
    </div>
  );
};
