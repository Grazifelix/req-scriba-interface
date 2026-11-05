import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenType, Project, UserStory, FollowUpQuestion, StagedFile, AudioSource } from './types.ts';
import { errorMessage } from './api/client.ts';
import { getUserName, saveUserName } from './api/identity.ts';
import {
  PROJECTS_QUERY_KEY,
  createProject,
  deleteProject,
  formatFilesSummary,
  listProjects,
  updateProject,
} from './api/projects.ts';
import {
  INITIAL_STORIES,
  INITIAL_FOLLOW_UP_QUESTIONS,
  INITIAL_AUDIO_SOURCES,
  INITIAL_DOCUMENT_SOURCES,
  INITIAL_STAGED_FILES,
} from './data/mockData.ts';
import { ApiStatusBanner } from './components/ApiStatusBanner.tsx';
import { Header } from './components/Header.tsx';
import { ProjectHeader } from './components/ProjectHeader.tsx';
import { ProjectNav } from './components/ProjectNav.tsx';
import { Toast } from './components/Toast.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { VisaoGeralScreen } from './screens/VisaoGeralScreen.tsx';
import { FollowUpScreen } from './screens/FollowUpScreen.tsx';
import { AvaliacaoQualidadeScreen } from './screens/AvaliacaoQualidadeScreen.tsx';
import { ProjetoScreen } from './screens/ProjetoScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';

interface SimulatedSources {
  audios: number;
  docs: number;
}

// Temporário: a ingestão ainda é simulada e não chega à API; sai quando o upload real for ligado.
const withSimulatedSources = (project: Project, sources?: SimulatedSources): Project => {
  if (!sources) return project;
  const audiosCount = project.audiosCount + sources.audios;
  const docsCount = project.docsCount + sources.docs;
  return { ...project, audiosCount, docsCount, filesSummary: formatFilesSummary(audiosCount, docsCount) };
};

export default function App() {
  // Navigation State - Initial Screen: 1. Home - Meus Projetos
  const [requestedScreen, setCurrentScreen] = useState<ScreenType>('home');

  // Nome registrado como responsável pelas alterações (X-Usuario)
  const [userName, setUserName] = useState<string | null>(getUserName);

  // Projects (API)
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: PROJECTS_QUERY_KEY, queryFn: listProjects });
  const [simulatedSources, setSimulatedSources] = useState<Record<string, SimulatedSources>>({});
  const projects = (projectsQuery.data ?? []).map((p) => withSimulatedSources(p, simulatedSources[p.id]));

  // Active Project: o escolhido ou, se não houver, o primeiro da lista
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;

  // Telas de projeto exigem um projeto ativo; sem ele, a Home é exibida.
  const currentScreen: ScreenType =
    activeProject || requestedScreen === 'home' || requestedScreen === 'perfil' ? requestedScreen : 'home';

  // Projeto sem áudios ou documentos não tem backlog, fontes nem perguntas.
  const projectHasSources = !!activeProject && activeProject.audiosCount + activeProject.docsCount > 0;

  // User Stories Backlog
  const [stories, setStories] = useState<UserStory[]>(INITIAL_STORIES);
  const [selectedStory, setSelectedStory] = useState<UserStory>(INITIAL_STORIES[0]);

  // Follow-up Questions
  const [questions, setQuestions] = useState<FollowUpQuestion[]>(INITIAL_FOLLOW_UP_QUESTIONS);

  // Audio Sources
  const [audioSources, setAudioSources] = useState<AudioSource[]>(INITIAL_AUDIO_SOURCES);

  // Staged Files in Project
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>(INITIAL_STAGED_FILES);

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

  // Project Creation Handler
  const handleCreateProject = (name: string, description: string) =>
    runProjectChange(async () => {
      const created = await createProject(name, description);
      setActiveProjectId(created.id);
      setStagedFiles([]);
    });

  // Files read in the ingestion screen become sources of the active project
  const handleFilesProcessed = (files: StagedFile[]) => {
    if (!activeProject) return;
    const audios = files.filter((f) => f.type === 'audio').length;
    const docs = files.length - audios;
    setSimulatedSources((prev) => {
      const current = prev[activeProject.id] ?? { audios: 0, docs: 0 };
      return { ...prev, [activeProject.id]: { audios: current.audios + audios, docs: current.docs + docs } };
    });
    setStagedFiles([]);
  };

  // Delete project handler
  const handleDeleteProject = (projectId: string) =>
    runProjectChange(async () => {
      const projectToDelete = projects.find((p) => p.id === projectId);
      await deleteProject(projectId);
      triggerToast(`Projeto "${projectToDelete?.name || ''}" excluído com sucesso.`, 'delete');
    });

  // Update project handler
  const handleUpdateProject = (updatedProject: Project) =>
    runProjectChange(async () => {
      await updateProject(updatedProject.id, updatedProject.name, updatedProject.description);
      triggerToast(`Projeto "${updatedProject.name}" atualizado com sucesso!`, 'check_circle');
    });

  // Open existing project from Home
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

  // Open a story from its id (ex.: a partir de uma pergunta de follow-up)
  const handleOpenStory = (storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (!story) {
      triggerToast(`Tarefa ${storyId} não encontrada no backlog.`, 'warning');
      return;
    }
    setSelectedStory(story);
    setCurrentScreen('avaliacao-qualidade');
  };

  // Update a single story
  const handleUpdateStory = (updatedStory: UserStory) => {
    setStories((prev) =>
      prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
    );
    setSelectedStory(updatedStory);
  };

  // Question handlers
  const handleUpdateQuestion = (updatedQuestion: FollowUpQuestion) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleAddQuestion = (newQ: Omit<FollowUpQuestion, 'id'>) => {
    const created: FollowUpQuestion = {
      ...newQ,
      id: `fq-${Date.now()}`,
    };
    setQuestions((prev) => [created, ...prev]);
  };

  // Staged files handlers
  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    triggerToast('Arquivo removido da fila.');
  };

  const handleClearStagedFiles = () => {
    setStagedFiles([]);
    triggerToast('Fila de arquivos limpa.');
  };

  const handleAddStagedFile = (file: StagedFile) => {
    setStagedFiles((prev) => [...prev, file]);
  };

  // Audio source update handler (transcriptions)
  const handleUpdateAudioSource = (updatedAudio: AudioSource) => {
    setAudioSources((prev) =>
      prev.map((a) => (a.id === updatedAudio.id ? updatedAudio : a))
    );
  };

  const handleSaveUserName = (name: string | null) => {
    saveUserName(name);
    setUserName(name);
    setCurrentScreen('home');
    triggerToast(name ? `Alterações serão registradas como ${name}.` : 'Nome removido do registro de alterações.');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* 1. Global Header with Prototype Screen Switcher */}
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        activeProject={activeProject}
        projects={projects}
        onSelectProject={(project) => setActiveProjectId(project.id)}
        userName={userName}
      />

      {/* 2. Main Screen Viewport */}
      <main className="w-full flex-1 pt-16 flex flex-col">
        <ApiStatusBanner />
        {/* Menu de Navegação do Projeto + Informações do Projeto (Título e Descrição) logo abaixo do menu */}
        {currentScreen !== 'home' && currentScreen !== 'perfil' && activeProject && (
          <div className="w-full">
            <ProjectNav
              currentScreen={currentScreen}
              onNavigate={setCurrentScreen}
            />
            <ProjectHeader
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              onNavigateHome={() => setCurrentScreen('home')}
            />
          </div>
        )}
        {/* Nome registrado como responsável */}
        {currentScreen === 'perfil' && (
          <ProfileScreen
            userName={userName}
            onSave={handleSaveUserName}
            onCancel={() => setCurrentScreen('home')}
          />
        )}

        {/* Screen 1: Home - Meus Projetos (Enxuta) — Initial Screen */}
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

        {/* Screen 2: Visão Geral (Enxuta) */}
        {currentScreen === 'visao-geral' && (
          <VisaoGeralScreen
            stories={projectHasSources ? stories : []}
            onSelectStory={(story) => {
              setSelectedStory(story);
              setCurrentScreen('avaliacao-qualidade');
            }}
            onNavigate={setCurrentScreen}
          />
        )}

        {/* Screen 3: Perguntas de Follow-up (Enxuta) */}
        {currentScreen === 'follow-up' && (
          <FollowUpScreen
            questions={projectHasSources ? questions : []}
            hasSources={projectHasSources}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onAddQuestion={handleAddQuestion}
            onOpenStory={handleOpenStory}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}

        {/* Screen 4: Avaliação de Qualidade (Enxuta) */}
        {currentScreen === 'avaliacao-qualidade' && (
          <AvaliacaoQualidadeScreen
            story={selectedStory}
            allStories={stories}
            onSelectStory={setSelectedStory}
            onUpdateStory={handleUpdateStory}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}

        {/* Screen 5: 1. Projeto (Ingestão & Fontes de Dados) */}
        {(currentScreen === 'projeto-ingestao' || currentScreen === 'projeto-fontes') && (
          <ProjetoScreen
            initialSubTab={currentScreen === 'projeto-fontes' ? 'fontes' : 'ingestao'}
            stagedFiles={stagedFiles}
            audioSources={projectHasSources ? audioSources : []}
            documentSources={projectHasSources ? INITIAL_DOCUMENT_SOURCES : []}
            onRemoveStagedFile={handleRemoveStagedFile}
            onClearStagedFiles={handleClearStagedFiles}
            onAddStagedFile={handleAddStagedFile}
            onFilesProcessed={handleFilesProcessed}
            onUpdateAudioSource={handleUpdateAudioSource}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low py-4 border-t border-outline-variant/20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-on-surface-variant font-medium">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-primary">ReqScriba</span>
            <span>•</span>
            <span>Criação e Análise de User Stories (ISO/IEC/IEEE 29148:2018 &amp; QUS)</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentScreen('home')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Meus Projetos
            </button>
            <span>•</span>
            <button
              onClick={() => handleOpenProjectScreen('visao-geral')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Visão Geral
            </button>
            <span>•</span>
            <button
              onClick={() => handleOpenProjectScreen('follow-up')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Follow-up
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentScreen('perfil')}
              className="hover:text-primary transition-colors cursor-pointer font-semibold text-primary"
            >
              Seu nome
            </button>
          </div>
        </div>
      </footer>

      {/* Global Interactive Toast Notification */}
      <Toast
        message={toastMessage}
        icon={toastIcon}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
