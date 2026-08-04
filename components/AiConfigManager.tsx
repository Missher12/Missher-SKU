import React, { useState } from 'react';
import { AppSettings, AiProvider, ShowToastFunction, LogFunction } from '../types';
import { testAiConnection } from '../services/geminiService';
import { GoogleGenAI } from '@google/genai';
import { 
  Sparkles, ShieldCheck, Eye, EyeOff, Wifi, Save, Loader2, Key, Globe, 
  Cpu, Sliders, CheckCircle2, XCircle, AlertCircle, RefreshCw, Send,
  Zap, Bot, Lock, Check, ExternalLink, HelpCircle, ChevronRight
} from 'lucide-react';

interface AiConfigManagerProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  addToast: ShowToastFunction;
  logAction?: LogFunction;
}

interface ProviderPreset {
  id: AiProvider;
  name: string;
  badge: string;
  description: string;
  defaultModel: string;
  defaultBaseUrl: string;
  recommendedModels: { id: string; name: string; tag?: string }[];
  iconBg: string;
  iconColor: string;
  docsUrl?: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini (推荐)',
    badge: '官方原生支持',
    description: '采用 Google 最新的 Gemini 3.0/2.5 系列视觉与文本高阶大模型，性能强大且响应极速。',
    defaultModel: 'gemini-3-flash-preview',
    defaultBaseUrl: '',
    recommendedModels: [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (预览版)', tag: '推荐·极速' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: '稳定通用' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: '高性价比' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: '复杂推理' }
    ],
    iconBg: 'bg-blue-50/80 border-blue-200',
    iconColor: 'text-blue-600'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索)',
    badge: '国产高性价比',
    description: '深度求索通用大语言模型 DeepSeek-V3 与推理模型 DeepSeek-R1，代码与数理分析优秀。',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    recommendedModels: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3 Chat', tag: '通用对话' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1 Reasoner', tag: '深度思考' }
    ],
    iconBg: 'bg-cyan-50/80 border-cyan-200',
    iconColor: 'text-cyan-600'
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    badge: '行业标准',
    description: '支持 GPT-4o / GPT-4o-mini 等官方模型，或兼容 OpenAI 协议的自建/第三方中转代理。',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    recommendedModels: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tag: '轻量极速' },
      { id: 'gpt-4o', name: 'GPT-4o', tag: '全能旗舰' }
    ],
    iconBg: 'bg-emerald-50/80 border-emerald-200',
    iconColor: 'text-emerald-600'
  },
  {
    id: 'custom',
    name: 'Custom / Proxy (自定义端点)',
    badge: '自建私有化',
    description: '适配 OneAPI, NewAPI, Local Ollama, VLLM 或企业内部自建的 OpenAI/Gemini 代理网关。',
    defaultModel: 'custom-model',
    defaultBaseUrl: 'http://localhost:11434/v1',
    recommendedModels: [
      { id: 'qwen-2.5-72b', name: 'Qwen 2.5 (通义千问)', tag: '开源首选' },
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', tag: '本地部署' }
    ],
    iconBg: 'bg-purple-50/80 border-purple-200',
    iconColor: 'text-purple-600'
  }
];

export const AiConfigManager: React.FC<AiConfigManagerProps> = ({
  settings,
  setSettings,
  addToast,
  logAction
}) => {
  // Local Temp Config Form State
  const [config, setConfig] = useState(settings.aiConfig || {
    provider: 'gemini',
    modelName: 'gemini-3-flash-preview',
    creativityLevel: 0.7,
    apiKey: '',
    baseUrl: ''
  });

  // UI Interactive States
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Connection Test Result State
  const [testState, setTestState] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    latencyMs?: number;
    responseMsg?: string;
    errorDetail?: string;
  }>({ status: 'idle' });

  // Live Playground / Quick Test State
  const [playgroundQuery, setPlaygroundQuery] = useState('请用一句话简要总结固定资产折旧盘点的核心目的。');
  const [playgroundOutput, setPlaygroundOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Toggle or select provider preset
  const handleSelectProvider = (providerId: AiProvider) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === providerId);
    if (!preset) return;

    setConfig(prev => ({
      ...prev,
      provider: providerId,
      modelName: preset.defaultModel,
      baseUrl: preset.defaultBaseUrl
    }));

    addToast(`已切换至【${preset.name}】预设方案`, 'info');
  };

  // Quick select recommended model
  const handleSelectModel = (modelId: string) => {
    setConfig(prev => ({ ...prev, modelName: modelId }));
  };

  // Test Connection Ping
  const handleTestConnection = async () => {
    setTestState({ status: 'testing' });
    const startTime = Date.now();

    const tempSettings: AppSettings = {
      ...settings,
      aiConfig: config
    };

    try {
      const res = await testAiConnection(tempSettings);
      const elapsed = Date.now() - startTime;

      if (res.success) {
        setTestState({
          status: 'success',
          latencyMs: elapsed,
          responseMsg: res.message
        });
        addToast(`✅ 连通性测试成功！耗时 ${elapsed}ms`, 'success');
      } else {
        setTestState({
          status: 'error',
          errorDetail: res.message
        });
        addToast(`❌ 连通测试失败: ${res.message}`, 'error');
      }
    } catch (err: any) {
      setTestState({
        status: 'error',
        errorDetail: err.message || '网络无法连接或端点拒绝服务'
      });
      addToast(`❌ 测试发生异常: ${err.message}`, 'error');
    }
  };

  // Run Playground Quick Prompt Test
  const handleRunPlayground = async () => {
    if (!playgroundQuery.trim()) return;
    
    setIsGenerating(true);
    setPlaygroundOutput('正在与大模型进行交互通信...');

    const tempSettings: AppSettings = {
      ...settings,
      aiConfig: config
    };

    const apiKey = config.apiKey?.trim() || (process as any).env?.GEMINI_API_KEY || '';

    if (!apiKey) {
      setPlaygroundOutput('⚠️ 错误：未配置 API Key。请在上方输入 API 密钥或切换预设。');
      setIsGenerating(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.modelName || 'gemini-3-flash-preview',
        contents: playgroundQuery,
        config: {
          temperature: config.creativityLevel ?? 0.7,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      setPlaygroundOutput(response.text || '（模型返回空结果）');
    } catch (err: any) {
      setPlaygroundOutput(`❌ 交互失败: ${err.message || '网络连接超时或鉴权失败'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Settings
  const handleSaveConfig = () => {
    setIsSaving(true);
    setTimeout(() => {
      setSettings(prev => ({
        ...prev,
        aiConfig: config
      }));
      setIsSaving(false);
      addToast('✨ AI 服务接口配置已成功保存并立即生效！', 'success');
      logAction?.('更新配置', '系统设置', 'AI服务接口', `更新了 AI 提供商为 ${config.provider}，使用模型 ${config.modelName}`);
    }, 450);
  };

  const currentPreset = PROVIDER_PRESETS.find(p => p.id === config.provider) || PROVIDER_PRESETS[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">AI 服务接口配置中心</h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[10px] font-bold">
                  Multi-LLM Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                管理资产管理系统的智能推理引擎。配置大模型 API 密钥与端点，全面激活资产风险预测、供应商名录识图提取与智能对话助手。
              </p>
            </div>
          </div>

          {/* 右侧环境检测与提示 */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
            <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-slate-700">系统环境密钥检测：</span>
              <span className="text-emerald-600 font-bold ml-1">GEMINI_API_KEY 已加载</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Provider Selection Presets Cards */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Cpu size={15} className="text-blue-600" />
          <span>选择 AI 服务提供商预设卡片</span>
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {PROVIDER_PRESETS.map(preset => {
            const isSelected = config.provider === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectProvider(preset.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected 
                    ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/10 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${preset.iconBg} ${preset.iconColor}`}>
                      {preset.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{preset.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>默认模型: <span className="font-mono text-slate-600 font-medium">{preset.defaultModel}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Detailed Parameter Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sliders size={16} className="text-blue-600" />
            <span>【{currentPreset.name}】接口参数设定</span>
          </h4>
          <span className="text-xs text-slate-400">实时参数更新后请点击底栏保存生效</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI 提供商选择 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              服务提供商 (Provider)
            </label>
            <select
              value={config.provider}
              onChange={(e) => handleSelectProvider(e.target.value as AiProvider)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="gemini">Google Gemini (官方)</option>
              <option value="deepseek">DeepSeek (深度求索)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="custom">Custom Endpoint (自定义中转网关)</option>
            </select>
          </div>

          {/* 模型名称 + 快捷快捷标签选择 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              模型标识 (Model Identifier)
            </label>
            <input
              type="text"
              placeholder="如：gemini-3-flash-preview 或 deepseek-chat"
              value={config.modelName}
              onChange={(e) => setConfig(prev => ({ ...prev, modelName: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 mr-1">快捷预设:</span>
              {currentPreset.recommendedModels.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectModel(m.id)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                    config.modelName === m.id 
                      ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.id} {m.tag ? `(${m.tag})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          {/* API Key 密钥输入框 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Key size={14} className="text-amber-500" />
                <span>API 访问密钥 (API Key)</span>
              </label>
              <span className="text-[10px] text-slate-400">留空则优先使用系统后台环境变量</span>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="填写您的 API Key (如 AIzaSy... 或 sk-...)"
                value={config.apiKey || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* API 接口端点 Base URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Globe size={14} className="text-blue-500" />
                <span>接口服务 Base URL (网络端点)</span>
              </label>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, baseUrl: currentPreset.defaultBaseUrl }))}
                className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
              >
                还原默认
              </button>
            </div>
            <input
              type="text"
              placeholder={currentPreset.defaultBaseUrl || 'Google 官方端点可保留为空'}
              value={config.baseUrl || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 创造力随机度 (Temperature) 滑块 */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              <span>随机创造力 (Temperature / 发散度)</span>
            </label>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md numeric-text">
              {config.creativityLevel ?? 0.7}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.creativityLevel ?? 0.7}
            onChange={(e) => setConfig(prev => ({ ...prev, creativityLevel: parseFloat(e.target.value) }))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>精准计算 / 事实抽取 (0.0)</span>
            <span className="text-blue-600 font-medium">智能推荐平衡 (0.7)</span>
            <span>创意发散 / 灵活对话 (1.0)</span>
          </div>
        </div>
      </div>

      {/* 4. Connection Ping & Interactive Test Box Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 左侧：API 连通性真实测试卡片 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Wifi size={16} className="text-emerald-500" />
                <span>接口连通性响应测试</span>
              </h4>
              <span className="text-[10px] text-slate-400">实时 Ping 验证</span>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              向目标 API 端点发送微型测试载荷，验证 API Key 权限、DNS 解析以及网络通畅性。
            </p>

            {/* 测试结果展示 */}
            {testState.status !== 'idle' && (
              <div className="mt-4">
                {testState.status === 'testing' && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-center gap-2.5">
                    <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />
                    <span>正在发起 API Ping 测试通信，请稍候...</span>
                  </div>
                )}

                {testState.status === 'success' && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 size={16} /> 连通正常！API 响应完美
                      </span>
                      {testState.latencyMs !== undefined && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-mono font-black numeric-text">
                          {testState.latencyMs} ms
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-700/90 font-mono truncate">
                      {testState.responseMsg}
                    </p>
                  </div>
                )}

                {testState.status === 'error' && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700">
                      <XCircle size={16} /> 连通失败
                    </div>
                    <p className="text-[11px] text-rose-600 leading-relaxed font-mono">
                      {testState.errorDetail}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={testState.status === 'testing'}
            onClick={handleTestConnection}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-all text-xs border border-slate-200 cursor-pointer disabled:opacity-50 mt-4"
          >
            {testState.status === 'testing' ? (
              <>
                <Loader2 size={15} className="animate-spin text-blue-600" />
                <span>正在测试 Ping...</span>
              </>
            ) : (
              <>
                <Wifi size={15} className="text-blue-600" />
                <span>发起 API 连通测试 (Ping)</span>
              </>
            )}
          </button>
        </div>

        {/* 右侧：体验测试演练区 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Bot size={16} className="text-purple-600" />
                <span>AI 提问与体验测试区</span>
              </h4>
              <span className="text-[10px] text-slate-400">实时模型输出预览</span>
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">测试 Prompt 试用语句</span>
                <button
                  type="button"
                  onClick={() => setPlaygroundQuery('请分析企业固定资产盘点中，领用电脑未按规定注销的风险。')}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  填入示例 Prompt
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={playgroundQuery}
                  onChange={(e) => setPlaygroundQuery(e.target.value)}
                  placeholder="输入测试问题..."
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={isGenerating || !playgroundQuery.trim()}
                  onClick={handleRunPlayground}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                  <span>发送测试</span>
                </button>
              </div>
            </div>

            {/* 输出文本框 */}
            <div className="mt-3 bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 min-h-[72px] text-xs text-slate-700 font-mono leading-relaxed max-h-[120px] overflow-y-auto">
              {playgroundOutput ? (
                <span>{playgroundOutput}</span>
              ) : (
                <span className="text-slate-400 italic">点击“发送测试”查看大模型生成的实时回复文本...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. 底栏保存主按钮 */}
      <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <HelpCircle size={15} className="text-slate-400" />
          <span>保存后，资产智能评估、发票读取与右上方对话助手将立即切换使用新参数。</span>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSaveConfig}
          className="flex items-center gap-2 bg-[#059669] hover:bg-emerald-700 text-white px-7 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-xs text-xs cursor-pointer disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>正在保存应用配置...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>保存 AI 接口配置</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
