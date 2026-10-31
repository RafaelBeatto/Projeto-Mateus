/**
 * Roteador do modo local: cada módulo registra as rotas da API que ele atende
 * (mesmos caminhos e formatos do back) e o adaptador do axios despacha para cá.
 */
export interface Contexto {
  /** Parâmetros do caminho (":id" etc.), já como número quando são números. */
  p: Record<string, number>;
  /** Parâmetros da URL (?inicio=...). */
  q: Record<string, string | undefined>;
  /** Corpo da requisição (JSON já lido, ou FormData). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  b: any;
}

type Tratador = (c: Contexto) => unknown | Promise<unknown>;

interface Rota {
  metodo: string;
  regex: RegExp;
  nomes: string[];
  tratador: Tratador;
}

const rotas: Rota[] = [];

function registrar(metodo: string, padrao: string, tratador: Tratador) {
  const nomes: string[] = [];
  const regex = new RegExp(
    `^${padrao.replace(/:(\w+)/g, (_, nome: string) => {
      nomes.push(nome);
      return '([^/]+)';
    })}$`,
  );
  rotas.push({ metodo, regex, nomes, tratador });
}

export const get = (padrao: string, t: Tratador) => registrar('get', padrao, t);
export const post = (padrao: string, t: Tratador) => registrar('post', padrao, t);
export const put = (padrao: string, t: Tratador) => registrar('put', padrao, t);
export const patch = (padrao: string, t: Tratador) => registrar('patch', padrao, t);
export const del = (padrao: string, t: Tratador) => registrar('delete', padrao, t);

/** Rota fixa vence a com parâmetro ("/tarefas/encerradas" antes de "/tarefas/:id"). */
const especificidade = (r: Rota) => r.nomes.length;

export async function despachar(metodo: string, caminho: string, q: Contexto['q'], b: unknown) {
  const candidatas = rotas
    .filter((r) => r.metodo === metodo && r.regex.test(caminho))
    .sort((a, b2) => especificidade(a) - especificidade(b2));
  const rota = candidatas[0];
  if (!rota) return { encontrada: false as const };
  const valores = rota.regex.exec(caminho)!.slice(1);
  const p: Record<string, number> = {};
  rota.nomes.forEach((nome, i) => {
    p[nome] = Number(decodeURIComponent(valores[i]));
  });
  const dados = await rota.tratador({ p, q, b });
  return { encontrada: true as const, dados };
}
