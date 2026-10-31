import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconHierarchy, IconLayoutKanban, IconListCheck, IconPlus } from '@tabler/icons-react';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import BlankCard from 'src/components/shared/BlankCard';
import ColunaKanban, { RolagemQuadro } from 'src/components/apps/kanban/ColunaKanban';
import BotaoFlutuante from 'src/components/compartilhados/BotaoFlutuante';
import { useCelular } from 'src/hooks/useCelular';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { BotaoFiltros, PainelFiltros } from 'src/components/compartilhados/Filtros';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { Coordenador, Etapa, StatusEtapa, StatusTarefaEtapa } from 'src/types/gestaoProjetos';
import { ROTULO_STATUS_ETAPA, ROTULO_STATUS_TAREFA_ETAPA } from 'src/types/gestaoProjetos';
import { diasAte } from 'src/utils/datas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData, iniciais, normalizar } from 'src/utils/formatacao';
import { progressoTarefasEtapa } from 'src/utils/gestaoProjetos';
import FormularioEtapa from './FormularioEtapa';
import MapaRamificacoes from './MapaRamificacoes';

const COLUNAS: StatusEtapa[] = ['EM_ESPERA', 'EM_PAUSA', 'EM_ANDAMENTO', 'CONCLUIDO'];
const COR_COLUNA: Record<StatusEtapa, string> = {
  EM_ESPERA: 'primary.light',
  EM_PAUSA: 'warning.light',
  EM_ANDAMENTO: 'secondary.light',
  CONCLUIDO: 'success.light',
};
/** Filtro de responsável: '' = todos, 'sem' = sem responsável, ou o id do usuário. */
const SEM_RESPONSAVEL = 'sem';

/** situacao: coluna da etapa; status: etapas com alguma tarefa pendente nesse status ('' = todos). */
const FILTRO_VAZIO = { busca: '', responsavel: '', situacao: '', status: '' };

/** Cartões = Kanban por situação; ramificação = mapa com o projeto e as etapas saindo umas das outras. */
type ModoVisao = 'cartoes' | 'ramificacao';
/** Último modo escolhido, lembrado neste navegador. */
const CHAVE_MODO = 'gestaoProjetos.modoEtapas';

const modoSalvo = (): ModoVisao => {
  try {
    return localStorage.getItem(CHAVE_MODO) === 'ramificacao' ? 'ramificacao' : 'cartoes';
  } catch {
    return 'cartoes';
  }
};

interface Props {
  projetoId: number;
  /** Nome no nó central do mapa de ramificações. */
  nomeProjeto: string;
  pessoas: Coordenador[];
  podeAlterar: boolean;
  /** Abre a etapa em tela cheia. */
  aoAbrir: (e: Etapa) => void;
  /** Avisa a lista atual sempre que ela muda (ex.: progresso no cabeçalho do projeto). */
  aoMudarEtapas?: (lista: Etapa[]) => void;
}

/**
 * Kanban de etapas do projeto: arrastar muda a situação; o clique abre a etapa.
 * No celular: colunas e cartões compactos (segurar o cartão para arrastar) e "Nova etapa" flutuante.
 */
const QuadroEtapas = ({ projetoId, nomeProjeto, pessoas, podeAlterar, aoAbrir, aoMudarEtapas }: Props) => {
  const { notificar, confirmar } = useInteracao();
  const { dados, carregando, erro, definirDados } = useConsulta(
    () => servicoGestaoProjetos.etapas(projetoId),
    [projetoId],
  );
  useEffect(() => {
    if (dados) aoMudarEtapas?.(dados);
  }, [dados, aoMudarEtapas]);
  const celular = useCelular();
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const temFiltro = Object.values(filtro).some(Boolean);
  const [modo, setModo] = useState<ModoVisao>(modoSalvo);
  const trocarModo = (novo: ModoVisao | null) => {
    if (!novo) return;
    setModo(novo);
    try {
      localStorage.setItem(CHAVE_MODO, novo);
    } catch {
      // Sem armazenamento (ex.: janela anônima): vale só até sair da tela.
    }
  };
  const [formulario, setFormulario] = useState<{ aberto: boolean; etapa: Etapa | null }>({
    aberto: false,
    etapa: null,
  });

  const substituir = (e: Etapa) =>
    definirDados((lista) => [...(lista ?? []).filter((x) => x.id !== e.id), e]);

  const q = normalizar(filtro.busca);
  const visiveis = (dados ?? []).filter(
    (e) =>
      (!q ||
        normalizar(
          `${e.titulo} ${e.descricao ?? ''} ${e.responsavel?.nomeCompleto ?? ''}`,
        ).includes(q)) &&
      (!filtro.responsavel ||
        (filtro.responsavel === SEM_RESPONSAVEL
          ? !e.responsavel
          : String(e.responsavel?.id) === filtro.responsavel)) &&
      (!filtro.situacao || e.status === filtro.situacao) &&
      (!filtro.status || e.tarefas.some((t) => t.status === filtro.status)),
  );
  const responsaveis = [
    ...new Map(
      (dados ?? []).filter((e) => e.responsavel).map((e) => [e.responsavel!.id, e.responsavel!]),
    ).values(),
  ].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));

  const mover = async (e: Etapa, destino: StatusEtapa) => {
    if (e.status === destino) return;
    substituir({ ...e, status: destino });
    try {
      substituir(await servicoGestaoProjetos.alterarStatusEtapa(projetoId, e.id, destino));
      notificar(ROTULO_STATUS_ETAPA[destino]);
    } catch (x) {
      substituir(e);
      notificar(mensagemDeErro(x), 'error');
    }
  };

  const aoSoltar = ({ draggableId, destination, source }: DropResult) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const e = visiveis.find((x) => `etapa-${x.id}` === draggableId);
    if (e) mover(e, destination.droppableId as StatusEtapa);
  };

  const excluir = async (e: Etapa) => {
    if (
      !(await confirmar(`Excluir a etapa "${e.titulo}"?`, {
        rotuloConfirmar: 'Excluir',
        perigo: true,
      }))
    )
      return;
    try {
      await servicoGestaoProjetos.excluirEtapa(projetoId, e.id);
      definirDados((lista) => (lista ?? []).filter((x) => x.id !== e.id));
      notificar('Etapa excluída.');
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    }
  };

  const cartoesDa = (coluna: StatusEtapa) =>
    visiveis
      .filter((e) => e.status === coluna)
      .sort(
        (a, b) =>
          (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') ||
          a.titulo.localeCompare(b.titulo, 'pt-BR'),
      );

  const cartao = (e: Etapa) => {
    const atrasada = e.prazo && e.status !== 'CONCLUIDO' && diasAte(e.prazo) < 0;
    const tarefas = progressoTarefasEtapa(e);
    return (
      <BlankCard>
        <Box p={celular ? 1.25 : 2}>
          <Stack direction="row" alignItems="flex-start" spacing={celular ? 0.5 : 1}>
            <Box flexGrow={1} minWidth={0} onClick={() => aoAbrir(e)} sx={{ cursor: 'pointer' }}>
              <Typography
                variant={celular ? 'subtitle2' : 'subtitle1'}
                fontWeight={600}
                lineHeight={1.3}
                sx={{ overflowWrap: 'anywhere' }}
              >
                {e.titulo}
              </Typography>
              {e.descricao && !celular ? (
                <Typography
                  variant="caption"
                  color="textSecondary"
                  display="block"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {e.descricao.length > 100 ? `${e.descricao.slice(0, 100)}…` : e.descricao}
                </Typography>
              ) : null}
            </Box>
            {podeAlterar ? (
              <MenuAcoes
                rotulo={`Ações de ${e.titulo}`}
                acoes={[
                  { rotulo: 'Abrir', aoClicar: () => aoAbrir(e) },
                  {
                    rotulo: 'Editar',
                    aoClicar: () => setFormulario({ aberto: true, etapa: e }),
                  },
                  ...COLUNAS.filter((c) => c !== e.status).map((c) => ({
                    rotulo: `Mover para ${ROTULO_STATUS_ETAPA[c]}`,
                    aoClicar: () => mover(e, c),
                  })),
                  {
                    rotulo: 'Excluir',
                    perigo: true,
                    aoClicar: () => excluir(e),
                  },
                ]}
              />
            ) : null}
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            mt={1}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {e.prazo ? (
                <Chip
                  size="small"
                  color={atrasada ? 'error' : 'default'}
                  label={
                    celular ? formatarData(e.prazo).slice(0, 5) : `até ${formatarData(e.prazo)}`
                  }
                  aria-label={`Prazo até ${formatarData(e.prazo)}`}
                />
              ) : null}
              {tarefas.total ? (
                <Chip
                  size="small"
                  variant="outlined"
                  color={tarefas.feitas === tarefas.total ? 'success' : 'default'}
                  icon={<IconListCheck size={14} />}
                  label={`${tarefas.feitas}/${tarefas.total}`}
                  aria-label={`${tarefas.feitas} de ${tarefas.total} tarefas concluídas`}
                />
              ) : null}
            </Stack>
            {e.responsavel ? (
              <Tooltip title={e.responsavel.nomeCompleto}>
                <Avatar
                  sx={{
                    width: celular ? 22 : 28,
                    height: celular ? 22 : 28,
                    fontSize: celular ? 10 : 12,
                    bgcolor: 'primary.main',
                  }}
                >
                  {iniciais(e.responsavel.nomeCompleto)}
                </Avatar>
              </Tooltip>
            ) : null}
          </Stack>
        </Box>
      </BlankCard>
    );
  };

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        mb={2}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <BotaoFiltros
            aberto={filtrosAbertos}
            ativo={temFiltro}
            aoAlternar={() => setFiltrosAbertos((v) => !v)}
            rotulo="Filtros das etapas"
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={modo}
            onChange={(_, v) => trocarModo(v)}
            aria-label="Modo de observação das etapas"
          >
            <ToggleButton value="cartoes" aria-label="Cartões">
              <IconLayoutKanban size={18} />
              {celular ? null : <Box ml={0.75}>Cartões</Box>}
            </ToggleButton>
            <ToggleButton value="ramificacao" aria-label="Ramificação">
              <IconHierarchy size={18} />
              {celular ? null : <Box ml={0.75}>Ramificação</Box>}
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {podeAlterar && celular && modo === 'cartoes' ? (
          <BotaoFlutuante
            rotulo="Nova etapa"
            aoClicar={() => setFormulario({ aberto: true, etapa: null })}
          />
        ) : null}
        {podeAlterar && !celular && modo === 'cartoes' ? (
          <Button
            variant="contained"
            startIcon={<IconPlus size={16} />}
            onClick={() => setFormulario({ aberto: true, etapa: null })}
            sx={{ flexShrink: 0 }}
          >
            Nova etapa
          </Button>
        ) : null}
      </Stack>
      <PainelFiltros aberto={filtrosAbertos}>
        <TextField
          type="search"
          size="small"
          placeholder="Buscar etapa…"
          value={filtro.busca}
          onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          inputProps={{ 'aria-label': 'Buscar etapa' }}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          select
          size="small"
          value={filtro.responsavel}
          onChange={(e) => setFiltro({ ...filtro, responsavel: e.target.value })}
          sx={{ minWidth: 220 }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Responsável' }}
        >
          <MenuItem value="">Todos os responsáveis</MenuItem>
          {responsaveis.map((r) => (
            <MenuItem key={r.id} value={String(r.id)}>
              {r.nomeCompleto}
            </MenuItem>
          ))}
          <MenuItem value={SEM_RESPONSAVEL}>Sem responsável</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          value={filtro.situacao}
          onChange={(e) => setFiltro({ ...filtro, situacao: e.target.value })}
          sx={{ minWidth: 180 }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Situação da etapa' }}
        >
          <MenuItem value="">Todas as situações</MenuItem>
          {COLUNAS.map((s) => (
            <MenuItem key={s} value={s}>
              {ROTULO_STATUS_ETAPA[s]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          value={filtro.status}
          onChange={(e) => setFiltro({ ...filtro, status: e.target.value })}
          sx={{ minWidth: 200 }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Status das tarefas' }}
        >
          <MenuItem value="">Todos os status</MenuItem>
          {(Object.keys(ROTULO_STATUS_TAREFA_ETAPA) as StatusTarefaEtapa[]).map((s) => (
            <MenuItem key={s} value={s}>
              Tarefa {ROTULO_STATUS_TAREFA_ETAPA[s].toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
        {temFiltro ? (
          <Button variant="text" onClick={() => setFiltro(FILTRO_VAZIO)} sx={{ flexShrink: 0 }}>
            Limpar filtros
          </Button>
        ) : null}
      </PainelFiltros>

      {carregando && !dados ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {dados && modo === 'ramificacao' ? (
        <MapaRamificacoes
          projetoId={projetoId}
          nomeProjeto={nomeProjeto}
          etapas={dados}
          destacadas={temFiltro ? new Set(visiveis.map((e) => e.id)) : null}
          compacto={celular}
          aoAbrir={aoAbrir}
        />
      ) : null}
      {dados && modo === 'cartoes' ? (
        <DragDropContext onDragEnd={aoSoltar}>
          <RolagemQuadro compacto={celular}>
            {COLUNAS.map((coluna) => {
              const cartoes = cartoesDa(coluna);
              return (
                <ColunaKanban
                  key={coluna}
                  id={coluna}
                  titulo={ROTULO_STATUS_ETAPA[coluna]}
                  quantidade={cartoes.length}
                  corFundo={COR_COLUNA[coluna]}
                  compacto={celular}
                >
                  {cartoes.map((e, indice) => (
                    <Draggable
                      key={e.id}
                      draggableId={`etapa-${e.id}`}
                      index={indice}
                      isDragDisabled={!podeAlterar}
                    >
                      {(arrastavel) => (
                        <Box
                          ref={arrastavel.innerRef}
                          {...arrastavel.draggableProps}
                          {...arrastavel.dragHandleProps}
                          mb={celular ? 1 : 2}
                        >
                          {cartao(e)}
                        </Box>
                      )}
                    </Draggable>
                  ))}
                </ColunaKanban>
              );
            })}
          </RolagemQuadro>
        </DragDropContext>
      ) : null}
      {dados && !dados.length && modo === 'cartoes' ? (
        <Typography color="textSecondary" textAlign="center" mt={2}>
          Nenhuma etapa ainda.
          {podeAlterar ? ' Use "Nova etapa".' : ''}
        </Typography>
      ) : null}

      <FormularioEtapa
        aberto={formulario.aberto}
        projetoId={projetoId}
        etapa={formulario.etapa}
        etapas={dados ?? []}
        pessoas={pessoas}
        aoFechar={() => setFormulario({ aberto: false, etapa: null })}
        aoSalvar={(e) => {
          substituir(e);
          notificar(formulario.etapa ? 'Etapa atualizada.' : 'Etapa criada.');
        }}
      />
    </>
  );
};

export default QuadroEtapas;
