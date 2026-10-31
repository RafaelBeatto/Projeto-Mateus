import type { AxiosAdapter, AxiosResponse } from 'axios';
import type { RespostaSessao } from 'src/types/acesso';
import { ErroLocal } from './banco';
import { definirSessaoDoDono, semear, usuarioSessao } from './nucleo';
import { semearFicticios } from './dadosFicticios';
import { despachar } from './rotas';
// Cada módulo registra as rotas da API que atende.
import './empresas';
import './gestaoProjetos';
import './pesquisa';
import './administracaoSistema';

/**
 * Modo local: o sistema inteiro funciona sem back e sem banco. Cada chamada da API é
 * respondida aqui, com as mesmas regras do back, e os dados ficam no navegador
 * (localStorage; o conteúdo dos arquivos, no IndexedDB). A sessão local é marcada
 * pelo próprio token, então "Sair" encerra o modo.
 */
export const TOKEN_LOCAL = 'modo-local';
/** Sessão local do dono do sistema (login admin): abre a área de administração. */
export const TOKEN_LOCAL_ADMIN = 'modo-local-admin';
export const ehTokenLocal = (token: string | null | undefined) => token === TOKEN_LOCAL || token === TOKEN_LOCAL_ADMIN;

/** Login do dono no modo local. Só vale no desenvolvimento (npm run dev) e com o back fora do ar. */
export const credenciaisAdminLocal = (login: string, senha: string) =>
  import.meta.env.DEV && login.toLowerCase() === 'admin' && senha === 'admin123456';

/** Tokens da sessão local; o usuário é recarregado de /autenticacao/eu ao entrar. */
export function sessaoLocal(dono = false): RespostaSessao {
  semear();
  semearFicticios();
  definirSessaoDoDono(dono);
  const token = dono ? TOKEN_LOCAL_ADMIN : TOKEN_LOCAL;
  return { tokenAcesso: token, acessoExpiraEm: '2999-12-31T23:59:59Z', tokenRenovacao: token, usuario: usuarioSessao() };
}

function corpo(dados: unknown) {
  if (typeof dados !== 'string') return dados ?? {};
  try {
    return JSON.parse(dados);
  } catch {
    return {};
  }
}

function parametros(params: unknown) {
  const q: Record<string, string | undefined> = {};
  Object.entries((params ?? {}) as Record<string, unknown>).forEach(([k, v]) => {
    if (v !== undefined && v !== null) q[k] = String(v);
  });
  return q;
}

/** Adaptador do axios que responde sem rede. */
export const adaptadorLocal: AxiosAdapter = async (config) => {
  semear();
  semearFicticios();
  definirSessaoDoDono(String(config.headers?.Authorization ?? '') === `Bearer ${TOKEN_LOCAL_ADMIN}`);
  const caminho = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api(?=\/)/, '').split('?')[0];
  const metodo = (config.method ?? 'get').toLowerCase();
  const responder = (status: number, data: unknown): AxiosResponse => ({ data, status, statusText: '', headers: {}, config });
  const falhar = (status: number, detail: string, campos: Record<string, string> = {}) =>
    Promise.reject(Object.assign(new Error(detail), { config, response: responder(status, { detail, campos }) }));

  try {
    const resultado = await despachar(metodo, caminho, parametros(config.params), corpo(config.data));
    if (!resultado.encontrada) return falhar(404, 'Esta função não está disponível no modo local.');
    return resultado.dados === undefined ? responder(204, null) : responder(200, resultado.dados);
  } catch (erro) {
    if (erro instanceof ErroLocal) return falhar(erro.status, erro.message, erro.campos);
    // eslint-disable-next-line no-console
    console.error('[modo local]', metodo.toUpperCase(), caminho, erro);
    return falhar(500, 'Erro inesperado no modo local.');
  }
};
