import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenType, Project, StagedFile } from './types.ts';
import { errorMessage } from './api/client.ts';
import { getUserName, saveUserName } from './api/identity.ts';
import {
  PROJECTS_QUERY_KEY,
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from './api/projects.ts';
import { ApiStatusBanner } from './components/ApiStatusBanner.tsx';
import { Header } from './components/Header.tsx';
import { JobStatusBanner } from './components/JobStatusBanner.tsx';
import { ProjectHeader } from './components/ProjectHeader.tsx';
import { ProjectNav } from './components/ProjectNav.tsx';
import { Toast } from './components/Toast.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { VisaoGeralScreen } from './screens/VisaoGeralScreen.tsx';
import { FollowUpScreen } from './screens/FollowUpScreen.tsx';
import { AvaliacaoQualidadeScreen } from './screens/AvaliacaoQualidadeScreen.tsx';
import { NovoRequisitoScreen } from './screens/NovoRequisitoScreen.tsx';
import { ProjetoScreen } from './screens/ProjetoScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';

export default function App() {
  const [requestedScreen, setCurrentScreen] = useState<ScreenType>('home');

  // Nome registrado como responsável pelas alterações (X-Usuario)
  const [userName, setUserName] = useState<string | null>(getUserName);

  // Projects (API)
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: PROJECTS_QUERY_KEY, queryFn: listProjects });
  const projects = projectsQuery.data ?? [];

  // Active Project: o escolhido ou, se não houver, o primeiro da lista
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;

  // Telas de projeto exigem um projeto ativo; sem ele, a Home é exibida.
  const currentScreen: ScreenType =
    activeProject || requestedScreen === 'home' || requestedScreen === 'perfil' ? requestedScreen : 'home';

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);

  // Fila de arquivos do projeto ativo: arquivos escolhidos em um projeto não vão para outro.
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const activeProjectKey = activeProject?.id;
  useEffect(() => setStagedFiles([]), [activeProjectKey]);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIcon, setToastIcon] = useState<string>('check_circle');

  const triggerToast = (msg: string, icon = 'check_circle') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Runs a project change and refreshes the list. Returns false after showing the API error.
  const runProjectChange = async (change: () => Promise<void>): Promise<boolean> => {
    try {
      await change();
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      return true;
    } catch (error) {
      triggerToast(errorMessage(error), 'error');
      return false;
    }
  };

  const handleCreateProject = (name: string, description: string) =>
    runProjectChange(async () => {
      const created = await createProject(name, description);
      setActiveProjectId(created.id);
    });

  const handleDeleteProject = (projectId: string) =>
    runProjectChange(async () => {
      const projectToDelete = projects.find((p) => p.id === projectId);
      await deleteProject(projectId);
      triggerToast(`Projeto "${projectToDelete?.name || ''}" excluído com sucesso.`, 'delete');
    });

  const handleUpdateProject = (updatedProject: Project) =>
    runProjectChange(async () => {
      await updateProject(updatedProject.id, updatedProject.name, updatedProject.description);
      triggerToast(`Projeto "${updatedProject.name}" atualizado com sucesso!`, 'check_circle');
    });

  const handleOpenProject = (project: Project) => {
    setActiveProjectId(project.id);
    setCurrentScreen('visao-geral');
    triggerToast(`Projeto "${project.name}" aberto com sucesso!`);
  };

  // Footer shortcuts to project screens
  const handleOpenProjectScreen = (screen: ScreenType) => {
    if (!activeProject) {
      triggerToast('Crie um projeto para acessar esta tela.', 'warning');
      return;
    }
    setCurrentScreen(screen);
  };

  const handleOpenStory = (storyId: string) => {
    setSelectedStoryId(storyId);
    setCurrentScreen('avaliacao-qualidade');
  };

  const handleOpenRequirement = (suggestionId: string) => {
    setSelectedRequirementId(suggestionId);
    setCurrentScreen('novo-requisito');
  };

  const handleSaveUserName = (name: string | null) => {
    saveUserName(name);
    setUserName(name);
    setCurrentScreen('home');
    triggerToast(name ? `Alterações serão registradas como ${name}.` : 'Nome removido do registro de alterações.');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        activeProject={activeProject}
        projects={projects}
        onSelectProject={(project) => setActiveProjectId(project.id)}
        userName={userName}
      />

      <main className="w-full flex-1 pt-16 flex flex-col">
        <ApiStatusBanner />

        {currentScreen !== 'home' && currentScreen !== 'perfil' && activeProject && (
          <div className="w-full">
            <ProjectNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
            <ProjectHeader
              project={activeProject}
              onNavigate={setCurrentScreen}
              onNavigateHome={() => setCurrentScreen('home')}
            />
            <JobStatusBanner key={activeProject.id} projectId={activeProject.id} onNavigate={setCurrentScreen} />
          </div>
        )}

        {currentScreen === 'perfil' && (
          <ProfileScreen userName={userName} onSave={handleSaveUserName} onCancel={() => setCurrentScreen('home')} />
        )}

        {currentScreen === 'home' && (
          <HomeScreen
            projects={projects}
            isLoading={projectsQuery.isPending}
            loadError={projectsQuery.isError && !projectsQuery.data ? errorMessage(projectsQuery.error) : null}
            onRetry={() => projectsQuery.refetch()}
            onOpenProject={handleOpenProject}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}

        {activeProject && currentScreen === 'visao-geral' && (
          <VisaoGeralScreen
            project={activeProject}
            onSelectStory={handleOpenStory}
            onOpenRequirement={handleOpenRequirement}
            onNavigate={setCurrentScreen}
          />
        )}

        {activeProject && currentScreen === 'follow-up' && (
          <FollowUpScreen
            project={activeProject}
            onOpenStory={handleOpenStory}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}

        {activeProject && currentScreen === 'avaliacao-qualidade' && selectedStoryId && (
          <AvaliacaoQualidadeScreen
            key={selectedStoryId}
            project={activeProject}
            storyId={selectedStoryId}
            onSelectStory={setSelectedStoryId}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}

        {activeProject && currentScreen === 'novo-requisito' && selectedRequirementId && (
          <NovoRequisitoScreen
            key={selectedRequirementId}
            project={activeProject}
            suggestionId={selectedRequirementId}
            onOpenStory={handleOpenStory}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}

        {activeProject && (currentScreen === 'projeto-ingestao' || currentScreen === 'projeto-fontes') && (
          <ProjetoScreen
            key={activeProject.id}
            project={activeProject}
            initialSubTab={currentScreen === 'projeto-fontes' ? 'fontes' : 'ingestao'}
            stagedFiles={stagedFiles}
            onStagedFilesChange={setStagedFiles}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}
      </main>

      <footer className="w-full bg-surface-container-low py-4 border-t border-outline-variant/20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-on-surface-variant font-medium">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-primary">ReqScriba</span>
            <span>•</span>
            <span>Criação e Análise de User Stories</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentScreen('home')} className="hover:text-primary transition-colors cursor-pointer">
              Meus Projetos
            </button>
            <span>•</span>
            <button onClick={() => handleOpenProjectScreen('visao-geral')} className="hover:text-primary transition-colors cursor-pointer">
              Visão Geral
            </button>
            <span>•</span>
            <button onClick={() => setCurrentScreen('perfil')} className="hover:text-primary transition-colors cursor-pointer font-semibold text-primary">
              Seu nome
            </button>
          </div>
        </div>
      </footer>

      <Toast message={toastMessage} icon={toastIcon} onClose={() => setToastMessage(null)} />
    </div>
  );
}
