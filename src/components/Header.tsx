import React, { useState } from 'react';
import { ScreenType, Project, UserProfile } from '../types.ts';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  activeProject: Project;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  activeProject,
  projects,
  onSelectProject,
  currentUser,
  onLogout,
}) => {
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand & Active Project */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            title="Ir para Meus Projetos"
          >
            <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-sm group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-[20px]">history_edu</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-on-surface leading-tight tracking-tight">ReqScriba</span>
              <span className="text-[11px] text-on-surface-variant font-medium leading-none">Criador de Requisitos</span>
            </div>
          </button>

          <span className="hidden md:block h-5 w-px bg-outline-variant/50"></span>

          {/* Project switcher pill (visible on non-home screens or selectable) */}
          <div className="relative">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition-colors border border-outline-variant/30"
              title="Trocar de Projeto"
            >
              <span className="text-on-surface-variant">Projeto:</span>
              <span className="font-semibold text-primary truncate max-w-[170px] sm:max-w-xs">{activeProject.name}</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_drop_down</span>
            </button>

            {projectDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProjectDropdownOpen(false)} 
                />
                <div className="absolute left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-outline-variant/30 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                    Projetos Disponíveis
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {projects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          onSelectProject(proj);
                          setProjectDropdownOpen(false);
                          if (currentScreen === 'home') {
                            onNavigate('visao-geral');
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          proj.id === activeProject.id
                            ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                            : 'hover:bg-surface-container-low text-on-surface'
                        }`}
                      >
                        <span className="truncate">{proj.name}</span>
                        {proj.id === activeProject.id && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-outline-variant/20 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setProjectDropdownOpen(false);
                        onNavigate('home');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-primary hover:bg-primary-fixed/30 font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Gerenciar todos os projetos
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Profile & Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-container transition-all cursor-pointer border border-transparent hover:border-outline-variant/30"
                title={`Perfil de ${currentUser.name}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-on-surface leading-tight max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-none max-w-[120px] truncate">
                    {currentUser.role.split('&')[0]}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline hidden sm:inline">
                  expand_more
                </span>
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-outline-variant/30 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1">
                    <div className="p-3 bg-surface rounded-xl border border-outline-variant/20 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {currentUser.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-on-surface truncate">
                          {currentUser.name}
                        </span>
                        <span className="text-[11px] text-on-surface-variant truncate">
                          {currentUser.email}
                        </span>
                        <span className="text-[10px] text-primary font-semibold truncate mt-0.5">
                          {currentUser.role}
                        </span>
                      </div>
                    </div>

                    <div className="py-1 flex flex-col gap-0.5">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onNavigate('auth');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          switch_account
                        </span>
                        <span>Trocar de Conta</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-error hover:bg-error/10 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          logout
                        </span>
                        <span>Sair da Conta</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Entrar / Cadastrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
