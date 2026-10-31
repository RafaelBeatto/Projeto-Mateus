import { ReactNode } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoAdministracaoSistema } from 'src/servicos/administracaoSistema';
import { formatarDataHora, ROTULO_TIPO_UNIDADE } from 'src/utils/formatacao';
import { ROTULO_ACAO_HISTORICO, ROTULO_MODULO_HISTORICO } from 'src/utils/historico';
import type { TipoUnidade } from 'src/types/acesso';
import { tamanhoEmBytes } from './formatacaoAdministracao';

const numero = new Intl.NumberFormat('pt-BR');

const Secao = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <Box mt={3}>
    <Typography variant="h6" mb={1.5}>
      {titulo}
    </Typography>
    {children}
  </Box>
);

const Campo = ({ rotulo, valor }: { rotulo: string; valor: ReactNode }) => (
  <Grid item xs={12} sm={6}>
    <Typography variant="body2" color="textSecondary">
      {rotulo}
    </Typography>
    <Typography fontWeight={500}>{valor ?? '—'}</Typography>
  </Grid>
);

const Numero = ({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe?: string }) => (
  <Grid item xs={6} sm={4}>
    <Box border={1} borderColor="divider" borderRadius={2} p={1.5} height="100%">
      <Typography variant="body2" color="textSecondary">
        {rotulo}
      </Typography>
      <Typography variant="h4" mt={0.5}>
        {numero.format(valor)}
      </Typography>
      {detalhe ? (
        <Typography variant="caption" color="textSecondary">
          {detalhe}
        </Typography>
      ) : null}
    </Box>
  </Grid>
);

const Conteudo = ({ usuarioId }: { usuarioId: number }) => {
  const { dados: ficha, erro } = useConsulta(() => servicoAdministracaoSistema.ficha(usuarioId), [usuarioId]);

  if (erro) return <Alert severity="error">{erro}</Alert>;
  if (!ficha) return <LinearProgress />;
  const { dados: d, sessoes: s, trabalho: t, atividade: a } = ficha;
  const maiorModulo = Math.max(1, ...a.porModulo.map((m) => m.quantidade));

  return (
    <>
      <Typography variant="h4">{d.nome}</Typography>
      <Typography color="textSecondary">
        {d.login}
        {d.funcao ? ` · ${d.funcao}` : ''}
      </Typography>
      <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={d.ativo ? 'Ativo' : 'Desativado'} color={d.ativo ? 'success' : 'default'} />
        {s.abertas > 0 ? <Chip size="small" color="primary" label="Conectado agora" /> : null}
        {d.trocarSenha ? <Chip size="small" color="warning" label="Senha provisória" /> : null}
        {d.dono ? <Chip size="small" color="secondary" label="Dono do sistema" /> : null}
      </Stack>

      <Secao titulo="Cadastro">
        <Grid container spacing={2}>
          <Campo rotulo="Unidade" valor={d.unidadeNome} />
          <Campo rotulo="Nível da unidade" valor={ROTULO_TIPO_UNIDADE[d.unidadeTipo as TipoUnidade] ?? d.unidadeTipo} />
          <Campo rotulo="Cargo" valor={d.cargoNome} />
          <Campo rotulo="Função" valor={d.funcao} />
          <Campo rotulo="Cadastrado em" valor={formatarDataHora(d.criadoEm)} />
          <Campo rotulo="Cadastrado por" valor={d.criadoPorNome} />
          <Campo rotulo="Última alteração" valor={formatarDataHora(d.atualizadoEm)} />
          <Campo rotulo="Último acesso" valor={formatarDataHora(d.ultimoAcessoEm)} />
        </Grid>
      </Secao>

      <Secao titulo="Sessões">
        <Grid container spacing={2}>
          <Campo rotulo="Aparelhos conectados" valor={numero.format(s.abertas)} />
          <Campo rotulo="Entrou por último em" valor={formatarDataHora(s.ultimaEntrada)} />
          <Campo rotulo="Sessão vale até" valor={formatarDataHora(s.expiraEm)} />
        </Grid>
      </Secao>

      <Secao titulo="Trabalho na Gestão de Projetos">
        <Grid container spacing={2}>
          <Numero rotulo="Projetos que coordena" valor={t.projetosCoordenados} />
          <Numero rotulo="Etapas responsável" valor={t.etapas} detalhe={`${numero.format(t.etapasAbertas)} em aberto`} />
          <Numero rotulo="Tarefas responsável" valor={t.tarefas} detalhe={`${numero.format(t.tarefasAbertas)} em aberto`} />
          <Numero rotulo="Mensagens no chat" valor={t.mensagensChat} />
          <Numero rotulo="Arquivos enviados" valor={t.arquivosEnviados} detalhe={tamanhoEmBytes(t.arquivosBytes)} />
        </Grid>
      </Secao>

      <Secao titulo="Atividade">
        <Grid container spacing={2}>
          <Numero rotulo="Ações registradas" valor={a.acoesTotal} />
          <Numero rotulo="Nos últimos 30 dias" valor={a.acoesUltimos30Dias} />
          <Grid item xs={12} sm={4}>
            <Box border={1} borderColor="divider" borderRadius={2} p={1.5} height="100%">
              <Typography variant="body2" color="textSecondary">
                Última ação
              </Typography>
              <Typography fontWeight={600} mt={0.5}>
                {formatarDataHora(a.ultimaAcaoEm)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {a.porModulo.length ? (
          <Stack spacing={1} mt={2}>
            {a.porModulo.map((m) => (
              <Box key={m.modulo}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">{ROTULO_MODULO_HISTORICO[m.modulo] ?? m.modulo}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {numero.format(m.quantidade)}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={(m.quantidade / maiorModulo) * 100} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            ))}
          </Stack>
        ) : null}
      </Secao>

      <Secao titulo="Últimas ações">
        {a.ultimasAcoes.length ? (
          <Stack divider={<Divider flexItem />} spacing={1.25}>
            {a.ultimasAcoes.map((acao) => (
              <Box key={acao.id}>
                <Typography variant="body2">{acao.descricao}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatarDataHora(acao.criadoEm)} · {ROTULO_MODULO_HISTORICO[acao.modulo] ?? acao.modulo} ·{' '}
                  {ROTULO_ACAO_HISTORICO[acao.acao] ?? acao.acao} · {acao.unidadeNome}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography color="textSecondary">Nenhuma ação registrada.</Typography>
        )}
      </Secao>
    </>
  );
};

/** Painel lateral com tudo sobre um usuário de qualquer unidade. */
const FichaUsuario = ({ usuarioId, aoFechar }: { usuarioId: number | null; aoFechar: () => void }) => (
  <Drawer anchor="right" open={usuarioId !== null} onClose={aoFechar} PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="overline" color="textSecondary">
          Ficha do usuário
        </Typography>
        <IconButton aria-label="Fechar ficha" onClick={aoFechar}>
          <IconX size={20} />
        </IconButton>
      </Stack>
      {usuarioId !== null ? <Conteudo usuarioId={usuarioId} /> : null}
    </Box>
  </Drawer>
);

export default FichaUsuario;
