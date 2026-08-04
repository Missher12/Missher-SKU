import React, { useState } from 'react';
import { FixedAsset, InventoryItem, AiInsight, AppSettings } from '../types';
import { analyzeData } from '../services/geminiService';
import { Sparkles, AlertTriangle, CheckCircle, Info, Loader2, Settings } from 'lucide-react';

interface AiInsightsProps {
  assets: FixedAsset[];
  inventory: InventoryItem[];
  settings: AppSettings;
}

export const AiInsights: React.FC<AiInsightsProps> = ({ assets, inventory, settings }) => {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const handleAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await analyzeData(assets, inventory, settings);
      setInsights(results);
      setHasRun(true);
    } catch (err: any) {
        console.error(err);
        let errorMsg = "分析服务连接失败，请检查系统设置中的 AI 配置。";
        if (err.message) errorMsg += ` (${err.message})`;
        setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch(severity) {
      case 'high': return '高优先级';
      case 'medium': return '中优先级';
      case 'low': return '低优先级';
      default: return '普通';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'warning': return '警告';
      case 'optimization': return '优化';
      case 'info': return '信息';
      default: return '通知';
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'optimization': return <Sparkles className="w-5 h-5 text-purple-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-800">智能资产分析</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          当前使用模型: <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{settings.aiConfig.modelName} ({settings.aiConfig.provider})</span>
        </p>
        
        {!loading && (
          <button 
            onClick={handleAnalysis}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all transform hover:-translate-y-1 font-medium"
          >
            <Sparkles size={18} />
            {hasRun ? '刷新分析报告' : '开始智能分析'}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 animate-pulse">正在连接 {settings.aiConfig.provider} 分析数据...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-700">
          <AlertTriangle className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">分析失败</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {hasRun && !loading && insights.length > 0 && (
        <div className="grid gap-4 mt-8">
          {insights.map((insight, index) => (
            <div 
              key={index} 
              className={`p-6 rounded-xl border flex gap-4 ${getSeverityColor(insight.severity)}`}
            >
              <div className="shrink-0 bg-white bg-opacity-50 p-2 rounded-lg h-fit">
                {getIcon(insight.type)}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{insight.title}</h3>
                <p className="opacity-90 leading-relaxed text-sm">{insight.description}</p>
                <div className="mt-3 flex gap-2">
                   <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 bg-white bg-opacity-40 rounded">
                     {getSeverityLabel(insight.severity)}
                   </span>
                   <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 bg-white bg-opacity-40 rounded">
                     {getTypeLabel(insight.type)}
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {hasRun && !loading && insights.length === 0 && (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p>一切看起来很不错！AI 未发现关键风险点。</p>
        </div>
      )}
    </div>
  );
};