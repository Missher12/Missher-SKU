import React, { useState, useEffect } from 'react';
import { ShowToastFunction, User } from '../types';
import { Package, Shield, ArrowRight, Lock, Phone, MessageSquare, RefreshCw, Sparkles, Activity, Layers } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  appName: string;
  logoUrl?: string;
  headline?: string;
  description?: string;
  copyrightText?: string;
  onShowToast?: ShowToastFunction;
}

export const Login: React.FC<LoginProps> = ({ users, onLogin, appName, logoUrl, headline, description, copyrightText }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [error, setError] = useState('');

  // 生成随机验证码
  const generateCaptcha = () => {
    // 排除易混淆字符 (如 0, O, 1, I)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
  };

  // 初始化验证码并设置定时刷新
  useEffect(() => {
    generateCaptcha(); // 首次生成
    
    // 每30秒自动刷新一次
    const intervalId = setInterval(() => {
      generateCaptcha();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 基础非空校验
    if (!phone) {
        setError('请输入手机号码');
        return;
    }
    if (!password) {
        setError('请输入登录密码');
        return;
    }
    if (!verifyCode) {
        setError('请输入右侧验证码');
        return;
    }

    // 校验验证码 (不区分大小写)
    if (verifyCode.toUpperCase() !== captcha) {
        setError('验证码错误，已为您刷新，请重新输入');
        generateCaptcha(); // 输错后刷新验证码
        setVerifyCode('');
        return;
    }

    // 查找用户
    const user = users.find(u => u.phone === phone);
    
    if (!user) {
      setError('未找到该手机号关联的账号');
      return;
    }

    if (user.status === 'disabled') {
      setError('该账号已被禁用，请联系管理员');
      return;
    }

    // 校验密码
    if (user.password !== password) {
        setError('登录密码错误');
        return;
    }

    // 通过所有校验
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex bg-slate-900 font-sans text-slate-900 overflow-hidden relative selection:bg-blue-500 selection:text-white">
      {/* 动态渐变背景 & 浮动光晕 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[900px] h-[900px] bg-gradient-to-br from-blue-600/30 via-indigo-600/20 to-purple-600/10 rounded-full blur-[140px] animate-gradient-float"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-gradient-to-tr from-sky-600/25 via-blue-700/20 to-teal-500/15 rounded-full blur-[160px] animate-gradient-float-reverse"></div>
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Left Section: Brand & Glassmorphic Hero Card */}
      <div className="hidden lg:flex lg:w-7/12 relative z-10 flex-col justify-between p-12 text-white">
         {/* Logo / 顶部企业标识 */}
         <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25 shadow-lg overflow-hidden shrink-0">
               {logoUrl ? (
                   <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                   <Package size={22} className="text-white" />
               )}
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">{appName}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200/80">Enterprise Asset Platform</span>
            </div>
         </div>

         {/* 核心宣传区域：毛玻璃 (Backdrop Blur) 卡片 */}
         <div className="my-auto max-w-xl pr-6">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-slate-950/40 relative overflow-hidden group">
               {/* 光晕装饰纹理 */}
               <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl pointer-events-none"></div>

               {/* 特性标签项 */}
               <div className="flex flex-wrap items-center gap-2 mb-6">
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 backdrop-blur-sm">
                   <Sparkles size={13} className="text-blue-300" /> AI 智能辨识
                 </span>
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
                   <Layers size={13} className="text-indigo-300" /> 全生命周期
                 </span>
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 backdrop-blur-sm">
                   <Activity size={13} className="text-emerald-300" /> 实时风险预警
                 </span>
               </div>

               {/* 主宣传标题 */}
               <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-snug mb-5 whitespace-pre-line tracking-tight drop-shadow-xs">
                  {headline || "全方位的企业资产\n与库存智能化管理平台"}
               </h2>

               {/* 宣传描述 */}
               <p className="text-slate-200/90 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                  {description || "集成大模型智能分析与辨识，助力企业实现固定资产全生命周期履历追溯、精细化库存盘点及供应商合同协同，数据驱动高效决策。"}
               </p>

               {/* 简易状态统计底栏 */}
               <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
                 <div>
                   <div className="text-xl font-black text-white numeric-text">99.8%</div>
                   <div className="text-[11px] text-slate-300/80">盘点准确率</div>
                 </div>
                 <div>
                   <div className="text-xl font-black text-white numeric-text">100%</div>
                   <div className="text-[11px] text-slate-300/80">全流转追溯</div>
                 </div>
                 <div>
                   <div className="text-xl font-black text-white numeric-text">实时</div>
                   <div className="text-[11px] text-slate-300/80">预警智能推送</div>
                 </div>
               </div>
            </div>
         </div>

         {/* 版权声明 */}
         <div className="text-xs text-slate-400 font-medium">
            {copyrightText || `© ${new Date().getFullYear()} ${appName} Enterprise Solutions. All rights reserved.`}
         </div>
      </div>

      {/* Right Section: Login Form Card */}
      <div className="flex-1 z-10 flex flex-col justify-center items-center p-6 sm:p-12 bg-slate-900/60 lg:bg-slate-900/40 backdrop-blur-md">
         <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-slate-100/90 relative">
            <div className="mb-8 text-center lg:text-left">
               <div className="lg:hidden flex justify-center mb-4">
                  {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                  ) : (
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200"><Package size={24}/></div>
                  )}
               </div>
               <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">欢迎登录系统</h1>
               <p className="text-slate-500 text-xs sm:text-sm">验证绑定手机号与工作密码以进入工作台</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 flex items-center gap-2 animate-shake">
                        <Shield size={15} className="shrink-0 text-red-500"/> <span>{error}</span>
                    </div>
                )}
                
                {/* 手机号输入 */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">手机号码</label>
                    <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input 
                            type="text" 
                            required
                            className="w-full border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all bg-slate-50/80 focus:bg-white numeric-text font-medium"
                            placeholder="请输入绑定的手机号"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>

                {/* 密码输入 */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">登录密码</label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input 
                            type="password" 
                            required
                            className="w-full border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all bg-slate-50/80 focus:bg-white font-medium"
                            placeholder="请输入登录密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {/* 验证码输入 + 图形验证码 */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">安全图形验证码</label>
                    <div className="flex gap-3 h-12">
                        <div className="relative flex-1 h-full">
                            <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                            <input 
                                type="text" 
                                required
                                maxLength={4}
                                className="w-full h-full border border-slate-200 pl-10 pr-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all bg-slate-50/80 focus:bg-white tracking-widest font-bold uppercase"
                                placeholder="输入右侧 4 位验证码"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value)}
                            />
                        </div>
                        {/* 验证码展示区 */}
                        <div 
                            className="w-32 h-full bg-slate-100 border border-slate-200 rounded-xl cursor-pointer flex items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-all select-none shrink-0"
                            onClick={generateCaptcha}
                            title="点击刷新验证码"
                        >
                            {/* 干扰背景 */}
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:8px_8px]"></div>
                            <div className="absolute inset-0 opacity-5 bg-[linear-gradient(45deg,transparent_25%,#000_50%,transparent_75%)] [background-size:10px_10px]"></div>
                            
                            {/* 验证码文本 */}
                            <span className="text-xl font-mono font-black text-slate-700 tracking-[0.25em] z-10 group-hover:scale-110 transition-transform duration-300 relative">
                                {captcha}
                            </span>
                            
                            {/* 刷新图标 */}
                            <div className="absolute right-1.5 top-1.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <RefreshCw size={11} />
                            </div>

                            {/* 倒计时指示条 */}
                            <div className="absolute bottom-0 left-0 h-0.5 bg-blue-600/40 animate-[width_30s_linear_infinite] w-full origin-left"></div>
                        </div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-[0.99] mt-3 text-sm cursor-pointer"
                >
                    安全登录账号 <ArrowRight size={17} />
                </button>
            </form>
         </div>
      </div>
    </div>
  );
};
