import React from 'react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-14 bg-surface/80 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between border-b border-neutral-200/50 pl-72 select-none">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-extrabold text-[#0F172A] tracking-tight">{title}</h2>
        <div className="h-4 w-px bg-neutral-200 mx-1"></div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#E8F8F0] text-[#10B981] text-[9px] font-bold border border-[#10B981]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
          Operational Mode
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative cursor-pointer text-neutral-400 hover:text-primary transition-colors group">
          <span className="material-symbols-outlined text-lg">notifications</span>
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-surface"></span>
        </div>
        
        <div className="flex items-center gap-3 cursor-pointer group px-3 py-1.5 border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all">
          <div className="text-right">
            <p className="text-[8px] text-neutral-400 leading-none mb-1 font-bold uppercase tracking-widest">WORKSPACE</p>
            <p className="text-xs font-bold text-[#1E293B] leading-none">Global Enterprise</p>
          </div>
          <span className="material-symbols-outlined text-neutral-400 text-md">sensors_krx</span>
        </div>
      </div>
    </header>
  );
};
export default Header;
