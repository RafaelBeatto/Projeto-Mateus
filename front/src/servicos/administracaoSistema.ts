import api from 'src/utils/axios';
import type { Pagina } from 'src/types/acesso';
import type {
  EmpresaSistema,
  FichaUsuario,
  FiltroSituacao,
  PainelSistema,
  RequisicaoNovaEmpresa,
  SessaoAtiva,
  UsuarioSistema,
} from 'src/types/administracaoSistema';

/** Rotas só do dono do sistema (o back recusa qualquer outro usuário). */
export const servicoAdministracaoSistema = {
  painel: () => api.get<PainelSistema>('/administracao-sistema/painel').then((r) => r.data),
  sessoes: () => api.get<SessaoAtiva[]>('/administracao-sistema/sessoes').then((r) => r.data),
  encerrarSessoes: (usuarioId: number) => api.delete(`/administracao-sistema/sessoes/${usuarioId}`),
  encerrarTodasAsSessoes: () =>
    api.delete<{ encerradas: number }>('/administracao-sistema/sessoes').then((r) => r.data.encerradas),
  empresas: () => api.get<EmpresaSistema[]>('/administracao-sistema/empresas').then((r) => r.data),
  criarEmpresa: (requisicao: RequisicaoNovaEmpresa) =>
    api.post<EmpresaSistema>('/administracao-sistema/empresas', requisicao).then((r) => r.data),
  alterarSituacaoEmpresa: (id: number, ativo: boolean) => api.patch(`/administracao-sistema/empresas/${id}/situacao`, { ativo }),
  usuarios: (busca: string, situacao: FiltroSituacao, pagina: number, tamanho: number) =>
    api
      .get<Pagina<UsuarioSistema>>('/administracao-sistema/usuarios', {
        params: { busca: busca || undefined, situacao, page: pagina, size: tamanho },
      })
      .then((r) => r.data),
  ficha: (id: number) => api.get<FichaUsuario>(`/administracao-sistema/usuarios/${id}`).then((r) => r.data),
  alterarSituacao: (id: number, ativo: boolean) => api.patch(`/administracao-sistema/usuarios/${id}/situacao`, { ativo }),
  redefinirSenha: (id: number, senhaProvisoria: string) =>
    api.put(`/administracao-sistema/usuarios/${id}/senha`, { senhaProvisoria }),
};
