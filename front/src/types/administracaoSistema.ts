/** Tipos espelhando os DTOs do back (pacote sistema.administracao). */

export interface PainelSistema {
  contagens: {
    unidades: number;
    unidadesAtivas: number;
    usuarios: number;
    usuariosAtivos: number;
    usuariosTrocarSenha: number;
    acessosUltimas24h: number;
    usuariosComSessao: number;
    projetos: number;
    arquivos: number;
    arquivosBytes: number;
  };
  aplicacao: {
    versao: string;
    perfis: string[];
    java: string;
    iniciadaEm: string;
    memoriaUsadaMb: number;
    memoriaMaximaMb: number;
    armazenamento: string;
  };
  banco: { versao: string; tamanhoBytes: number };
}

export interface SessaoAtiva {
  usuarioId: number;
  login: string;
  nome: string;
  cargoNome: string;
  unidadeNome: string;
  sessoes: number;
  ultimaEntrada: string;
  expiraEm: string;
}

export type FiltroSituacao = 'TODOS' | 'ATIVOS' | 'DESATIVADOS' | 'SENHA_PROVISORIA';

/** Linha da lista de usuários de todas as unidades. */
export interface UsuarioSistema {
  id: number;
  login: string;
  nomeCompleto: string;
  funcao: string | null;
  cargoNome: string;
  unidadeId: number;
  unidadeNome: string;
  ativo: boolean;
  trocarSenha: boolean;
  conectado: boolean;
  dono: boolean;
  ultimoAcessoEm: string | null;
  criadoEm: string;
}

/** Tudo sobre um usuário (ficha aberta pela lista). */
export interface FichaUsuario {
  dados: {
    id: number;
    login: string;
    nome: string;
    funcao: string | null;
    cargoNome: string;
    unidadeNome: string;
    unidadeTipo: string;
    ativo: boolean;
    trocarSenha: boolean;
    dono: boolean;
    criadoEm: string;
    atualizadoEm: string;
    criadoPorNome: string | null;
    ultimoAcessoEm: string | null;
  };
  sessoes: { abertas: number; ultimaEntrada: string | null; expiraEm: string | null };
  trabalho: {
    projetosCoordenados: number;
    etapas: number;
    etapasAbertas: number;
    tarefas: number;
    tarefasAbertas: number;
    mensagensChat: number;
    arquivosEnviados: number;
    arquivosBytes: number;
  };
  atividade: {
    acoesTotal: number;
    acoesUltimos30Dias: number;
    ultimaAcaoEm: string | null;
    porModulo: { modulo: string; quantidade: number }[];
    ultimasAcoes: { id: number; modulo: string; acao: string; descricao: string; unidadeNome: string; criadoEm: string }[];
  };
}

/** Empresa (unidade raiz) cadastrada pelo dono, com o administrador criado junto. */
export interface EmpresaSistema {
  id: number;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  criadoEm: string;
  administradorId: number | null;
  administradorLogin: string | null;
  administradorNome: string | null;
  unidades: number;
  usuarios: number;
  usuariosAtivos: number;
}

export interface RequisicaoNovaEmpresa {
  nome: string;
  cnpj: string;
  administradorNome: string;
  login: string;
  senha: string;
  trocarSenha: boolean;
}
