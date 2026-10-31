import type {
  Etapa,
  GestaoProjeto,
  StatusEtapa,
  StatusGestaoProjeto,
  StatusTarefaEtapa,
  TarefaEtapa,
} from 'src/types/gestaoProjetos';
import {
  ROTULO_STATUS_ETAPA,
  ROTULO_STATUS_GESTAO_PROJETO,
  ROTULO_STATUS_TAREFA_ETAPA,
} from 'src/types/gestaoProjetos';

/**
 * Kanban geral: projetos, etapas e tarefas no mesmo quadro. Cada tipo tem seus próprios status;
 * as colunas juntam os equivalentes (o cartão mostra o status exato).
 */
export type ColunaGeral = 'ESPERA' | 'PAUSA' | 'ANDAMENTO' | 'FIM';
export type TipoItemGeral = 'PROJETO' | 'ETAPA' | 'TAREFA';

export const COLUNAS_GERAL: ColunaGeral[] = ['ESPERA', 'PAUSA', 'ANDAMENTO', 'FIM'];
export const ROTULO_COLUNA_GERAL: Record<ColunaGeral, string> = {
  ESPERA: 'Em espera',
  PAUSA: 'Em pausa',
  ANDAMENTO: 'Em andamento',
  FIM: 'Concluído',
};
export const COR_COLUNA_GERAL: Record<ColunaGeral, string> = {
  ESPERA: 'primary.light',
  PAUSA: 'warning.light',
  ANDAMENTO: 'secondary.light',
  FIM: 'success.light',
};
export const ROTULO_TIPO_ITEM: Record<TipoItemGeral, string> = {
  PROJETO: 'Projeto',
  ETAPA: 'Etapa',
  TAREFA: 'Tarefa',
};

/** Status de cada tipo para cada coluna (ao arrastar). */
export const STATUS_PROJETO_NA_COLUNA: Record<ColunaGeral, StatusGestaoProjeto> = {
  ESPERA: 'EM_ESPERA',
  PAUSA: 'EM_PAUSA',
  ANDAMENTO: 'EM_ANDAMENTO',
  FIM: 'EM_ANALISE',
};
export const STATUS_ETAPA_NA_COLUNA: Record<ColunaGeral, StatusEtapa> = {
  ESPERA: 'EM_ESPERA',
  PAUSA: 'EM_PAUSA',
  ANDAMENTO: 'EM_ANDAMENTO',
  FIM: 'CONCLUIDO',
};
/** Na tarefa, "Concluído" é Concluída (= feita). */
export const STATUS_TAREFA_NA_COLUNA: Record<ColunaGeral, StatusTarefaEtapa> = {
  ESPERA: 'EM_ESPERA',
  PAUSA: 'EM_PAUSA',
  ANDAMENTO: 'EM_ANDAMENTO',
  FIM: 'CONCLUIDA',
};

const colunaDoStatus = (s: StatusGestaoProjeto | StatusEtapa | StatusTarefaEtapa): ColunaGeral =>
  s === 'EM_ESPERA'
    ? 'ESPERA'
    : s === 'EM_PAUSA'
      ? 'PAUSA'
      : s === 'EM_ANDAMENTO'
        ? 'ANDAMENTO'
        : 'FIM';

export interface ItemGeral {
  /** Único no quadro (os ids de projeto, etapa e tarefa podem coincidir). */
  chave: string;
  tipo: TipoItemGeral;
  titulo: string;
  coluna: ColunaGeral;
  /** Status exato do item ("Em análise", "Bloqueada", "Feita"…). */
  rotuloStatus: string;
  projeto: GestaoProjeto;
  etapa?: Etapa;
  tarefa?: TarefaEtapa;
  /** Coordenadores (projeto) ou responsável (etapa e tarefa). */
  pessoas: { id: number; nomeCompleto: string }[];
  prazo: string | null;
}

/** Todos os itens do quadro: cada projeto ativo, suas etapas e as tarefas de cada etapa. */
export function montarItens(projetos: GestaoProjeto[], etapas: Etapa[]): ItemGeral[] {
  const porId = new Map(projetos.map((p) => [p.id, p]));
  const itens: ItemGeral[] = projetos.map((p) => ({
    chave: `projeto-${p.id}`,
    tipo: 'PROJETO',
    titulo: p.nome,
    coluna: colunaDoStatus(p.status),
    rotuloStatus: ROTULO_STATUS_GESTAO_PROJETO[p.status],
    projeto: p,
    pessoas: p.coordenadores,
    prazo: p.dataFim,
  }));
  etapas.forEach((e) => {
    const projeto = porId.get(e.projetoId);
    if (!projeto) return;
    itens.push({
      chave: `etapa-${e.id}`,
      tipo: 'ETAPA',
      titulo: e.titulo,
      coluna: colunaDoStatus(e.status),
      rotuloStatus: ROTULO_STATUS_ETAPA[e.status],
      projeto,
      etapa: e,
      pessoas: e.responsavel ? [e.responsavel] : [],
      prazo: e.prazo,
    });
    e.tarefas.forEach((t) =>
      itens.push({
        chave: `tarefa-${t.id}`,
        tipo: 'TAREFA',
        titulo: t.texto,
        coluna: colunaDoStatus(t.status),
        rotuloStatus: ROTULO_STATUS_TAREFA_ETAPA[t.status],
        projeto,
        etapa: e,
        tarefa: t,
        pessoas: t.responsavel ? [t.responsavel] : [],
        prazo: t.prazo,
      }),
    );
  });
  return itens;
}

/** Endereço que abre o item: o projeto, ou a etapa dentro dele (tarefas abrem a etapa delas). */
export const destinoDoItem = (i: ItemGeral) =>
  i.etapa
    ? `/gestao-projetos?projeto=${i.projeto.id}&etapa=${i.etapa.id}`
    : `/gestao-projetos?projeto=${i.projeto.id}`;
