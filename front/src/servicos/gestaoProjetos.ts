import api from 'src/utils/axios';
import type { HistoricoRegistro } from 'src/types/comum';
import type { Coordenador, Etapa, GestaoProjeto, MensagemProjeto, RequisicaoEtapa, RequisicaoGestaoProjeto, RequisicaoTarefaEtapa, StatusEtapa, StatusGestaoProjeto } from 'src/types/gestaoProjetos';

const u = (id: number, resto = '') => `/gestao-projetos/${id}${resto}`;
const et = (projetoId: number, resto = '') => u(projetoId, `/etapas${resto}`);
const dados = <T>(r: { data: T }) => r.data;
/** Campos vazios do formulário viram null. */
const semVazios = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v])) as T;

export const servicoGestaoProjetos = {
  /** Ativos (Kanban); com arquivados = true, só os arquivados. */
  listar: (arquivados = false) => api.get<GestaoProjeto[]>('/gestao-projetos', { params: { arquivados } }).then(dados),
  listarArquivados: () => servicoGestaoProjetos.listar(true),
  detalhe: (id: number) => api.get<GestaoProjeto>(u(id)).then(dados),
  historico: (id: number) => api.get<HistoricoRegistro[]>(u(id, '/historico')).then(dados),
  /** Ações de todos os projetos no período: [desde, ate) em instantes (meia-noite local de cada dia). */
  historicoGeral: (desde: Date, ate: Date) =>
    api
      .get<HistoricoRegistro[]>('/gestao-projetos/historico', { params: { desde: desde.toISOString(), ate: ate.toISOString() } })
      .then(dados),
  coordenadoresDisponiveis: () => api.get<Coordenador[]>('/gestao-projetos/coordenadores-disponiveis').then(dados),

  criar: (p: RequisicaoGestaoProjeto) => api.post<GestaoProjeto>('/gestao-projetos', semVazios(p)).then(dados),
  atualizar: (id: number, p: RequisicaoGestaoProjeto) => api.put<GestaoProjeto>(u(id), semVazios(p)).then(dados),
  alterarStatus: (id: number, status: StatusGestaoProjeto) => api.patch<GestaoProjeto>(u(id, '/status'), { status }).then(dados),
  arquivar: (id: number, arquivado: boolean) => api.patch<GestaoProjeto>(u(id, '/arquivado'), { arquivado }).then(dados),
  /** Manda para a lixeira (restaurável). */
  excluir: (id: number) => api.delete(u(id)),
  lixeira: () => api.get<GestaoProjeto[]>('/gestao-projetos/lixeira').then(dados),
  restaurar: (id: number) => api.patch<GestaoProjeto>(u(id, '/restaurar')).then(dados),
  /** Só para projeto na lixeira: sem volta. */
  excluirDefinitivo: (id: number) => api.delete(u(id, '/definitivo')),
  esvaziarLixeira: () => api.delete<{ excluidos: number }>('/gestao-projetos/lixeira').then(dados),

  // ---------- etapas ----------
  /** Etapas (com tarefas) de todos os projetos ativos, para o Kanban geral. */
  etapasDosAtivos: () => api.get<Etapa[]>('/gestao-projetos/etapas').then(dados),
  etapas: (projetoId: number) => api.get<Etapa[]>(et(projetoId)).then(dados),
  criarEtapa: (projetoId: number, e: RequisicaoEtapa) => api.post<Etapa>(et(projetoId), semVazios(e)).then(dados),
  atualizarEtapa: (projetoId: number, etapaId: number, e: RequisicaoEtapa) => api.put<Etapa>(et(projetoId, `/${etapaId}`), semVazios(e)).then(dados),
  alterarStatusEtapa: (projetoId: number, etapaId: number, status: StatusEtapa) =>
    api.patch<Etapa>(et(projetoId, `/${etapaId}/status`), { status }).then(dados),
  excluirEtapa: (projetoId: number, etapaId: number) => api.delete(et(projetoId, `/${etapaId}`)),
  criarTarefaEtapa: (projetoId: number, etapaId: number, t: RequisicaoTarefaEtapa) =>
    api.post<Etapa>(et(projetoId, `/${etapaId}/tarefas`), semVazios(t)).then(dados),
  atualizarTarefaEtapa: (projetoId: number, etapaId: number, tarefaId: number, t: RequisicaoTarefaEtapa) =>
    api.put<Etapa>(et(projetoId, `/${etapaId}/tarefas/${tarefaId}`), semVazios(t)).then(dados),
  marcarTarefaEtapa: (projetoId: number, etapaId: number, tarefaId: number, feita: boolean) =>
    api.patch<Etapa>(et(projetoId, `/${etapaId}/tarefas/${tarefaId}`), { feita }).then(dados),
  removerTarefaEtapa: (projetoId: number, etapaId: number, tarefaId: number) =>
    api.delete<Etapa>(et(projetoId, `/${etapaId}/tarefas/${tarefaId}`)).then(dados),

  // ---------- chat do projeto ----------
  /** Em ordem de envio. Sem filtro: as últimas; antesDeId: as anteriores; depoisDeId: só as novas. */
  mensagens: (projetoId: number, filtro: { antesDeId?: number; depoisDeId?: number } = {}) =>
    api.get<MensagemProjeto[]>(u(projetoId, '/chat'), { params: filtro }).then(dados),
  enviarMensagem: (projetoId: number, texto: string) => api.post<MensagemProjeto>(u(projetoId, '/chat'), { texto }).then(dados),
};
