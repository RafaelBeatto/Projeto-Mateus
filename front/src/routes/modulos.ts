import { lazy } from 'react';
import {
  IconArchive,
  IconBriefcase,
  IconBuildingBank,
  IconHistory,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconSearch,
  IconSettings,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { PERMISSOES, CodigoPermissao } from 'src/constantes/permissoes';

/**
 * Fonte única dos módulos: o menu lateral e as rotas são gerados daqui.
 * Títulos e subtítulos são os mesmos do sistema antigo.
 * Módulo sem "tela" ainda é das próximas fases (abre a página "Em construção").
 */
export interface Modulo {
  caminho: string;
  titulo: string;
  subtitulo: string;
  icone: typeof IconLayoutDashboard;
  grupo: 'Controle' | 'Consultar' | 'Administração';
  permissao?: CodigoPermissao;
  tela?: ReturnType<typeof lazy>;
  /** Tem rota, mas não aparece no menu (ex.: Pesquisa, aberta pela busca do cabeçalho). */
  oculto?: boolean;
}

export const MODULOS: Modulo[] = [
  {
    caminho: '/gestao-projetos',
    titulo: 'Gestão de Projetos',
    subtitulo: 'Projetos e convênios no Kanban, da espera à análise',
    icone: IconBriefcase,
    grupo: 'Controle',
    permissao: PERMISSOES.GESTAO_PROJETO_LER,
    tela: lazy(() => import('src/views/gestaoProjetos/GestaoProjetos')),
  },
  {
    caminho: '/kanban',
    titulo: 'Kanban',
    subtitulo: 'Todos os projetos, etapas e tarefas num quadro só',
    icone: IconLayoutKanban,
    grupo: 'Controle',
    permissao: PERMISSOES.GESTAO_PROJETO_LER,
    tela: lazy(() => import('src/views/kanbanGeral/KanbanGeral')),
  },
  {
    caminho: '/arquivados',
    titulo: 'Arquivados',
    subtitulo: 'Projetos arquivados da Gestão de Projetos, para consulta',
    icone: IconArchive,
    grupo: 'Consultar',
    permissao: PERMISSOES.GESTAO_PROJETO_LER,
    tela: lazy(() => import('src/views/arquivados/Arquivados')),
  },
  {
    caminho: '/lixeira',
    titulo: 'Lixeira',
    subtitulo: 'Projetos excluídos da Gestão de Projetos: restaure ou exclua de vez',
    icone: IconTrash,
    grupo: 'Consultar',
    permissao: PERMISSOES.GESTAO_PROJETO_LER,
    tela: lazy(() => import('src/views/lixeira/Lixeira')),
  },
  {
    caminho: '/empresas',
    titulo: 'Contratantes',
    subtitulo: 'Órgãos e instituições que contratam os projetos',
    icone: IconBuildingBank,
    grupo: 'Consultar',
    permissao: PERMISSOES.EMPRESA_LER,
    tela: lazy(() => import('src/views/empresas/Empresas')),
  },
  {
    caminho: '/historico',
    titulo: 'Histórico',
    subtitulo: 'Tudo o que foi feito no sistema, dia a dia',
    icone: IconHistory,
    grupo: 'Consultar',
    permissao: PERMISSOES.HISTORICO_LER,
    tela: lazy(() => import('src/views/historico/Historico')),
  },
  {
    caminho: '/pesquisa',
    titulo: 'Pesquisa',
    subtitulo: 'Resultados da busca em todo o sistema',
    icone: IconSearch,
    grupo: 'Consultar',
    oculto: true,
    tela: lazy(() => import('src/views/pesquisa/Pesquisa')),
  },
  {
    caminho: '/administracao/usuarios',
    titulo: 'Usuários',
    subtitulo: 'Quem acessa o sistema, com qual cargo e em qual unidade',
    icone: IconUsers,
    grupo: 'Administração',
    permissao: PERMISSOES.USUARIO_LER,
    tela: lazy(() => import('src/views/administracao/usuarios/Usuarios')),
  },
  {
    caminho: '/configuracoes',
    titulo: 'Configurações',
    subtitulo: 'Modo de cor deste navegador e permissões de cada cargo',
    icone: IconSettings,
    grupo: 'Administração',
    tela: lazy(() => import('src/views/configuracoes/Configuracoes')),
  },
];

export const moduloPorCaminho = (caminho: string) => MODULOS.find((m) => caminho.startsWith(m.caminho));

/** Há tela para esse caminho? Links para módulos que saíram do sistema não aparecem. */
export const existeTela = (caminho: string) => !!moduloPorCaminho(caminho.split('?')[0]);
