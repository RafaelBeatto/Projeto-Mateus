/** Códigos de permissão (tabela acesso.permissao no back; os mesmos do db/projetos-mamore.sql). */
export const PERMISSOES = {
  GESTAO_PROJETO_LER: 'GESTAO_PROJETO_LER',
  GESTAO_PROJETO_ESCREVER: 'GESTAO_PROJETO_ESCREVER',
  EMPRESA_LER: 'EMPRESA_LER',
  EMPRESA_ESCREVER: 'EMPRESA_ESCREVER',
  HISTORICO_LER: 'HISTORICO_LER',
  USUARIO_LER: 'USUARIO_LER',
  USUARIO_ESCREVER: 'USUARIO_ESCREVER',
  UNIDADE_LER: 'UNIDADE_LER',
  UNIDADE_ESCREVER: 'UNIDADE_ESCREVER',
  PERMISSAO_LER: 'PERMISSAO_LER',
  PERMISSAO_ESCREVER: 'PERMISSAO_ESCREVER',
  INSTITUICAO_ESCREVER: 'INSTITUICAO_ESCREVER',
  /** Fora da matriz: o back só dá ao login do dono (PROJETOS_DONO_LOGINS). */
  DONO_SISTEMA: 'DONO_SISTEMA',
} as const;

export type CodigoPermissao = (typeof PERMISSOES)[keyof typeof PERMISSOES];

/** Nome amigável dos módulos da matriz de permissões (só os módulos atuais; ver db/projetos-mamore.sql). */
export const ROTULO_MODULO: Record<string, string> = {
  GESTAO_PROJETOS: 'Gestão de Projetos',
  EMPRESAS: 'Contratantes',
  HISTORICO: 'Histórico',
  USUARIOS: 'Usuários',
  UNIDADES: 'Unidades',
  PERMISSOES: 'Permissões',
};
