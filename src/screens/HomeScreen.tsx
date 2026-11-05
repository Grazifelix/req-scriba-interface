import React, { useState } from 'react';
import { Project, ScreenType } from '../types.ts';

interface HomeScreenProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onCreateProject: (name: string, description: string) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onNavigate,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Edit Project Modal state
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  const filteredProjects = projects.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    onCreateProject(newProjectName.trim(), newProjectDesc.trim());
    setModalOpen(false);
    setNewProjectName('');
    setNewProjectDesc('');
    showToast(`Projeto "${newProjectName}" criado com sucesso!`);
    // Navigate immediately to Ingestão de dados screen (Screen 5)
    onNavigate('projeto-ingestao');
  };

  const handleOpenEdit = (proj: Project) => {
    setProjectToEdit(proj);
    setEditProjectName(proj.name);
    setEditProjectDesc(proj.description);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit || !editProjectName.trim()) return;

    onUpdateProject({
      ...projectToEdit,
      name: editProjectName.trim(),
      description: editProjectDesc.trim(),
    });
    setProjectToEdit(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      {/* Page Header: Meus Projetos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">folder_copy</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Meus Projetos</h1>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Selecione um projeto para gerenciar tarefas, auditar User Stories e verificar conformidade com ISO/IEC/IEEE 29148:2018.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-outline-variant/30 flex items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar projeto por nome ou assunto..."
            className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 transition-all"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Create Card - Primeiro elemento da grade */}
        <div
          onClick={() => setModalOpen(true)}
          className="bg-white rounded-xl p-6 shadow-xs hover:shadow-md border-2 border-dashed border-outline-variant/50 hover:border-primary transition-all flex flex-col items-center justify-center text-center cursor-pointer group min-h-[220px]"
          id="quick-create-card"
        >
          <div className="w-14 h-14 rounded-full bg-surface-container group-hover:bg-primary flex items-center justify-center text-primary group-hover:text-on-primary transition-all duration-300 shadow-xs mb-3">
            <span className="material-symbols-outlined text-[24px]">add</span>
          </div>
          <h3 className="text-base font-bold text-on-surface mb-1">Criar Novo Projeto</h3>
          <p className="text-xs text-on-surface-variant max-w-xs mb-4">
            Adicione novos requisitos a partir de áudios ou documentos.
          </p>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold shadow-xs group-hover:bg-primary-container transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Criar Projeto</span>
          </button>
        </div>

        {/* Existing Projects */}
        {filteredProjects.map((proj) => (
          <div
            key={proj.id}
            className="project-card bg-white rounded-xl p-5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between group"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                {proj.name}
              </h3>
              <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                {proj.description}
              </p>

              <div className="flex items-center gap-1.5 text-on-surface-variant text-xs pt-2">
                <span className="material-symbols-outlined text-[16px] text-secondary">description</span>
                <span className="font-medium">{proj.filesSummary}</span>
              </div>
            </div>

            <div className="pt-5 mt-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenProject(proj)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  <span>Abrir Projeto</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(proj);
                  }}
                  title="Editar Projeto"
                  className="inline-flex items-center justify-center p-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all border border-outline-variant/30 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(proj);
                  }}
                  title="Excluir Projeto"
                  className="inline-flex items-center justify-center p-2 rounded-lg bg-surface hover:bg-error/10 text-on-surface-variant hover:text-error transition-all border border-outline-variant/30 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Interativo de Criação Rápida de Projeto */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">create_new_folder</span>
                <h2 className="text-lg font-bold text-on-surface">Criar Novo Projeto</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Preencha as informações básicas para começar. Você poderá anexar áudios e documentos logo em seguida.
            </p>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="input-nome-projeto">
                  Nome do Projeto
                </label>
                <input
                  id="input-nome-projeto"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: Painel do Cliente, Novo Checkout, Conta Digital..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-surface rounded-lg text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="input-desc-projeto">
                  O que esse projeto vai resolver?
                </label>
                <textarea
                  id="input-desc-projeto"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Conte brevemente o objetivo das tarefas..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-surface rounded-lg text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 shadow-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-xs"
                >
                  Continuar para Anexar Arquivos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Projeto */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface">Excluir Projeto</h2>
                <p className="text-xs text-on-surface-variant">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-on-surface leading-relaxed">
              Tem certeza de que deseja excluir o projeto{' '}
              <strong className="font-semibold text-on-surface">"{projectToDelete.name}"</strong>? Todas as histórias e dados associados serão removidos.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 rounded-lg bg-error hover:bg-error/90 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Projeto */}
      {projectToEdit && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">edit_note</span>
                <h2 className="text-lg font-bold text-on-surface">Editar Projeto</h2>
              </div>
              <button
                type="button"
                onClick={() => setProjectToEdit(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Atualize o título e a descrição do projeto. As alterações serão salvas imediatamente.
            </p>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="input-edit-nome-projeto">
                  Título do Projeto
                </label>
                <input
                  id="input-edit-nome-projeto"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="Nome do projeto..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-surface rounded-lg text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="input-edit-desc-projeto">
                  Descrição do Projeto
                </label>
                <textarea
                  id="input-edit-desc-projeto"
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  placeholder="Descreva o objetivo do projeto..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-surface rounded-lg text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 shadow-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setProjectToEdit(null)}
                  className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
