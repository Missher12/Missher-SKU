import React, { useState } from 'react';
import { MapPin, Image as ImageIcon, ZoomIn, X, Upload } from 'lucide-react';

interface LocationCellProps {
  location?: string;
  locationImage?: string;
  editable?: boolean;
  onImageChange?: (image: string) => void;
  className?: string;
}

export const LocationCell: React.FC<LocationCellProps> = ({
  location,
  locationImage,
  editable = false,
  onImageChange,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  if (!location && !locationImage) {
    return <span className="text-slate-300 text-xs">-</span>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageChange) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverHeight = 220;
    const popoverWidth = 240;

    let top = rect.top - popoverHeight - 8;
    if (top < 10) {
      // 如果上方空间不够，显示在触点下方
      top = rect.bottom + 8;
    }
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }
    if (left < 10) left = 10;

    setPopoverPos({ top, left });
    setIsHovered(true);
  };

  return (
    <div className={`relative inline-flex items-center gap-2 group ${className}`}>
      {/* 默认缩略图或图标 */}
      <div 
        className="relative flex items-center gap-1.5 cursor-pointer select-none py-0.5 px-1 rounded hover:bg-slate-100 transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => locationImage && setIsFullscreen(true)}
      >
        {locationImage ? (
          <div className="relative w-7 h-7 rounded border border-slate-200 overflow-hidden shrink-0 bg-slate-100 shadow-2xs group-hover:border-indigo-400 transition-all">
            <img 
              src={locationImage} 
              alt={location || '存放位置照片'} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <ZoomIn size={12} />
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 rounded border border-dashed border-slate-300 flex items-center justify-center shrink-0 text-slate-400 bg-slate-50 group-hover:text-indigo-600 group-hover:border-indigo-300 transition-colors">
            <MapPin size={14} />
          </div>
        )}

        {location && (
          <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]" title={location}>
            {location}
          </span>
        )}
      </div>

      {/* 悬停放大预览浮层 - 使用 fixed 绝对顶级图层，绝不被表格 overflow 或 header 遮挡 */}
      {isHovered && locationImage && popoverPos && (
        <div 
          className="fixed z-[9999] w-60 bg-slate-900 text-white rounded-xl shadow-2xl p-2.5 border border-slate-700 pointer-events-none animate-fade-in"
          style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
        >
          <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-950 mb-2 border border-slate-800">
            <img 
              src={locationImage} 
              alt={location || '存放位置'} 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
              <ZoomIn size={10} /> 点击查看大图
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 truncate">
            <MapPin size={12} className="text-indigo-400 shrink-0" />
            <span className="truncate">{location || '未标注位置名称'}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">存放位置实景照片</div>
        </div>
      )}

      {/* 悬停无图时的快速添加提示（如果可编辑） */}
      {isHovered && !locationImage && editable && onImageChange && popoverPos && (
        <label 
          className="fixed z-[9999] bg-slate-800 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap hover:bg-slate-700 transition-colors"
          style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
        >
          <Upload size={12} /> 上传位置图片
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      )}

      {/* 点击大图弹窗 (Fullscreen Modal) */}
      {isFullscreen && locationImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsFullscreen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <MapPin className="text-indigo-400" size={18} />
                <span>{location ? `存放位置实景图：${location}` : '存放位置实景图'}</span>
              </div>
              <button 
                onClick={() => setIsFullscreen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black/40 flex items-center justify-center max-h-[70vh]">
              <img 
                src={locationImage} 
                alt={location || '存放位置大图'} 
                className="max-h-[68vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
