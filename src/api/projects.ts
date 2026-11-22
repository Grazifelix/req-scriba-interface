import { Project } from '../types.ts';
import { apiRequest } from './client.ts';
import type { components } from './schema';

type ProjectOut = components['schemas']['ProjectOut'];
type ProjectList = components['schemas']['ProjectList'];

export const PROJECTS_QUERY_KEY = ['projetos'];

export const formatFilesSummary = (audios: number, docs: number): string =>
  `${audios} ${audios === 1 ? 'áudio' : 'áudios'} • ${docs} ${docs === 1 ? 'documento' : 'documentos'}`;

const toProject = (p: ProjectOut): Project => ({
  id: String(p.id),
  name: p.titulo,
  description: p.descricao ?? '',
  systemDescription: p.descricao_sistema ?? '',
  audiosCount: p.total_audios,
  docsCount: p.total_documentos,
  filesSummary: formatFilesSummary(p.total_audios, p.total_documentos),
  qualityScore: p.qualidade_geral.porcentagem ?? null,
  qualityLabel: p.qualidade_geral.status,
});

export const listProjects = async (): Promise<Project[]> => {
  const { itens } = await apiRequest<ProjectList>('/projetos');
  return itens.map(toProject);
};

export const createProject = async (name: string, description: string): Promise<Project> =>
  toProject(
    await apiRequest<ProjectOut>('/projetos', {
      method: 'POST',
      body: { titulo: name, descricao: description || null },
    })
  );

export const updateProject = async (id: string, name: string, description: string): Promise<Project> =>
  toProject(
    await apiRequest<ProjectOut>(`/projetos/${id}`, {
      method: 'PATCH',
      body: { titulo: name, descricao: description },
    })
  );

export const deleteProject = (id: string): Promise<void> =>
  apiRequest<void>(`/projetos/${id}`, { method: 'DELETE' });
