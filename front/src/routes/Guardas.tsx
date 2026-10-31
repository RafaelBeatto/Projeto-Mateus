import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'src/store/Store';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES, type CodigoPermissao } from 'src/constantes/permissoes';
import Spinner from 'src/views/spinner/Spinner';
import { MODULOS } from './modulos';

export const CAMINHO_ADMINISTRACAO = '/admin';

/**
 * Exige login; quem precisa trocar a senha só acessa a tela de troca.
 * O dono do sistema (login em APAE_DONO_LOGINS no back) tem uma área só dele, separada do sistema:
 * ao entrar vai direto para ela e não abre as telas do sistema; os demais nem sabem que ela existe.
 */
export function RotaAutenticada({
  children,
  trocaDeSenha = false,
  area = 'sistema',
}: {
  children: ReactElement;
  trocaDeSenha?: boolean;
  area?: 'sistema' | 'administracao';
}) {
  const { usuario, iniciado } = useSelector((s) => s.autenticacao);
  const local = useLocation();
  if (!iniciado) return <Spinner />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  if (usuario.trocarSenha && !trocaDeSenha) return <Navigate to="/trocar-senha" replace />;
  if (trocaDeSenha) return children;
  const dono = usuario.permissoes.includes(PERMISSOES.DONO_SISTEMA);
  if (area === 'sistema' && dono) return <Navigate to={CAMINHO_ADMINISTRACAO} replace />;
  if (area === 'administracao' && !dono) return <Navigate to="/" replace />;
  return children;
}

/** Só para quem não está logado (tela de entrar). */
export function RotaPublica({ children }: { children: ReactElement }) {
  const { usuario, iniciado } = useSelector((s) => s.autenticacao);
  if (!iniciado) return <Spinner />;
  return usuario ? <Navigate to="/" replace /> : children;
}

/** Abre o primeiro módulo do menu que a pessoa pode ver (o sistema não tem mais o Painel). */
export function PaginaInicial() {
  const { tem } = usePermissao();
  const primeiro = MODULOS.find((m) => !m.oculto && (!m.permissao || tem(m.permissao)));
  return <Navigate to={primeiro?.caminho ?? '/configuracoes'} replace />;
}

/** Exige a permissão do módulo; sem ela, mostra a página de acesso negado. */
export function RotaPermissao({ permissao, children }: { permissao?: CodigoPermissao; children: ReactElement }) {
  const { tem } = usePermissao();
  if (permissao && !tem(permissao)) return <Navigate to="/acesso-negado" replace />;
  return children;
}
