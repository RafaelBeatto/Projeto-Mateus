/** Gestão de Projetos (back: gestaoprojetos/*), independente do módulo Projetos. */
import type { Prioridade } from './comum';

/** Colunas do Kanban, na ordem do quadro. Todo projeto nasce Em espera. */
export type StatusGestaoProjeto = 'EM_ESPERA' | 'EM_PAUSA' | 'EM_ANDAMENTO' | 'EM_ANALISE';

export const ROTULO_STATUS_GESTAO_PROJETO: Record<StatusGestaoProjeto, string> = {
  EM_ESPERA: 'Em espera',
  EM_PAUSA: 'Em pausa',
  EM_ANDAMENTO: 'Em andamento',
  EM_ANALISE: 'Em análise',
};

export interface Coordenador {
  id: number;
  nomeCompleto: string;
  cargoNome: string;
}

export interface GestaoProjeto {
  id: number;
  nome: string;
  processo: string | null;
  contratante: string | null;
  /** Obrigatória quando há contratante. */
  contratanteCidade: string | null;
  status: StatusGestaoProjeto;
  /** null = "Nada". */
  prioridade: Prioridade | null;
  dataInicio: string;
  dataFim: string | null;
  coordenadores: Coordenador[];
  convenioOrigem: string | null;
  convenioNumero: string | null;
  valorConvenio: number | null;
  contrapartida: number | null;
  origemRecurso: string | null;
  /** Progresso: etapas concluídas de quantas existem. */
  etapasTotal: number;
  etapasConcluidas: number;
  /** null = ativo (no Kanban); preenchido = arquivado (só em "Arquivados"). */
  arquivadoEm: string | null;
  /** Preenchido = na lixeira (restaurável até ser excluído de vez). */
  excluidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/** Formulário: '' = vazio (prioridade '' = "Nada"; data de início vazia = hoje, no back). */
export interface RequisicaoGestaoProjeto {
  nome: string;
  processo: string;
  /** Razão social de um contratante cadastrado (a cidade vem do cadastro dele). */
  contratante: string;
  prioridade: Prioridade | '';
  dataInicio: string;
  dataFim: string;
  coordenadores: number[];
  convenioOrigem: string;
  convenioNumero: string;
  valorConvenio: number | '';
  contrapartida: number | '';
  origemRecurso: string;
}

/** Colunas do Kanban de etapas de um projeto. Toda etapa nasce Em espera. */
export type StatusEtapa = 'EM_ESPERA' | 'EM_PAUSA' | 'EM_ANDAMENTO' | 'CONCLUIDO';

export const ROTULO_STATUS_ETAPA: Record<StatusEtapa, string> = {
  EM_ESPERA: 'Em espera',
  EM_PAUSA: 'Em pausa',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
};

/** Status da tarefa da etapa. Concluída = marcada como feita no checklist (o back mantém os dois juntos). */
export type StatusTarefaEtapa = 'EM_ESPERA' | 'EM_PAUSA' | 'EM_ANDAMENTO' | 'CONCLUIDA';

export const ROTULO_STATUS_TAREFA_ETAPA: Record<StatusTarefaEtapa, string> = {
  EM_ESPERA: 'Em espera',
  EM_PAUSA: 'Em pausa',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

export interface Etapa {
  id: number;
  projetoId: number;
  /** Ramificação: a etapa de onde esta sai no mapa (null = direto do projeto). */
  etapaPaiId: number | null;
  titulo: string;
  descricao: string | null;
  status: StatusEtapa;
  responsavel: Coordenador | null;
  prazo: string | null;
  /** Lista de tarefas (checklist) da etapa, em ordem. */
  tarefas: TarefaEtapa[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface TarefaEtapa {
  id: number;
  texto: string;
  feita: boolean;
  status: StatusTarefaEtapa;
  prazo: string | null;
  responsavel: Coordenador | null;
  /** Ids das tarefas (de qualquer etapa do projeto) que precisam estar feitas antes desta. */
  dependencias: number[];
  /** Ids das etapas do projeto que precisam estar concluídas antes desta. */
  dependenciasEtapas: number[];
}

/** Mensagem do chat do projeto (conversa em grupo, uma por projeto). */
export interface MensagemProjeto {
  id: number;
  projetoId: number;
  /** null se o usuário que enviou não existe mais. */
  remetente: Coordenador | null;
  texto: string;
  enviadaEm: string;
}

/** Formulário da etapa: '' = vazio. */
export interface RequisicaoEtapa {
  titulo: string;
  descricao: string;
  responsavelId: number | '';
  prazo: string;
  status?: StatusEtapa;
  /** '' = sai direto do projeto. */
  etapaPaiId: number | '';
}

/** Modal da tarefa da etapa: '' = vazio. */
export interface RequisicaoTarefaEtapa {
  texto: string;
  status: StatusTarefaEtapa;
  prazo: string;
  responsavelId: number | '';
  /** Ids de outras tarefas do projeto. */
  dependencias: number[];
  /** Ids de etapas do projeto (não a própria). */
  dependenciasEtapas: number[];
}
