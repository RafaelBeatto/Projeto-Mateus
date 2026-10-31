import type { FichaUsuario, PainelSistema, SessaoAtiva, UsuarioSistema } from 'src/types/administracaoSistema';
import { agora, regra, tabela, type Registro } from './banco';
import { ADMIN_LOCAL_ID, arquivos, cargoDe, historico, nomeCompleto, registrar, resumoUsuario, unidades, usuarios } from './nucleo';
import { del, get, patch, put } from './rotas';

// =====================================================================
// Administração do sistema (área do dono), no modo local: mesmas rotas do back,
// com os dados deste navegador. Só existe no desenvolvimento (login admin).
// =====================================================================

const projetos = tabela<Registro & { excluidoEm?: string | null; coordenadores?: number[] }>('gestaoProjetos');
const etapas = tabela<Registro & { responsavelId?: number | null; status?: string; tarefas?: { responsavelId?: number | null; status?: string }[] }>('gestaoProjetoEtapas');
const mensagens = tabela<Registro & { remetenteId?: number }>('gestaoProjetoMensagens');
const iniciadoEm = agora();

/** Espaço aproximado ocupado pelos dados do modo local neste navegador. */
function tamanhoDoArmazenamento() {
  try {
    return Object.keys(localStorage).reduce((total, chave) => total + chave.length + (localStorage.getItem(chave)?.length ?? 0), 0) * 2;
  } catch {
    return 0;
  }
}

get('/administracao-sistema/painel', (): PainelSistema => {
  const todasUnidades = unidades.todos();
  const todosUsuarios = usuarios.todos();
  const todosArquivos = arquivos.todos();
  return {
    contagens: {
      unidades: todasUnidades.length,
      unidadesAtivas: todasUnidades.filter((u) => u.ativo).length,
      usuarios: todosUsuarios.length,
      usuariosAtivos: todosUsuarios.filter((u) => u.ativo).length,
      usuariosTrocarSenha: todosUsuarios.filter((u) => u.ativo && u.trocarSenha).length,
      acessosUltimas24h: todosUsuarios.filter((u) => u.ultimoAcessoEm && Date.now() - Date.parse(u.ultimoAcessoEm) < 86_400_000).length,
      usuariosComSessao: 1,
      projetos: projetos.filtrar((p) => !p.excluidoEm).length,
      arquivos: todosArquivos.length,
      arquivosBytes: todosArquivos.reduce((total, a) => total + (a.tamanho ?? 0), 0),
    },
    aplicacao: {
      versao: 'modo local',
      perfis: ['local (sem back)'],
      java: '—',
      iniciadaEm: iniciadoEm,
      memoriaUsadaMb: 0,
      memoriaMaximaMb: 0,
      armazenamento: 'Navegador (IndexedDB)',
    },
    banco: { versao: 'Navegador (localStorage)', tamanhoBytes: tamanhoDoArmazenamento() },
  };
});

/** No modo local só existe a sessão de quem está usando este navegador. */
get('/administracao-sistema/sessoes', (): SessaoAtiva[] => {
  const admin = usuarios.obter(ADMIN_LOCAL_ID, 'Usuário');
  return [
    {
      usuarioId: admin.id,
      login: admin.login,
      nome: nomeCompleto(admin),
      cargoNome: cargoDe(admin.cargoId).nome,
      unidadeNome: unidades.buscar(admin.unidadeId)?.nome ?? '',
      sessoes: 1,
      ultimaEntrada: iniciadoEm,
      expiraEm: '2999-12-31T23:59:59Z',
    },
  ];
});

del('/administracao-sistema/sessoes/:usuarioId', ({ p }) => {
  if (p.usuarioId === ADMIN_LOCAL_ID) throw regra('Use a sua própria conta pelo menu do perfil, não por esta tela.');
  return undefined;
});

del('/administracao-sistema/sessoes', () => ({ encerradas: 0 }));

/** Linha da lista (mesmo formato do back: UsuarioSistema). */
function linhaUsuario(u: ReturnType<typeof usuarios.obter>): UsuarioSistema {
  return {
    ...resumoUsuario(u),
    funcao: u.funcao ?? null,
    trocarSenha: u.trocarSenha,
    conectado: u.id === ADMIN_LOCAL_ID,
    dono: u.id === ADMIN_LOCAL_ID,
    criadoEm: u.criadoEm,
  };
}

const FILTROS: Record<string, (u: { ativo: boolean; trocarSenha: boolean }) => boolean> = {
  ATIVOS: (u) => u.ativo,
  DESATIVADOS: (u) => !u.ativo,
  SENHA_PROVISORIA: (u) => u.ativo && u.trocarSenha,
};

get('/administracao-sistema/usuarios', ({ q }) => {
  const busca = (q.busca ?? '').toLowerCase();
  const filtro = FILTROS[q.situacao ?? ''] ?? (() => true);
  const pagina = Number(q.page ?? 0);
  const tamanho = Number(q.size ?? 20);
  const todos = usuarios
    .filtrar((u) => filtro(u) && `${nomeCompleto(u)} ${u.login} ${unidades.buscar(u.unidadeId)?.nome ?? ''}`.toLowerCase().includes(busca))
    .sort((a, b) => nomeCompleto(a).localeCompare(nomeCompleto(b), 'pt-BR'));
  return {
    itens: todos.slice(pagina * tamanho, (pagina + 1) * tamanho).map(linhaUsuario),
    pagina,
    tamanho,
    total: todos.length,
    totalPaginas: Math.ceil(todos.length / tamanho),
  };
});

/** Ficha do usuário com os dados deste navegador (o histórico local guarda o nome de quem fez). */
get('/administracao-sistema/usuarios/:id', ({ p }): FichaUsuario => {
  const u = usuarios.obter(p.id, 'Usuário');
  const unidade = unidades.buscar(u.unidadeId);
  const nome = nomeCompleto(u);
  const acoes = historico.filtrar((h) => h.usuarioNome === nome).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || b.id - a.id);
  const porModulo = new Map<string, number>();
  acoes.forEach((h) => porModulo.set(h.modulo, (porModulo.get(h.modulo) ?? 0) + 1));
  const minhasEtapas = etapas.filtrar((e) => e.responsavelId === u.id);
  const minhasTarefas = etapas.todos().flatMap((e) => e.tarefas ?? []).filter((t) => t.responsavelId === u.id);
  const conectado = u.id === ADMIN_LOCAL_ID;
  return {
    dados: {
      id: u.id,
      login: u.login,
      nome,
      funcao: u.funcao ?? null,
      cargoNome: cargoDe(u.cargoId).nome,
      unidadeNome: unidade?.nome ?? '',
      unidadeTipo: unidade?.tipo ?? 'NACIONAL',
      ativo: u.ativo,
      trocarSenha: u.trocarSenha,
      dono: u.id === ADMIN_LOCAL_ID,
      criadoEm: u.criadoEm,
      atualizadoEm: u.criadoEm,
      criadoPorNome: null,
      ultimoAcessoEm: u.ultimoAcessoEm,
    },
    sessoes: { abertas: conectado ? 1 : 0, ultimaEntrada: conectado ? iniciadoEm : null, expiraEm: conectado ? '2999-12-31T23:59:59Z' : null },
    trabalho: {
      projetosCoordenados: projetos.filtrar((pr) => !pr.excluidoEm && (pr.coordenadores ?? []).includes(u.id)).length,
      etapas: minhasEtapas.length,
      etapasAbertas: minhasEtapas.filter((e) => e.status !== 'CONCLUIDO').length,
      tarefas: minhasTarefas.length,
      tarefasAbertas: minhasTarefas.filter((t) => t.status !== 'CONCLUIDA').length,
      mensagensChat: mensagens.filtrar((m) => m.remetenteId === u.id).length,
      arquivosEnviados: 0,
      arquivosBytes: 0,
    },
    atividade: {
      acoesTotal: acoes.length,
      acoesUltimos30Dias: acoes.filter((h) => Date.now() - Date.parse(h.criadoEm) < 30 * 86_400_000).length,
      ultimaAcaoEm: acoes[0]?.criadoEm ?? null,
      porModulo: [...porModulo.entries()].map(([modulo, quantidade]) => ({ modulo, quantidade })).sort((a, b) => b.quantidade - a.quantidade),
      ultimasAcoes: acoes.slice(0, 30).map((h) => ({
        id: h.id,
        modulo: h.modulo,
        acao: h.acao,
        descricao: h.descricao,
        unidadeNome: unidade?.nome ?? '',
        criadoEm: h.criadoEm,
      })),
    },
  };
});

function outroUsuario(id: number) {
  if (id === ADMIN_LOCAL_ID) throw regra('Use a sua própria conta pelo menu do perfil, não por esta tela.');
  return usuarios.obter(id, 'Usuário');
}

patch('/administracao-sistema/usuarios/:id/situacao', ({ p, b }) => {
  const u = usuarios.salvar({ ...outroUsuario(p.id), ativo: !!b.ativo });
  registrar('USUARIOS', 'EDICAO', `Usuário "${u.login}" ${u.ativo ? 'reativado' : 'desativado'} pelo administrador do sistema.`, 'USUARIO', u.id);
  return resumoUsuario(u);
});

put('/administracao-sistema/usuarios/:id/senha', ({ p }) => {
  const u = usuarios.salvar({ ...outroUsuario(p.id), trocarSenha: true });
  registrar('USUARIOS', 'EDICAO', `Senha de "${u.login}" redefinida pelo administrador do sistema.`, 'USUARIO', u.id);
  return undefined;
});
