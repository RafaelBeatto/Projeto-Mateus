import type { ResultadoPesquisa, TipoResultado } from 'src/types/pesquisa';
import { tabela } from './banco';
import { empresas } from './empresas';
import { get } from './rotas';

// ---------- pesquisa geral (ServicoPesquisa) ----------

const normalizar = (t: string | null | undefined) =>
  (t ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

/** Igual 50, começa 25, contém 5 por ocorrência — vezes o peso do campo. */
function pontuar(texto: string | null | undefined, q: string, peso: number) {
  if (!texto || !texto.trim()) return 0;
  const t = normalizar(texto);
  if (t === q) return 50 * peso;
  if (t.startsWith(q)) return 25 * peso;
  return (t.split(q).length - 1) * 5 * peso;
}

function buscar<T extends { id: number }>(
  q: string,
  itens: T[],
  tipo: TipoResultado,
  titulo: (x: T) => string,
  detalhes: (x: T) => (string | null | undefined)[],
  campos: (x: T) => [string | null | undefined, number][],
): ResultadoPesquisa[] {
  return itens
    .map((item) => ({ item, pontos: campos(item).reduce((s, [texto, peso]) => s + pontuar(texto, q, peso), 0) }))
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 25)
    .map(({ item }) => ({ tipo, id: item.id, titulo: titulo(item), detalhes: detalhes(item).filter((d) => d && d.trim()) as string[] }));
}

get('/pesquisa', ({ q: params }) => {
  const q = normalizar(params.termo);
  if (q.length < 2) return [];
  const projetos = tabela<{
    id: number;
    nome: string;
    processo: string | null;
    contratante: string | null;
    contratanteCidade: string | null;
    convenioNumero: string | null;
    convenioOrigem: string | null;
    origemRecurso: string | null;
    arquivadoEm?: string | null;
    excluidoEm?: string | null;
  }>('gestaoProjetos');
  return [
    // Ativos e arquivados; os da lixeira ficam de fora.
    ...buscar(
      q,
      projetos.filtrar((p) => !p.excluidoEm),
      'GESTAO_PROJETO',
      (p) => p.nome,
      (p) => [p.arquivadoEm ? 'Arquivado' : '', p.processo ? `Processo ${p.processo}` : '', p.contratante],
      (p) => [
        [p.nome, 3],
        [p.processo, 2],
        [p.contratante, 1.5],
        [p.convenioNumero, 1.5],
        [p.contratanteCidade, 1],
        [p.convenioOrigem, 1],
        [p.origemRecurso, 1],
      ],
    ),
    ...buscar(q, empresas.todos(), 'EMPRESA', (e) => e.razaoSocial || e.nomeFantasia || '', (e) => [e.cnpj, e.municipio], (e) => [
      [e.razaoSocial, 3],
      [e.nomeFantasia, 2],
      [e.cnpj, 1.5],
      [e.representante, 1],
      [e.municipio, 1],
    ]),
  ];
});
