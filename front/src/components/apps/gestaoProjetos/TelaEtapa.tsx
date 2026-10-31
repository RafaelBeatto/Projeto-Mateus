import { ReactNode, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { IconArrowLeft, IconListCheck } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import { useCelular } from 'src/hooks/useCelular';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { Coordenador, Etapa, GestaoProjeto, StatusEtapa } from 'src/types/gestaoProjetos';
import { ROTULO_STATUS_ETAPA } from 'src/types/gestaoProjetos';
import { diasAte } from 'src/utils/datas';
import { formatarData, formatarDataHora, iniciais } from 'src/utils/formatacao';
import { progressoTarefasEtapa } from 'src/utils/gestaoProjetos';
import ChecklistEtapa from './ChecklistEtapa';

const COR_STATUS: Record<StatusEtapa, 'primary' | 'warning' | 'secondary' | 'success'> = {
  EM_ESPERA: 'primary',
  EM_PAUSA: 'warning',
  EM_ANDAMENTO: 'secondary',
  CONCLUIDO: 'success',
};

const Info = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <Grid item xs={6} md={3}>
    <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>
      {rotulo}
    </Typography>
    {children}
  </Grid>
);

interface Props {
  projeto: GestaoProjeto;
  etapaId: number;
  pessoas: Coordenador[];
  podeAlterar: boolean;
  /** Volta para o Kanban de etapas do projeto. */
  aoVoltar: () => void;
  /** Volta para o Kanban de projetos. */
  aoVoltarInicio: () => void;
}

/** Etapa aberta em tela cheia: dados da etapa (só leitura) e a lista de tarefas, onde se trabalha. */
const TelaEtapa = ({ projeto, etapaId, pessoas, podeAlterar, aoVoltar, aoVoltarInicio }: Props) => {
  const { dados, carregando, erro, definirDados } = useConsulta(
    () => servicoGestaoProjetos.etapas(projeto.id),
    [projeto.id],
  );
  const etapa = dados?.find((x) => x.id === etapaId) ?? null;
  const celular = useCelular();

  useEffect(() => {
    // Etapa inexistente (excluída, outro projeto): volta para o quadro do projeto.
    if (dados && !etapa) aoVoltar();
  }, [dados, etapa, aoVoltar]);

  const substituir = (e: Etapa) =>
    definirDados((lista) => [...(lista ?? []).filter((x) => x.id !== e.id), e]);

  const caminho = celular ? (
    <Button
      variant="text"
      color="inherit"
      startIcon={<IconArrowLeft size={18} />}
      onClick={aoVoltar}
      sx={{ mb: 1, ml: -1, maxWidth: '100%', justifyContent: 'flex-start' }}
    >
      <Box
        component="span"
        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {projeto.nome}
      </Box>
    </Button>
  ) : (
    <Breadcrumbs sx={{ mb: 2 }}>
      <Link component="button" underline="hover" onClick={aoVoltarInicio}>
        Gestão de Projetos
      </Link>
      <Link component="button" underline="hover" onClick={aoVoltar}>
        {projeto.nome}
      </Link>
      <Typography color="textPrimary">{etapa?.titulo ?? 'Etapa'}</Typography>
    </Breadcrumbs>
  );

  if (!etapa) {
    return (
      <>
        {caminho}
        {carregando ? <LinearProgress /> : null}
        {erro ? <Alert severity="error">{erro}</Alert> : null}
      </>
    );
  }

  const prog = progressoTarefasEtapa(etapa);
  const atrasada = etapa.prazo && etapa.status !== 'CONCLUIDO' && diasAte(etapa.prazo) < 0;

  return (
    <>
      {caminho}

      <BlankCard>
        <Box p={{ xs: 2, sm: 3 }}>
          {/* Só mostra os dados da etapa: ela é editada (e muda de situação) no Kanban de etapas do projeto. */}
          <Box minWidth={0}>
            <Typography variant="overline" color="textSecondary">
              Etapa · {projeto.nome}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                overflowWrap: 'anywhere',
                lineHeight: 1.25,
                fontSize: { xs: '1.35rem', sm: undefined },
              }}
            >
              {etapa.titulo}
            </Typography>
          </Box>

          <Grid container spacing={2} mt={1}>
            <Info rotulo="Situação">
              <Chip color={COR_STATUS[etapa.status]} label={ROTULO_STATUS_ETAPA[etapa.status]} />
            </Info>
            <Info rotulo="Responsável">
              {etapa.responsavel ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}>
                    {iniciais(etapa.responsavel.nomeCompleto)}
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography variant="body1" sx={{ overflowWrap: 'anywhere' }}>
                      {etapa.responsavel.nomeCompleto}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {etapa.responsavel.cargoNome}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography>—</Typography>
              )}
            </Info>
            <Info rotulo="Prazo">
              {etapa.prazo ? (
                <Chip
                  color={atrasada ? 'error' : 'default'}
                  label={`${formatarData(etapa.prazo)}${atrasada ? ' · atrasada' : ''}`}
                />
              ) : (
                <Typography>—</Typography>
              )}
            </Info>
            <Info rotulo="Tarefas">
              <Stack direction="row" spacing={1} alignItems="center">
                <IconListCheck size={20} />
                <Typography
                  variant="h5"
                  color={prog.total && prog.feitas === prog.total ? 'success.main' : 'textPrimary'}
                >
                  {prog.feitas}/{prog.total}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  concluídas
                </Typography>
              </Stack>
            </Info>
          </Grid>
        </Box>
      </BlankCard>

      <Grid container spacing={{ xs: 2, sm: 3 }} mt={0}>
        <Grid item xs={12} md={8}>
          <BlankCard>
            <Box p={{ xs: 2, sm: 3 }}>
              <ChecklistEtapa
                projetoId={projeto.id}
                etapa={etapa}
                pessoas={pessoas}
                podeAlterar={podeAlterar}
                aoAlterar={substituir}
                etapasDoProjeto={dados ?? []}
              />
            </Box>
          </BlankCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <BlankCard>
            <Box p={{ xs: 2, sm: 3 }}>
              <Typography variant="h5" mb={2}>
                Descrição
              </Typography>
              <Typography
                color={etapa.descricao ? 'textPrimary' : 'textSecondary'}
                sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {etapa.descricao || 'Sem descrição.'}
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" mt={3}>
                Criada em {formatarDataHora(etapa.criadoEm)} · atualizada em{' '}
                {formatarDataHora(etapa.atualizadoEm)}
              </Typography>
            </Box>
          </BlankCard>
        </Grid>
      </Grid>
    </>
  );
};

export default TelaEtapa;
