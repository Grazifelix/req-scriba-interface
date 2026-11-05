import React, { useState } from 'react';
import { Project } from '../types.ts';

interface ProjectHeaderProps {
  project: Project;
  onUpdateProject?: (project: Project) => void;
  onNavigateHome?: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onUpdateProject,
  onNavigateHome,
}) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);

  // Synchronize when project changes
  React.useEffect(() => {
    setName(project.name);
    setDescription(project.description);
  }, [project]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        name: name.trim(),
        description: description.trim(),
      });
    }
    setEditModalOpen(false);
  };

  return (
    <section className="w-full bg-white border-b border-outline-variant/25 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Project Icon, Title and Description */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs border border-primary/20 mt-0.5">
              <span className="material-symbols-outlined text-[26px]">folder_open</span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                {onNavigateHome && (
                  <button
                    onClick={onNavigateHome}
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer"
                    title="Voltar para Meus Projetos"
                  >
                    <span>Meus Projetos</span>
                    <span className="text-outline-variant">/</span>
                  </button>
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight truncate">
                  {project.name}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                  {project.status === 'andamento' ? 'Em andamento' : 'Concluído'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mt-1 line-clamp-2 max-w-4xl">
                {project.description}
              </p>

              <div className="flex items-center gap-3 text-xs text-on-surface-variant pt-2 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[15px] text-secondary">description</span>
                  {project.filesSummary}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-outline">
                  ID: {project.id}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Edit Button */}
          {onUpdateProject && (
            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <button
                type="button"
                onClick={() => {
                  setName(project.name);
                  setDescription(project.description);
                  setEditModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface hover:bg-surface-container border border-outline-variant/30 text-on-surface text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title="Editar título e descrição do projeto"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">edit</span>
                <span>Editar Projeto</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição de Título e Descrição */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">edit_note</span>
                <h2 className="text-lg font-bold text-on-surface">Editar Projeto</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Atualize o título e a descrição do projeto. As alterações serão salvas imediatamente em todo o sistema.
            </p>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="input-header-edit-nome">
                  Título do Projeto
                </label>
                <input
                  id="input-header-edit-nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do projeto..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-surface rounded-lg text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface" htmlFor="input-header-edit-desc">
                  Descrição do Projeto
                </label>
                <textarea
                  id="input-header-edit-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo do projeto..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-surface rounded-lg text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 shadow-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
    </section>
  );
};
