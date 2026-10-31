import { existeTela } from 'src/routes/modulos';
/** Pesquisa geral (back: pesquisa/dto/ResultadoPesquisa). */
export type TipoResultado = 'GESTAO_PROJETO' | 'EMPRESA';

export interface ResultadoPesquisa {
  tipo: TipoResultado;
  id: number;
  titulo: string;
  detalhes: string[];
}

export const ROTULO_TIPO_PESQUISA: Record<TipoResultado, string> = {
  GESTAO_PROJETO: 'Projetos',
  EMPRESA: 'Contratantes',
};

/** Ordem dos grupos na tela. */
export const ORDEM_TIPOS_PESQUISA: TipoResultado[] = ['GESTAO_PROJETO', 'EMPRESA'];

/** Rota do registro de um resultado (null = o módulo dele não tem tela). */
export function destinoDoResultado(r: Pick<ResultadoPesquisa, 'tipo' | 'id'>): string | null {
  const rota = rotaDoResultado(r);
  return existeTela(rota) ? rota : null;
}

function rotaDoResultado(r: Pick<ResultadoPesquisa, 'tipo' | 'id'>): string {
  switch (r.tipo) {
    // Arquivado: a própria Gestão de Projetos redireciona para "Arquivados".
    case 'GESTAO_PROJETO':
      return `/gestao-projetos?projeto=${r.id}`;
    case 'EMPRESA':
    default:
      return `/empresas?empresa=${r.id}`;
  }
}
