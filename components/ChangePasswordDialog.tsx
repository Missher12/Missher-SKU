import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (oldPass: string, newPass: string) => void;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ isOpen, onClose, onSubmit }) => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (newPass.length < 6) {
      setError('新密码长度不能少于 6 位');
      return;
    }
    onSubmit(oldPass, newPass);
    // Reset fields
    setOldPass('');
    setNewPass('');
    setConfirmPass('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Lock size={18} className="text-blue-600" /> 修改登录密码
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-2 rounded border border-red-100">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">当前旧密码</label>
            <input 
              type="password" 
              required
              className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={oldPass}
              onChange={e => setOldPass(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">设置新密码</label>
            <input 
              type="password" 
              required
              className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">确认新密码</label>
            <input 
              type="password" 
              required
              className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">取消</button>
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-md active:scale-95 transition-transform">确认修改</button>
          </div>
        </form>
      </div>
    </div>
  );
};
