import React from 'react';
import { ScreenType } from '../types.ts';

interface ProjectNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const ProjectNav: React.FC<ProjectNavProps> = ({ currentScreen, onNavigate }) => {
  const tabs = [
    { id: 'visao-geral' as ScreenType, label: 'Visão Geral', icon: 'dashboard' },
    { id: 'projeto-ingestao' as ScreenType, label: 'Ingestão de dados', icon: 'upload_file' },
    { id: 'projeto-fontes' as ScreenType, label: 'Fontes de Dados', icon: 'database' },
    { id: 'follow-up' as ScreenType, label: 'Perguntas de Follow-up', icon: 'help_outline' },
  ];

  return (
    <div className="w-full bg-white border-b border-outline-variant/30 sticky top-16 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const isActive = 
            currentScreen === tab.id || 
            (tab.id === 'visao-geral' && currentScreen === 'avaliacao-qualidade');

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
