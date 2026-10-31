import type { Etapa, GestaoProjeto, TarefaEtapa } from 'src/types/gestaoProjetos';
import { diasAte } from './datas';

/** "Faltam 12 dias", "Termina hoje", "Atrasado há 3 dias" (pela data de término do projeto). */
export function prazoDoProjeto(dataFim: string | null): {
  texto: string;
  cor: 'default' | 'warning' | 'error';
} {
  if (!dataFim) return { texto: 'Sem data de término', cor: 'default' };
  const dias = diasAte(dataFim);
  if (dias < 0) return { texto: `Atrasado há ${-dias} dia${dias === -1 ? '' : 's'}`, cor: 'error' };
  if (dias === 0) return { texto: 'Termina hoje', cor: 'warning' };
  return {
    texto: `Falta${dias === 1 ? '' : 'm'} ${dias} dia${dias === 1 ? '' : 's'}`,
    cor: dias <= 7 ? 'warning' : 'default',
  };
}

/** Convênio + contrapartida; null quando nenhum dos dois foi informado. */
export const valorTotalDoProjeto = (p: Pick<GestaoProjeto, 'valorConvenio' | 'contrapartida'>) =>
  p.valorConvenio == null && p.contrapartida == null
    ? null
    : (p.valorConvenio ?? 0) + (p.contrapartida ?? 0);

/** Percentual de etapas concluídas (0 quando ainda não há etapas). */
export const progressoDoProjeto = (p: Pick<GestaoProjeto, 'etapasTotal' | 'etapasConcluidas'>) =>
  p.etapasTotal ? Math.round((p.etapasConcluidas * 100) / p.etapasTotal) : 0;

/** Tarefas feitas da lista da etapa. */
export const progressoTarefasEtapa = (e: Pick<Etapa, 'tarefas'>) => {
  const total = e.tarefas.length;
  const feitas = e.tarefas.filter((t) => t.feita).length;
  return { total, feitas, pct: total ? Math.round((feitas / total) * 100) : 0 };
};

export interface DependenciaResolvida {
  tipo: 'etapa' | 'tarefa';
  id: number;
  /** Ex.: 'Etapa "Licitação"' ou 'Pedir orçamento (Licitação)' — tarefa da mesma etapa vai sem o parêntese. */
  rotulo: string;
  /** Etapa: situação Concluído; tarefa: marcada como feita. */
  concluida: boolean;
}

/** Dependências da tarefa (etapas e tarefas do projeto) com rótulo e situação; some o que não existe mais. */
export function dependenciasDaTarefa(
  t: TarefaEtapa,
  etapaAtualId: number,
  etapas: Etapa[],
): DependenciaResolvida[] {
  const deEtapas = t.dependenciasEtapas
    .map((id) => etapas.find((e) => e.id === id))
    .filter(Boolean)
    .map((e) => ({
      tipo: 'etapa' as const,
      id: e!.id,
      rotulo: `Etapa "${e!.titulo}"`,
      concluida: e!.status === 'CONCLUIDO',
    }));
  const deTarefas = t.dependencias.flatMap((id) =>
    etapas.flatMap((e) =>
      e.tarefas
        .filter((x) => x.id === id)
        .map((x) => ({
          tipo: 'tarefa' as const,
          id: x.id,
          rotulo: e.id === etapaAtualId ? x.texto : `${x.texto} (${e.titulo})`,
          concluida: x.feita,
        })),
    ),
  );
  return [...deEtapas, ...deTarefas];
}

/**
 * Ramificações: etapas filhas de cada etapa, em ordem de criação. A chave null é o projeto
 * (as que saem direto dele, e as que apontam para uma etapa que não existe mais).
 */
export function filhasDasEtapas(etapas: Etapa[]): Map<number | null, Etapa[]> {
  const existentes = new Set(etapas.map((e) => e.id));
  const filhas = new Map<number | null, Etapa[]>();
  [...etapas]
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || a.id - b.id)
    .forEach((e) => {
      const pai = e.etapaPaiId != null && existentes.has(e.etapaPaiId) ? e.etapaPaiId : null;
      filhas.set(pai, [...(filhas.get(pai) ?? []), e]);
    });
  return filhas;
}

/** Ids das etapas que saem (direta ou indiretamente) da etapa: escolher uma delas como origem fecharia um ciclo. */
export function descendentesDe(id: number, etapas: Etapa[]): Set<number> {
  const filhas = filhasDasEtapas(etapas);
  const resultado = new Set<number>();
  const pendentes = [id];
  while (pendentes.length) {
    (filhas.get(pendentes.pop()!) ?? []).forEach((f) => {
      if (resultado.has(f.id)) return;
      resultado.add(f.id);
      pendentes.push(f.id);
    });
  }
  return resultado;
}

/** Texto onde a busca procura: nome, processo, contratante e cidade, nº do convênio e coordenadores. */
export const textoDeBuscaDoProjeto = (p: GestaoProjeto) =>
  [
    p.nome,
    p.processo,
    p.contratante,
    p.contratanteCidade,
    p.convenioNumero,
    ...p.coordenadores.map((c) => c.nomeCompleto),
  ].join(' ');
