import { ReactNode, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  LinearProgress,
  Link,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconArchive,
  IconArchiveOff,
  IconArrowLeft,
  IconBuilding,
  IconEdit,
  IconFileText,
  IconHistory,
  IconListCheck,
  IconTrash,
} from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import { useCelular } from 'src/hooks/useCelular';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import { ROTULO_PRIORIDADE } from 'src/types/comum';
import type { Etapa, GestaoProjeto } from 'src/types/gestaoProjetos';
import { ROTULO_STATUS_GESTAO_PROJETO } from 'src/types/gestaoProjetos';
import { formatarData, formatarDataHora } from 'src/utils/formatacao';
import { progressoDoProjeto, valorTotalDoProjeto } from 'src/utils/gestaoProjetos';
import { formatarMoeda } from 'src/utils/projetos';
import ChatProjeto from './ChatProjeto';
import QuadroEtapas from './QuadroEtapas';
import TelaEtapa from './TelaEtapa';

type Aba = 'etapas' | 'chat' | 'dados';

const Info = ({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Typography variant="caption" color="textSecondary">
      {rotulo}
    </Typography>
    <Typography variant="body1" sx={{ overflowWrap: 'anywhere' }}>
      {valor || '—'}
    </Typography>
  </Grid>
);

/** Cartão de destaque do cabeçalho: ícone colorido, rótulo e valor em evidência. */
const Destaque = ({
  cor,
  icone,
  rotulo,
  valor,
  detalhe,
  rodape,
}: {
  cor: 'primary' | 'success';
  icone: ReactNode;
  rotulo: string;
  valor: string;
  detalhe?: string;
  /** Conteúdo extra abaixo do valor (ex.: barra de progresso). */
  rodape?: ReactNode;
}) => (
  <Grid item xs={12} sm={6} md={4}>
    <Stack
      direction="row"
      spacing={{ xs: 1.5, sm: 2 }}
      alignItems="center"
      sx={{ p: { xs: 1.5, sm: 2 }, height: '100%', borderRadius: 2, bgcolor: `${cor}.light` }}
    >
      <Box
        sx={{
          width: { xs: 40, sm: 48 },
          height: { xs: 40, sm: 48 },
          borderRadius: 2,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${cor}.main`,
          color: `${cor}.contrastText`,
        }}
      >
        {icone}
      </Box>
      <Box minWidth={0} flexGrow={1}>
        <Typography variant="subtitle2" color="textSecondary">
          {rotulo}
        </Typography>
        <Typography
          variant="h4"
          color={`${cor}.main`}
          sx={{ overflowWrap: 'anywhere', fontSize: { xs: '1.1rem', sm: undefined } }}
        >
          {valor}
        </Typography>
        {detalhe ? (
          <Typography variant="caption" color="textSecondary">
            {detalhe}
          </Typography>
        ) : null}
        {rodape}
      </Box>
    </Stack>
  </Grid>
);

interface Props {
  projeto: GestaoProjeto;
  podeAlterar: boolean;
  aoVoltar: () => void;
  aoEditar: () => void;
  /** Arquiva o projeto ativo ou desarquiva o arquivado; sem ele, o botão não aparece. */
  aoArquivar?: () => void;
  /** Só para projeto na lixeira: botão "Restaurar" no aviso do topo. */
  aoRestaurar?: () => void;
}

/**
 * Projeto aberto em tela cheia: cabeçalho com nome e cartões de destaque (processo, progresso das etapas, contratante); abre na aba Etapas.
 * Arquivado ou na lixeira: aviso no topo e o caminho de volta é "Arquivados" ou "Lixeira".
 */
const TelaProjeto = ({
  projeto: p,
  podeAlterar,
  aoVoltar,
  aoEditar,
  aoArquivar,
  aoRestaurar,
}: Props) => {
  const arquivado = !!p.arquivadoEm;
  const naLixeira = !!p.excluidoEm;
  const [aba, setAba] = useState<Aba>('etapas');
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const { dados: pessoas } = useConsulta(servicoGestaoProjetos.coordenadoresDisponiveis);
  const valorTotal = valorTotalDoProjeto(p);
  const celular = useCelular();
  // Começa com a contagem do projeto e acompanha o quadro de etapas enquanto ele está aberto.
  const [etapas, setEtapas] = useState({
    etapasTotal: p.etapasTotal,
    etapasConcluidas: p.etapasConcluidas,
  });
  const contarEtapas = useCallback(
    (lista: Etapa[]) =>
      setEtapas({
        etapasTotal: lista.length,
        etapasConcluidas: lista.filter((e) => e.status === 'CONCLUIDO').length,
      }),
    [],
  );
  const progresso = progressoDoProjeto(etapas);

  // ...&etapa=ID abre a etapa em tela cheia (clique no cartão; o voltar do navegador volta ao quadro).
  const [parametros, setParametros] = useSearchParams();
  const etapaAberta = Number(parametros.get('etapa')) || null;
  const abrirEtapa = (e: Etapa) => setParametros({ projeto: String(p.id), etapa: String(e.id) });
  const fecharEtapa = useCallback(
    () => setParametros({ projeto: String(p.id) }, { replace: true }),
    [p.id, setParametros],
  );

  if (etapaAberta) {
    return (
      <TelaEtapa
        projeto={p}
        etapaId={etapaAberta}
        pessoas={pessoas ?? []}
        podeAlterar={podeAlterar}
        aoVoltar={fecharEtapa}
        aoVoltarInicio={aoVoltar}
      />
    );
  }

  return (
    <>
      {celular ? (
        <Button
          variant="text"
          color="inherit"
          startIcon={<IconArrowLeft size={18} />}
          onClick={aoVoltar}
          sx={{ mb: 1, ml: -1 }}
        >
          {naLixeira ? 'Lixeira' : arquivado ? 'Arquivados' : 'Projetos'}
        </Button>
      ) : (
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link component="button" underline="hover" onClick={aoVoltar}>
            {naLixeira ? 'Lixeira' : arquivado ? 'Arquivados' : 'Gestão de Projetos'}
          </Link>
          <Typography color="textPrimary">{p.nome}</Typography>
        </Breadcrumbs>
      )}

      {naLixeira ? (
        <Alert
          severity="warning"
          icon={<IconTrash size={20} />}
          sx={{ mb: 2 }}
          action={
            aoRestaurar ? (
              <Button color="inherit" size="small" onClick={aoRestaurar}>
                Restaurar
              </Button>
            ) : undefined
          }
        >
          Projeto na lixeira desde {formatarDataHora(p.excluidoEm)}. Ele fica só para consulta;
          restaure para voltar {arquivado ? 'aos Arquivados' : 'ao Kanban'}.
        </Alert>
      ) : arquivado ? (
        <Alert severity="info" icon={<IconArchive size={20} />} sx={{ mb: 2 }}>
          Projeto arquivado em {formatarDataHora(p.arquivadoEm)}. Ele fica só para consulta;
          desarquive para voltar ao Kanban e fazer alterações.
        </Alert>
      ) : null}

      <BlankCard>
        <Box p={{ xs: 2, sm: 3 }}>
          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
            <Box minWidth={0}>
              <Typography variant="overline" color="textSecondary">
                Projeto
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  overflowWrap: 'anywhere',
                  lineHeight: 1.25,
                  fontSize: { xs: '1.35rem', sm: undefined },
                }}
              >
                {p.nome}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexShrink={0}>
              {aoArquivar && celular ? (
                <IconButton
                  aria-label={arquivado ? 'Desarquivar projeto' : 'Arquivar projeto'}
                  onClick={aoArquivar}
                >
                  {arquivado ? <IconArchiveOff size={20} /> : <IconArchive size={20} />}
                </IconButton>
              ) : null}
              {aoArquivar && !celular ? (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={arquivado ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
                  onClick={aoArquivar}
                >
                  {arquivado ? 'Desarquivar' : 'Arquivar'}
                </Button>
              ) : null}
              {podeAlterar && celular ? (
                <IconButton aria-label="Editar projeto" onClick={aoEditar}>
                  <IconEdit size={20} />
                </IconButton>
              ) : null}
              {podeAlterar && !celular ? (
                <Button variant="outlined" startIcon={<IconEdit size={16} />} onClick={aoEditar}>
                  Editar
                </Button>
              ) : null}
            </Stack>
          </Stack>
          <Grid container spacing={{ xs: 1.5, sm: 2 }} mt={{ xs: 0, sm: 1 }}>
            <Destaque
              cor="primary"
              icone={<IconFileText size={24} />}
              rotulo="Processo"
              valor={p.processo || '—'}
            />
            <Destaque
              cor="success"
              icone={<IconListCheck size={24} />}
              rotulo="Etapas concluídas"
              valor={
                etapas.etapasTotal ? `${etapas.etapasConcluidas} de ${etapas.etapasTotal}` : '—'
              }
              detalhe={etapas.etapasTotal ? `${progresso}% do projeto` : 'Nenhuma etapa cadastrada'}
              rodape={
                etapas.etapasTotal ? (
                  <LinearProgress
                    variant="determinate"
                    value={progresso}
                    color={progresso === 100 ? 'success' : 'primary'}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    aria-label={`Progresso das etapas: ${progresso}%`}
                  />
                ) : null
              }
            />
            <Destaque
              cor="primary"
              icone={<IconBuilding size={24} />}
              rotulo="Contratante"
              valor={p.contratante || '—'}
              detalhe={p.contratanteCidade || undefined}
            />
          </Grid>
        </Box>
        <Tabs
          value={aba}
          onChange={(_, v) => setAba(v)}
          variant={celular ? 'fullWidth' : 'scrollable'}
          sx={{ px: { xs: 0, sm: 2 }, borderTop: 1, borderColor: 'divider' }}
        >
          <Tab value="etapas" label="Etapas" />
          <Tab value="chat" label="Chat" />
          <Tab value="dados" label={celular ? 'Dados' : 'Dados do projeto'} />
        </Tabs>
      </BlankCard>

      <Box mt={{ xs: 2, sm: 3 }}>
        {aba === 'etapas' ? (
          <QuadroEtapas
            projetoId={p.id}
            nomeProjeto={p.nome}
            pessoas={pessoas ?? []}
            podeAlterar={podeAlterar}
            aoAbrir={abrirEtapa}
            aoMudarEtapas={contarEtapas}
          />
        ) : null}
        {aba === 'chat' ? <ChatProjeto projetoId={p.id} /> : null}
        {aba === 'dados' ? (
          <BlankCard>
            <Box p={{ xs: 2, sm: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Identificação</Typography>
                <Tooltip title="Histórico">
                  <IconButton
                    size="small"
                    aria-label="Ver histórico"
                    onClick={() => setHistoricoAberto(true)}
                  >
                    <IconHistory size={18} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Info rotulo="Nome do projeto" valor={p.nome} />
                <Info rotulo="Processo" valor={p.processo} />
                <Info rotulo="Contratante" valor={p.contratante} />
                <Info rotulo="Cidade do contratante" valor={p.contratanteCidade} />
              </Grid>
              <Typography variant="h6" mt={3} mb={2}>
                Andamento
              </Typography>
              <Grid container spacing={2}>
                <Info rotulo="Status" valor={ROTULO_STATUS_GESTAO_PROJETO[p.status]} />
                <Info
                  rotulo="Prioridade"
                  valor={p.prioridade ? ROTULO_PRIORIDADE[p.prioridade] : 'Nada'}
                />
                <Info
                  rotulo="Período"
                  valor={`${formatarData(p.dataInicio)}${p.dataFim ? ` a ${formatarData(p.dataFim)}` : ''}`}
                />
              </Grid>
              <Typography variant="h6" mt={3} mb={2}>
                Coordenação
              </Typography>
              <Grid container spacing={2}>
                <Info
                  rotulo="Coordenadores"
                  valor={p.coordenadores.map((c) => c.nomeCompleto).join(', ')}
                />
              </Grid>
              <Typography variant="h6" mt={3} mb={2}>
                Convênio
              </Typography>
              <Grid container spacing={2}>
                <Info rotulo="Origem do convênio" valor={p.convenioOrigem} />
                <Info rotulo="Número do convênio" valor={p.convenioNumero} />
                <Info
                  rotulo="Valor do convênio"
                  valor={p.valorConvenio != null ? formatarMoeda(p.valorConvenio) : null}
                />
                <Info
                  rotulo="Contrapartida"
                  valor={p.contrapartida != null ? formatarMoeda(p.contrapartida) : null}
                />
                <Info
                  rotulo="Valor total"
                  valor={valorTotal != null ? formatarMoeda(valorTotal) : null}
                />
                <Info rotulo="Origem do recurso (político / emenda)" valor={p.origemRecurso} />
              </Grid>
            </Box>
          </BlankCard>
        ) : null}
      </Box>

      <Dialog open={historicoAberto} onClose={() => setHistoricoAberto(false)} fullScreen>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          px={2}
          py={1.5}
          borderBottom={1}
          borderColor="divider"
        >
          <IconButton aria-label="Voltar ao projeto" onClick={() => setHistoricoAberto(false)}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Typography variant="h6" noWrap>
            {p.nome}
          </Typography>
        </Stack>
        <DialogContent>
          <Box maxWidth={800} mx="auto" mt={-3}>
            <HistoricoDoRegistro
              carregar={() => servicoGestaoProjetos.historico(p.id)}
              versao={p.atualizadoEm}
              comFiltros
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TelaProjeto;
