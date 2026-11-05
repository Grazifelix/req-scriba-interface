import React from 'react';

interface ToastProps {
  message: string | null;
  icon?: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, icon = 'check_circle', onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#213145] text-[#eaf1ff] px-4 py-3 rounded-xl shadow-2xl font-sans text-sm flex items-center gap-3 border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <span className="material-symbols-outlined text-[#6ffbbe] text-[20px]">{icon}</span>
      <span className="font-medium">{message}</span>
      <button 
        onClick={onClose}
        className="ml-2 text-white/60 hover:text-white p-1 rounded transition-colors"
        aria-label="Fechar notificação"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
