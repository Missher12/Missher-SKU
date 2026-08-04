import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000); // 3秒后自动关闭
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle size={20} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={20} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={20} className="text-amber-500" />;
      case 'info': return <Info size={20} className="text-blue-500" />;
    }
  };

  const getStyles = () => {
      switch (toast.type) {
      case 'success': return 'border-emerald-100 bg-emerald-50 text-emerald-900';
      case 'error': return 'border-red-100 bg-red-50 text-red-900';
      case 'warning': return 'border-amber-100 bg-amber-50 text-amber-900';
      case 'info': return 'border-blue-100 bg-blue-50 text-blue-900';
    }
  }

  const getBarColor = () => {
    switch (toast.type) {
        case 'success': return 'bg-emerald-500';
        case 'error': return 'bg-red-500';
        case 'warning': return 'bg-amber-500';
        case 'info': return 'bg-blue-500';
      }
  }

  return (
    <div className={`flex items-center w-full max-w-sm p-4 mb-3 rounded-xl shadow-lg border animate-slide-up relative overflow-hidden ${getStyles()}`}>
      {/* Side Bar Indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getBarColor()}`}></div>
      
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-white/60">
        {getIcon()}
      </div>
      <div className="ml-3 text-sm font-medium flex-1">{toast.message}</div>
      <button 
        onClick={() => onClose(toast.id)}
        className="ml-auto -mx-1.5 -my-1.5 text-slate-400 hover:text-slate-600 rounded-lg p-1.5 inline-flex h-8 w-8 items-center justify-center hover:bg-white/50 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-24 right-6 z-[100] flex flex-col items-end pointer-events-none">
        {/* Enable pointer events for children so buttons work */}
        <div className="pointer-events-auto">
            {toasts.map(t => (
                <Toast key={t.id} toast={t} onClose={removeToast} />
            ))}
        </div>
    </div>
  );
};
