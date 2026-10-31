import type { Cargo, UnidadeDetalhe, UnidadeResumo, UsuarioSessao, TipoUnidade } from 'src/types/acesso';
import type { HistoricoRegistro } from 'src/types/comum';
import { agora, copia, ErroLocal, exigir, limpo, naoEncontrado, regra, tabela, valor } from './banco';
import { del, get, patch, post, put } from './rotas';

// =====================================================================
// Acesso: usuário logado, cargos, permissões, unidades e usuários
// =====================================================================

export const USUARIO_LOCAL_ID = 1;
export const UNIDADE_LOCAL_ID = 1;

export const CARGOS: Cargo[] = [
  { id: 1, codigo: 'ADMINISTRADOR_SISTEMA', nome: 'Administrador do sistema', nivel: 0 },
  { id: 4, codigo: 'ADMINISTRADOR', nome: 'Administrador', nivel: 1 },
  { id: 3, codigo: 'COORDENADOR', nome: 'Coordenador', nivel: 2 },
  { id: 5, codigo: 'RESPONSAVEL', nome: 'Responsável', nivel: 3 },
  { id: 6, codigo: 'PRESTADOR_SERVICO', nome: 'Prestador de serviço', nivel: 4 },
];

/** Mesmas permissões e descrições do db/apae.sql (só as dos módulos atuais). */
const PERMISSOES_SISTEMA: { codigo: string; modulo: string; descricao: string }[] = [
  { codigo: 'EMPRESA_LER', modulo: 'EMPRESAS', descricao: 'Ver contratantes' },
  { codigo: 'EMPRESA_ESCREVER', modulo: 'EMPRESAS', descricao: 'Cadastrar e editar contratantes' },
  { codigo: 'HISTORICO_LER', modulo: 'HISTORICO', descricao: 'Ver o histórico do sistema' },
  { codigo: 'USUARIO_LER', modulo: 'USUARIOS', descricao: 'Ver usuários' },
  { codigo: 'USUARIO_ESCREVER', modulo: 'USUARIOS', descricao: 'Criar e editar usuários de cargo inferior' },
  { codigo: 'UNIDADE_LER', modulo: 'UNIDADES', descricao: 'Ver unidades subordinadas' },
  { codigo: 'UNIDADE_ESCREVER', modulo: 'UNIDADES', descricao: 'Criar e editar unidades subordinadas' },
  { codigo: 'PERMISSAO_LER', modulo: 'PERMISSOES', descricao: 'Ver a matriz de permissões da unidade' },
  { codigo: 'PERMISSAO_ESCREVER', modulo: 'PERMISSOES', descricao: 'Ajustar a matriz de permissões da unidade' },
  { codigo: 'INSTITUICAO_ESCREVER', modulo: 'UNIDADES', descricao: 'Editar os dados institucionais (cabeçalho) da própria unidade' },
  { codigo: 'GESTAO_PROJETO_LER', modulo: 'GESTAO_PROJETOS', descricao: 'Ver os projetos e o Kanban da Gestão de Projetos' },
  { codigo: 'GESTAO_PROJETO_ESCREVER', modulo: 'GESTAO_PROJETOS', descricao: 'Criar, editar, mover e excluir projetos da Gestão de Projetos' },
];

const GESTAO = ['GESTAO_PROJETO_LER', 'GESTAO_PROJETO_ESCREVER'];
const EMPRESAS_HISTORICO = ['EMPRESA_LER', 'EMPRESA_ESCREVER', 'HISTORICO_LER'];
/** Matriz padrão (db/apae.sql). */
const MATRIZ_PADRAO: Record<string, string[]> = {
  ADMINISTRADOR: [...GESTAO, ...EMPRESAS_HISTORICO, 'USUARIO_LER', 'USUARIO_ESCREVER', 'UNIDADE_LER', 'UNIDADE_ESCREVER', 'PERMISSAO_LER', 'PERMISSAO_ESCREVER', 'INSTITUICAO_ESCREVER'],
  COORDENADOR: [...GESTAO, ...EMPRESAS_HISTORICO, 'USUARIO_LER', 'USUARIO_ESCREVER', 'UNIDADE_LER'],
  RESPONSAVEL: [...GESTAO, ...EMPRESAS_HISTORICO],
  PRESTADOR_SERVICO: ['GESTAO_PROJETO_LER', 'EMPRESA_LER'],
};

interface UsuarioLocal {
  id: number;
  login: string;
  nome: string;
  /** Só em bancos locais antigos; o nome agora é o completo. */
  sobrenome?: string;
  funcao?: string | null;
  cargoId: number;
  unidadeId: number;
  ativo: boolean;
  trocarSenha: boolean;
  ultimoAcessoEm: string | null;
  criadoEm: string;
}

type UnidadeLocal = Omit<UnidadeDetalhe, never>;

export const usuarios = tabela<UsuarioLocal>('usuarios');
export const unidades = tabela<UnidadeLocal>('unidades');

const unidadeVazia = (id: number, nome: string, tipo: TipoUnidade, unidadePaiId: number | null): UnidadeLocal => ({
  id,
  nome,
  tipo,
  uf: null,
  municipio: null,
  unidadePaiId,
  ativo: true,
  cnpj: null,
  endereco: null,
  telefone: null,
  email: null,
  cidadeUf: null,
  site: null,
  presidente: null,
  cpfPresidente: null,
  rodapeTexto: null,
  rodapeEndereco: false,
  rodapeTelefone: false,
  rodapeEmail: false,
  rodapeSite: false,
  rodapeMostrarPagina: false,
  logoArquivoId: null,
});

/** Primeira abertura do modo local: a unidade raiz e o administrador (ids fixos 1). */
export function semear() {
  if (valor.ler('_semeado', false)) return;
  valor.gravar('_id', Math.max(valor.ler('_id', 0), 100));
  valor.gravar('unidades', [unidadeVazia(UNIDADE_LOCAL_ID, 'APAE (modo local)', 'NACIONAL', null)]);
  valor.gravar('usuarios', [
    {
      id: USUARIO_LOCAL_ID,
      login: 'local',
      nome: 'Usuário Local',
      cargoId: 1,
      unidadeId: UNIDADE_LOCAL_ID,
      ativo: true,
      trocarSenha: false,
      ultimoAcessoEm: agora(),
      criadoEm: agora(),
    } satisfies UsuarioLocal,
  ]);
  valor.gravar('_semeado', true);
}

// ---------- dono do sistema no modo local (login admin; só em desenvolvimento) ----------

export const ADMIN_LOCAL_ID = 2;
let sessaoDoDono = false;

/** O adaptador avisa, a cada chamada, se a sessão local é a do dono (token próprio). */
export const definirSessaoDoDono = (dono: boolean) => {
  sessaoDoDono = dono;
};
export const ehSessaoDoDono = () => sessaoDoDono;

/** Cria o usuário "admin" local na primeira vez (id fixo; os ids novos começam em 100). */
export function garantirAdminLocal() {
  if (usuarios.buscar(ADMIN_LOCAL_ID)) return;
  valor.gravar('usuarios', [
    ...usuarios.todos(),
    {
      id: ADMIN_LOCAL_ID,
      login: 'admin',
      nome: 'Administrador do Sistema',
      cargoId: 1,
      unidadeId: UNIDADE_LOCAL_ID,
      ativo: true,
      trocarSenha: false,
      ultimoAcessoEm: agora(),
      criadoEm: agora(),
    } satisfies UsuarioLocal,
  ]);
}

/** Bancos locais antigos ainda podem ter o sobrenome separado. */
export const nomeCompleto = (u: { nome: string; sobrenome?: string }) => `${u.nome} ${u.sobrenome ?? ''}`.trim();
export const cargoDe = (id: number) => CARGOS.find((c) => c.id === id) ?? CARGOS[CARGOS.length - 1];
export const eu = () => usuarios.obter(USUARIO_LOCAL_ID, 'Usuário');

/** Ajustes da matriz por cargo (codigo → concedida). */
const ajustes = () => valor.ler<Record<string, Record<string, boolean>>>('permissoesAjustes', {});

function permissoesDoCargo(cargo: Cargo): string[] {
  if (cargo.codigo === 'ADMINISTRADOR_SISTEMA') return PERMISSOES_SISTEMA.map((p) => p.codigo);
  const padrao = new Set(MATRIZ_PADRAO[cargo.codigo] ?? []);
  Object.entries(ajustes()[cargo.codigo] ?? {}).forEach(([codigo, concedida]) => (concedida ? padrao.add(codigo) : padrao.delete(codigo)));
  return PERMISSOES_SISTEMA.map((p) => p.codigo).filter((c) => padrao.has(c));
}

export function usuarioSessao(): UsuarioSessao {
  if (sessaoDoDono) garantirAdminLocal();
  const u = sessaoDoDono ? usuarios.obter(ADMIN_LOCAL_ID, 'Usuário') : eu();
  const cargo = cargoDe(u.cargoId);
  const unidade = unidades.obter(u.unidadeId, 'Unidade');
  return {
    id: u.id,
    login: u.login,
    nome: u.nome,
    nomeCompleto: nomeCompleto(u),
    cargo: { codigo: cargo.codigo, nome: cargo.nome, nivel: cargo.nivel },
    unidade: { id: unidade.id, nome: unidade.nome, tipo: unidade.tipo },
    trocarSenha: false,
    permissoes: sessaoDoDono ? [...permissoesDoCargo(cargo), 'DONO_SISTEMA'] : permissoesDoCargo(cargo),
  };
}

// =====================================================================
// Histórico
// =====================================================================

export const historico = tabela<HistoricoRegistro & { id: number }>('historico');

export function registrar(modulo: string, acao: string, descricao: string, refTipo: string | null, refId: number | null) {
  historico.inserir({ modulo, acao, descricao, refTipo, refId, usuarioNome: nomeCompleto(eu()), criadoEm: agora() });
}

const recentes = (lista: HistoricoRegistro[]) => [...lista].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || b.id - a.id);

export const historicoDo = (refTipo: string, refId: number, limite = 30) =>
  recentes(historico.filtrar((h) => h.refTipo === refTipo && h.refId === refId)).slice(0, limite);

export const historicoDoEFilhos = (refTipo: string, refId: number, filhosTipo: string, filhosIds: number[]) =>
  recentes(historico.filtrar((h) => (h.refTipo === refTipo && h.refId === refId) || (h.refTipo === filhosTipo && filhosIds.includes(h.refId ?? -1)))).slice(0, 60);

get('/historico', ({ q }) => {
  const desde = q.desde ?? '';
  const ate = q.ate ?? '9999';
  return recentes(historico.filtrar((h) => h.criadoEm >= desde && h.criadoEm < ate)).slice(0, 1000);
});

// =====================================================================
// Arquivos: dados no localStorage, conteúdo no IndexedDB (cabe muito mais)
// =====================================================================

interface ArquivoLocal {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  categoria: string;
  criadoEm: string;
}

export const arquivos = tabela<ArquivoLocal>('arquivos');

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolver, rejeitar) => {
    const pedido = indexedDB.open('central-secretaria-local', 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore('arquivos');
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(new ErroLocal(507, 'O navegador não permitiu guardar arquivos no modo local.'));
  });
}

async function noArmazem<T>(modo: IDBTransactionMode, acao: (loja: IDBObjectStore) => IDBRequest): Promise<T> {
  const banco = await abrirBanco();
  return new Promise((resolver, rejeitar) => {
    const pedido = acao(banco.transaction('arquivos', modo).objectStore('arquivos'));
    pedido.onsuccess = () => resolver(pedido.result as T);
    pedido.onerror = () => rejeitar(new ErroLocal(507, 'Não foi possível acessar o arquivo no modo local.'));
  });
}

export const arquivoResposta = (a: ArquivoLocal) => copia(a);

/** Confere se o arquivo existe (ServicoArquivo.buscarParaVincular). */
export function exigirArquivo(id: number | null | undefined, rotulo = 'Arquivo') {
  if (id == null) throw new ErroLocal(400, 'Confira os campos destacados.', { arquivoId: 'Envie o arquivo' });
  return arquivos.obter(id, rotulo);
}

export function excluirArquivo(id: number | null | undefined) {
  if (id == null) return;
  arquivos.excluir(id);
  noArmazem('readwrite', (loja) => loja.delete(id)).catch(() => undefined);
}

const urls = new Map<number, string>();
async function urlDoArquivo(id: number) {
  arquivos.obter(id, 'Arquivo');
  if (!urls.has(id)) {
    const blob = await noArmazem<Blob | undefined>('readonly', (loja) => loja.get(id));
    if (!blob) throw naoEncontrado('Arquivo');
    urls.set(id, URL.createObjectURL(blob));
  }
  return urls.get(id)!;
}
export { urlDoArquivo };

post('/arquivos', async ({ b }) => {
  const formulario = b as FormData;
  const arquivo = formulario.get('arquivo') as File | null;
  if (!arquivo) throw regra('Envie um arquivo.');
  const meta = arquivos.inserir({
    nome: arquivo.name,
    tipo: arquivo.type || 'application/octet-stream',
    tamanho: arquivo.size,
    categoria: String(formulario.get('categoria') ?? 'DOCUMENTO'),
    criadoEm: agora(),
  });
  await noArmazem('readwrite', (loja) => loja.put(arquivo, meta.id));
  return arquivoResposta(meta);
});
get('/arquivos/:id', ({ p }) => arquivoResposta(arquivos.obter(p.id, 'Arquivo')));
get('/arquivos/:id/url', async ({ p }) => ({ url: await urlDoArquivo(p.id) }));

// =====================================================================
// Autenticação
// =====================================================================

get('/autenticacao/eu', () => usuarioSessao());
post('/autenticacao/sair', () => undefined);
put('/autenticacao/senha', () => usuarioSessao());

// =====================================================================
// Unidades
// =====================================================================

const SUBORDINADA: Record<TipoUnidade, TipoUnidade | null> = { NACIONAL: 'ESTADUAL', ESTADUAL: 'MUNICIPAL', MUNICIPAL: null };

function profundidade(u: UnidadeLocal): number {
  return u.unidadePaiId ? 1 + profundidade(unidades.obter(u.unidadePaiId, 'Unidade')) : 0;
}

/** Ordem da árvore: cada unidade seguida das subordinadas. */
function arvore(): UnidadeResumo[] {
  const lista: UnidadeResumo[] = [];
  const visitar = (paiId: number | null) =>
    unidades
      .filtrar((u) => u.unidadePaiId === paiId)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .forEach((u) => {
        lista.push({ id: u.id, nome: u.nome, tipo: u.tipo, uf: u.uf, municipio: u.municipio, unidadePaiId: u.unidadePaiId, profundidade: profundidade(u), ativo: u.ativo });
        visitar(u.id);
      });
  visitar(null);
  return lista;
}

get('/unidades/arvore', () => arvore());
get('/unidades/atual', () => copia(unidades.obter(UNIDADE_LOCAL_ID, 'Unidade')));
get('/unidades/:id', ({ p }) => copia(unidades.obter(p.id, 'Unidade')));

post('/unidades', ({ b }) => {
  exigir({ nome: b.nome, unidadePaiId: b.unidadePaiId });
  const pai = unidades.obter(Number(b.unidadePaiId), 'Unidade');
  const tipo = SUBORDINADA[pai.tipo];
  if (!tipo) throw regra('Uma APAE municipal não tem unidades subordinadas.');
  const nome = limpo(b.nome)!;
  if (unidades.filtrar((u) => u.unidadePaiId === pai.id && u.nome.toLowerCase() === nome.toLowerCase()).length) {
    throw regra(`Já existe uma unidade com esse nome em ${pai.nome}.`);
  }
  const u = unidades.inserir({ ...unidadeVazia(0, nome, tipo, pai.id), uf: limpo(b.uf)?.toUpperCase() ?? null, municipio: limpo(b.municipio), ativo: !!b.ativo });
  registrar('UNIDADES', 'CRIACAO', `Unidade "${nome}" criada em "${pai.nome}".`, 'UNIDADE', u.id);
  return copia(u);
});

put('/unidades/minha/dados-institucionais', ({ b }) => {
  exigir({ nome: b.nome });
  const u = unidades.obter(UNIDADE_LOCAL_ID, 'Unidade');
  if (u.logoArquivoId && u.logoArquivoId !== b.logoArquivoId) excluirArquivo(u.logoArquivoId);
  const campos = ['endereco', 'telefone', 'email', 'cidadeUf', 'site', 'presidente', 'rodapeTexto', 'cnpj', 'cpfPresidente'] as const;
  const atualizada: UnidadeLocal = { ...u, nome: limpo(b.nome)! };
  campos.forEach((c) => {
    atualizada[c] = limpo(b[c]);
  });
  (['rodapeEndereco', 'rodapeTelefone', 'rodapeEmail', 'rodapeSite', 'rodapeMostrarPagina'] as const).forEach((c) => {
    atualizada[c] = !!b[c];
  });
  atualizada.logoArquivoId = b.logoArquivoId ?? null;
  unidades.salvar(atualizada);
  registrar('UNIDADES', 'EDICAO', 'Dados da instituição atualizados.', 'UNIDADE', u.id);
  return copia(atualizada);
});

put('/unidades/:id', ({ p, b }) => {
  if (p.id === UNIDADE_LOCAL_ID) throw new ErroLocal(403, 'A própria unidade é alterada em "Dados da instituição".');
  exigir({ nome: b.nome });
  const u = unidades.obter(p.id, 'Unidade');
  const nome = limpo(b.nome)!;
  if (unidades.filtrar((x) => x.unidadePaiId === u.unidadePaiId && x.id !== u.id && x.nome.toLowerCase() === nome.toLowerCase()).length) {
    throw regra('Já existe outra unidade com esse nome no mesmo nível.');
  }
  const atualizada = unidades.salvar({ ...u, nome, uf: limpo(b.uf)?.toUpperCase() ?? null, municipio: limpo(b.municipio), ativo: !!b.ativo });
  registrar('UNIDADES', 'EDICAO', `Unidade "${nome}" alterada.`, 'UNIDADE', u.id);
  return copia(atualizada);
});

// =====================================================================
// Usuários
// =====================================================================

export const resumoUsuario = (u: UsuarioLocal) => {
  const cargo = cargoDe(u.cargoId);
  return {
    id: u.id,
    login: u.login,
    nomeCompleto: nomeCompleto(u),
    cargoCodigo: cargo.codigo,
    cargoNome: cargo.nome,
    unidadeId: u.unidadeId,
    unidadeNome: unidades.buscar(u.unidadeId)?.nome ?? '',
    ativo: u.ativo,
    ultimoAcessoEm: u.ultimoAcessoEm,
  };
};

const detalheUsuario = (u: UsuarioLocal) => ({
  id: u.id,
  login: u.login,
  nome: nomeCompleto(u),
  funcao: u.funcao ?? null,
  cargoId: u.cargoId,
  cargoNome: cargoDe(u.cargoId).nome,
  unidadeId: u.unidadeId,
  unidadeNome: unidades.buscar(u.unidadeId)?.nome ?? '',
  ativo: u.ativo,
  trocarSenha: u.trocarSenha,
  ultimoAcessoEm: u.ultimoAcessoEm,
  criadoEm: u.criadoEm,
});

/** Cargos que o administrador pode dar (todos menos o próprio). */
const cargosAtribuiveis = () => CARGOS.filter((c) => c.codigo !== 'ADMINISTRADOR_SISTEMA');

get('/usuarios', ({ q }) => {
  const busca = (q.busca ?? '').toLowerCase();
  const pagina = Number(q.page ?? 0);
  const tamanho = Number(q.size ?? 10);
  const todos = usuarios
    .filtrar((u) => `${nomeCompleto(u)} ${u.login}`.toLowerCase().includes(busca))
    .sort((a, b) => nomeCompleto(a).localeCompare(nomeCompleto(b), 'pt-BR'));
  return {
    itens: todos.slice(pagina * tamanho, (pagina + 1) * tamanho).map(resumoUsuario),
    pagina,
    tamanho,
    total: todos.length,
    totalPaginas: Math.ceil(todos.length / tamanho),
  };
});
get('/usuarios/cargos-atribuiveis', () => cargosAtribuiveis());
get('/usuarios/:id', ({ p }) => detalheUsuario(usuarios.obter(p.id, 'Usuário')));

function dadosUsuario(b: Record<string, unknown>) {
  exigir({ nome: b.nome, cargoId: b.cargoId, unidadeId: b.unidadeId });
  const cargoId = Number(b.cargoId);
  if (!cargosAtribuiveis().some((c) => c.id === cargoId)) throw new ErroLocal(403, 'Você só pode cadastrar cargos abaixo do seu.');
  const unidade = unidades.obter(Number(b.unidadeId), 'Unidade');
  if (!unidade.ativo) throw regra('A unidade escolhida está desativada.');
  return {
    nome: limpo(b.nome)!,
    sobrenome: undefined,
    funcao: limpo(b.funcao),
    cargoId,
    unidadeId: unidade.id,
  };
}

post('/usuarios', ({ b }) => {
  exigir({ login: b.login, senhaProvisoria: b.senhaProvisoria });
  const login = String(b.login).trim();
  if (usuarios.filtrar((u) => u.login.toLowerCase() === login.toLowerCase()).length) throw regra('Esse login já está em uso.');
  const u = usuarios.inserir({ ...dadosUsuario(b), login, ativo: true, trocarSenha: true, ultimoAcessoEm: null, criadoEm: agora() });
  registrar('USUARIOS', 'CRIACAO', `Usuário "${login}" criado.`, 'USUARIO', u.id);
  return detalheUsuario(u);
});
put('/usuarios/:id', ({ p, b }) => {
  const u = usuarios.salvar({ ...usuarios.obter(p.id, 'Usuário'), ...dadosUsuario(b) });
  registrar('USUARIOS', 'EDICAO', `Dados do usuário "${u.login}" atualizados.`, 'USUARIO', u.id);
  return detalheUsuario(u);
});
put('/usuarios/:id/senha', ({ p }) => {
  const u = usuarios.salvar({ ...usuarios.obter(p.id, 'Usuário'), trocarSenha: true });
  registrar('USUARIOS', 'EDICAO', `Senha do usuário "${u.login}" redefinida.`, 'USUARIO', u.id);
  return undefined;
});

patch('/usuarios/:id/situacao', ({ p, b }) => {
  if (p.id === USUARIO_LOCAL_ID) throw regra('Você não pode desativar a si mesmo.');
  const u = usuarios.salvar({ ...usuarios.obter(p.id, 'Usuário'), ativo: !!b.ativo });
  registrar('USUARIOS', 'EDICAO', `Usuário "${u.login}" ${u.ativo ? 'reativado' : 'desativado'}.`, 'USUARIO', u.id);
  return detalheUsuario(u);
});

/** Usuários ativos (coordenadores, contatos do chat, Central de Relatórios). */
export const usuariosAtivos = () => usuarios.filtrar((u) => u.ativo);

// =====================================================================
// Permissões
// =====================================================================

function matriz() {
  const aj = ajustes();
  const permissoes = [...PERMISSOES_SISTEMA].sort((a, b) => a.modulo.localeCompare(b.modulo));
  return {
    unidadeId: UNIDADE_LOCAL_ID,
    permissoes,
    cargos: CARGOS.filter((c) => c.codigo !== 'ADMINISTRADOR_SISTEMA').map((cargo) => ({
      cargo,
      editavel: true,
      permissoes: permissoesDoCargo(cargo),
      ajustadas: Object.keys(aj[cargo.codigo] ?? {}),
    })),
  };
}

get('/permissoes', () => matriz());
put('/permissoes/cargos/:id', ({ p, b }) => {
  const cargo = CARGOS.find((c) => c.id === p.id && c.codigo !== 'ADMINISTRADOR_SISTEMA');
  if (!cargo) throw naoEncontrado('Cargo');
  const desejadas = new Set<string>(b.permissoes ?? []);
  const padrao = new Set(MATRIZ_PADRAO[cargo.codigo] ?? []);
  const diferencas: Record<string, boolean> = {};
  PERMISSOES_SISTEMA.forEach(({ codigo }) => {
    if (desejadas.has(codigo) !== padrao.has(codigo)) diferencas[codigo] = desejadas.has(codigo);
  });
  valor.gravar('permissoesAjustes', { ...ajustes(), [cargo.codigo]: diferencas });
  registrar('PERMISSOES', 'EDICAO', `Permissões do cargo ${cargo.nome} ajustadas nesta unidade.`, 'CARGO', cargo.id);
  return matriz();
});
del('/permissoes/cargos/:id', ({ p }) => {
  const cargo = CARGOS.find((c) => c.id === p.id);
  if (!cargo) throw naoEncontrado('Cargo');
  const todos = { ...ajustes() };
  delete todos[cargo.codigo];
  valor.gravar('permissoesAjustes', todos);
  registrar('PERMISSOES', 'EDICAO', `Permissões do cargo ${cargo.nome} voltaram ao padrão.`, 'CARGO', cargo.id);
  return matriz();
});
