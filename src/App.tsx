import React, { useState } from 'react';
import { ScreenType, Project, UserStory, FollowUpQuestion, StagedFile, AudioSource, UserProfile } from './types.ts';
import {
  INITIAL_PROJECTS,
  INITIAL_STORIES,
  INITIAL_FOLLOW_UP_QUESTIONS,
  INITIAL_AUDIO_SOURCES,
  INITIAL_DOCUMENT_SOURCES,
  INITIAL_STAGED_FILES,
} from './data/mockData.ts';
import { Header } from './components/Header.tsx';
import { ProjectHeader } from './components/ProjectHeader.tsx';
import { ProjectNav } from './components/ProjectNav.tsx';
import { Toast } from './components/Toast.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { VisaoGeralScreen } from './screens/VisaoGeralScreen.tsx';
import { FollowUpScreen } from './screens/FollowUpScreen.tsx';
import { AvaliacaoQualidadeScreen } from './screens/AvaliacaoQualidadeScreen.tsx';
import { ProjetoScreen } from './screens/ProjetoScreen.tsx';
import { AuthScreen } from './screens/AuthScreen.tsx';

export default function App() {
  // Navigation State - Initial Screen: 1. Home - Meus Projetos
  const [requestedScreen, setCurrentScreen] = useState<ScreenType>('home');

  // Authenticated User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>({
    id: 'user-01',
    name: 'Graziela Félix',
    email: 'grazielafelix.manager@gmail.com',
    role: 'Product Manager & Requirements Lead',
    company: 'Banco Digital Corp',
  });

  // Active Project & List
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState<Project | null>(INITIAL_PROJECTS[0]);

  // Telas de projeto exigem um projeto ativo; sem ele, a Home é exibida.
  const currentScreen: ScreenType =
    activeProject || requestedScreen === 'home' || requestedScreen === 'auth' ? requestedScreen : 'home';

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

  // Project Creation Handler
  const handleCreateProject = (name: string, description: string) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description: description || 'Novo projeto de requisitos e user stories.',
      audiosCount: 0,
      docsCount: 0,
      filesSummary: '0 áudios • 0 documentos',
      status: 'andamento',
      isFavorite: false,
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProject(newProj);
  };

  // Delete project handler
  const handleDeleteProject = (projectId: string) => {
    const projectToDelete = projects.find((p) => p.id === projectId);
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    setProjects(updatedProjects);
    if (activeProject?.id === projectId) {
      setActiveProject(updatedProjects[0] ?? null);
    }
    triggerToast(`Projeto "${projectToDelete?.name || ''}" excluído com sucesso.`, 'delete');
  };

  // Update project handler
  const handleUpdateProject = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
    if (activeProject?.id === updatedProject.id) {
      setActiveProject(updatedProject);
    }
    triggerToast(`Projeto "${updatedProject.name}" atualizado com sucesso!`, 'check_circle');
  };

  // Open existing project from Home
  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
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

  // Auth Handlers
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('auth');
    triggerToast('Você saiu da sua conta.');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* 1. Global Header with Prototype Screen Switcher */}
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        activeProject={activeProject}
        projects={projects}
        onSelectProject={setActiveProject}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Screen Viewport */}
      <main className="w-full flex-1 pt-16 flex flex-col">
        {/* Menu de Navegação do Projeto + Informações do Projeto (Título e Descrição) logo abaixo do menu */}
        {currentScreen !== 'home' && currentScreen !== 'auth' && activeProject && (
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
        {/* Screen Auth: Login & Cadastro */}
        {currentScreen === 'auth' && (
          <AuthScreen
            onLogin={handleLogin}
            onNavigate={setCurrentScreen}
            showToast={triggerToast}
          />
        )}

        {/* Screen 1: Home - Meus Projetos (Enxuta) — Initial Screen */}
        {currentScreen === 'home' && (
          <HomeScreen
            projects={projects}
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
            stories={stories}
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
            questions={questions}
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
            audioSources={audioSources}
            documentSources={INITIAL_DOCUMENT_SOURCES}
            onRemoveStagedFile={handleRemoveStagedFile}
            onClearStagedFiles={handleClearStagedFiles}
            onAddStagedFile={handleAddStagedFile}
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
              onClick={() => setCurrentScreen('auth')}
              className="hover:text-primary transition-colors cursor-pointer font-semibold text-primary"
            >
              {currentUser ? 'Minha Conta' : 'Entrar / Cadastro'}
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
