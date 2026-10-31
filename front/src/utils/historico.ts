import type { HistoricoRegistro } from 'src/types/comum';
import { diasAte, doIso, paraIso } from 'src/utils/datas';
import { existeTela } from 'src/routes/modulos';

/** Dia local (não UTC) de um instante: uma ação às 22h continua no mesmo dia. */
export const diaLocalHistorico = (instante: string) => paraIso(new Date(instante));

export const horaHistorico = (instante: string) =>
  new Date(instante).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** "08/10/2026 · Hoje", "07/10/2026 · Ontem", "05/10/2026 · Segunda-feira". */
export function tituloDoDiaHistorico(iso: string) {
  const data = doIso(iso);
  const d = diasAte(iso);
  const nome = d === 0 ? 'Hoje' : d === -1 ? 'Ontem' : data.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${data.toLocaleDateString('pt-BR')} · ${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
}

/** Agrupa por dia local uma lista já ordenada (mais recente primeiro). */
export function agruparPorDia(itens: HistoricoRegistro[]) {
  const grupos: { dia: string; itens: HistoricoRegistro[] }[] = [];
  itens.forEach((h) => {
    const d = diaLocalHistorico(h.criadoEm);
    if (!grupos.length || grupos[grupos.length - 1].dia !== d) grupos.push({ dia: d, itens: [] });
    grupos[grupos.length - 1].itens.push(h);
  });
  return grupos;
}

/** Áreas do histórico (back: ModuloHistorico) com o rótulo da tela. */
export const ROTULO_MODULO_HISTORICO: Record<string, string> = {
  SECRETARIA: 'Secretaria',
  AGENDA: 'Agenda',
  DOCUMENTOS: 'Documentos',
  PROJETOS: 'Projetos',
  EMPRESAS: 'Contratantes',
  ATENDIMENTOS: 'Atendimentos',
  GERADOR: 'Gerador',
  USUARIOS: 'Usuários',
  UNIDADES: 'Unidades',
  PERMISSOES: 'Permissões',
  RELATORIOS: 'Relatórios',
  GESTAO_PROJETOS: 'Gestão de Projetos',
};

export const ROTULO_ACAO_HISTORICO: Record<string, string> = {
  CRIACAO: 'Criação',
  EDICAO: 'Edição',
  EXCLUSAO: 'Exclusão',
  CONCLUSAO: 'Conclusão',
  REABERTURA: 'Reabertura',
  MOVIMENTACAO: 'Movimentação',
  RENOVACAO: 'Renovação',
  ARQUIVAMENTO: 'Arquivamento',
  TRANSFERENCIA: 'Transferência',
  PAGAMENTO: 'Pagamento',
  COTACAO: 'Cotação',
  ORDEM_COMPRA: 'Ordem de compra',
  DOCUMENTO: 'Documento',
  VINCULO: 'Vínculo',
  DESVINCULO: 'Desvínculo',
  PRESENCA: 'Presença',
};

/**
 * Rota do registro de uma linha (null = não há tela para abrir, como usuários e permissões,
 * ou o registro é de um módulo que saiu do sistema).
 */
export function destinoDoHistorico(h: Pick<HistoricoRegistro, 'refTipo' | 'refId'>): string | null {
  const rota = rotaDoHistorico(h);
  return rota && existeTela(rota) ? rota : null;
}

function rotaDoHistorico(h: Pick<HistoricoRegistro, 'refTipo' | 'refId'>): string | null {
  const id = h.refId;
  if (!id || !h.refTipo) return null;
  switch (h.refTipo) {
    case 'EMPRESA':
      return `/empresas?empresa=${id}`;
    case 'GESTAO_PROJETO':
      return `/gestao-projetos?projeto=${id}`;
    default:
      return null;
  }
}
