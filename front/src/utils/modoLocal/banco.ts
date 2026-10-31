import { hojeIso, paraIso } from 'src/utils/datas';
import omit from 'lodash/omit';

/**
 * "Banco" do modo local: cada tabela é uma lista JSON no localStorage.
 * Os ids são únicos no banco inteiro (um contador só), como as sequências do Postgres.
 */
const PREFIXO = 'central-secretaria:local:';

export interface Registro {
  id: number;
}

const cache = new Map<string, unknown>();

function ler<T>(chave: string, padrao: T): T {
  if (cache.has(chave)) return cache.get(chave) as T;
  let valor = padrao;
  try {
    const texto = localStorage.getItem(PREFIXO + chave);
    if (texto) valor = JSON.parse(texto) as T;
  } catch {
    // localStorage indisponível ou corrompido: começa vazio.
  }
  cache.set(chave, valor);
  return valor;
}

function escrever(chave: string, valor: unknown) {
  cache.set(chave, valor);
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    throw new ErroLocal(507, 'O armazenamento do navegador está cheio. Exclua registros ou arquivos do modo local.');
  }
}

/** Cópia profunda: a tela nunca recebe o objeto guardado. */
export const copia = <T>(valor: T): T => (valor === undefined ? valor : (JSON.parse(JSON.stringify(valor)) as T));

export function novoId(): number {
  const id = ler<number>('_id', 0) + 1;
  escrever('_id', id);
  return id;
}

/** Tabela com leitura e gravação. Toda alteração é gravada na hora. */
export function tabela<T extends Registro>(nome: string) {
  const todos = () => ler<T[]>(nome, []);
  const salvarTodos = (lista: T[]) => escrever(nome, lista);
  return {
    todos,
    buscar: (id: number) => todos().find((r) => r.id === id),
    obter(id: number, rotulo: string): T {
      const r = todos().find((x) => x.id === id);
      if (!r) throw naoEncontrado(rotulo);
      return r;
    },
    filtrar: (filtro: (r: T) => boolean) => todos().filter(filtro),
    inserir(dados: Omit<T, 'id'>): T {
      const registro = { ...dados, id: novoId() } as T;
      salvarTodos([...todos(), registro]);
      return registro;
    },
    /** Grava um registro já alterado (mesmo objeto ou cópia com o mesmo id). */
    salvar(registro: T): T {
      salvarTodos(todos().map((r) => (r.id === registro.id ? registro : r)));
      return registro;
    },
    excluir(id: number) {
      salvarTodos(todos().filter((r) => r.id !== id));
    },
    excluirOnde(filtro: (r: T) => boolean) {
      salvarTodos(todos().filter((r) => !filtro(r)));
    },
  };
}

/** Valores soltos (contadores, configurações). */
export const valor = {
  ler: <T>(chave: string, padrao: T) => ler<T>(chave, padrao),
  gravar: (chave: string, dado: unknown) => escrever(chave, dado),
};

/** Erro no formato do ProblemDetail do back (o cliente HTTP converte em ErroApi). */
export class ErroLocal extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    public readonly campos: Record<string, string> = {},
  ) {
    super(mensagem);
  }
}

export const naoEncontrado = (rotulo: string) => new ErroLocal(404, `${rotulo} não encontrado(a).`);
export const regra = (mensagem: string) => new ErroLocal(422, mensagem);

/** Campos obrigatórios: mesmo formato de erro do back ("Confira os campos destacados."). */
export function exigir(campos: Record<string, unknown>) {
  const faltando = Object.entries(campos).filter(([, v]) => v === null || v === undefined || (typeof v === 'string' && !v.trim()));
  if (faltando.length) {
    throw new ErroLocal(400, 'Confira os campos destacados.', Object.fromEntries(faltando.map(([k]) => [k, 'não deve estar em branco'])));
  }
}

// ---------- apoio comum ----------

export const agora = () => new Date().toISOString();
export const hoje = () => hojeIso();
export { paraIso };

/** Texto aparado; vazio vira null (Textos.limpo do back). */
export function limpo(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t ? t : null;
}

export const numeroOuNulo = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

/** "TAR-0001": sequência por prefixo (ServicoNumeracao.codigo). */
export function codigo(prefixo: string) {
  const chave = `_seq:${prefixo}:0`;
  const n = ler<number>(chave, 0) + 1;
  escrever(chave, n);
  return `${prefixo}-${String(n).padStart(4, '0')}`;
}

/** "001/2026": numeração do Gerador por série e ano. */
export function numeroDoAno(serie: string, ano: number, consumir = true) {
  const chave = `_seq:${serie}:${ano}`;
  const n = ler<number>(chave, 0) + 1;
  if (consumir) escrever(chave, n);
  return `${String(n).padStart(3, '0')}/${ano}`;
}

/** dd/mm/aaaa */
export const dataBr = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

export const real = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/** Arredonda para centavos (evita 0.1 + 0.2). */
export const centavos = (v: number) => Math.round(v * 100) / 100;

export const soma = (valores: number[]) => centavos(valores.reduce((a, b) => a + b, 0));

/** Cópia de um registro sem o id (para inserir como novo). */
export function semId<T extends Registro>(registro: T): Omit<T, 'id'> {
  return omit(registro, 'id');
}
