import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { IconBriefcase, IconCalendarEvent, IconListCheck, IconStack2 } from '@tabler/icons-react';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import Pagina from 'src/components/container/Pagina';
import BlankCard from 'src/components/shared/BlankCard';
import ColunaKanban, { RolagemQuadro } from 'src/components/apps/kanban/ColunaKanban';
import { BotaoFiltros, PainelFiltros } from 'src/components/compartilhados/Filtros';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useCelular } from 'src/hooks/useCelular';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { Etapa, GestaoProjeto } from 'src/types/gestaoProjetos';
import { diasAte } from 'src/utils/datas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData, normalizar } from 'src/utils/formatacao';
import { textoDeBuscaDoProjeto } from 'src/utils/gestaoProjetos';
import {
  ColunaGeral,
  COLUNAS_GERAL,
  COR_COLUNA_GERAL,
  destinoDoItem,
  ItemGeral,
  montarItens,
  ROTULO_COLUNA_GERAL,
  ROTULO_TIPO_ITEM,
  STATUS_ETAPA_NA_COLUNA,
  STATUS_PROJETO_NA_COLUNA,
  STATUS_TAREFA_NA_COLUNA,
  TipoItemGeral,
} from 'src/utils/kanbanGeral';

const ICONE_TIPO: Record<TipoItemGeral, typeof IconBriefcase> = {
  PROJETO: IconBriefcase,
  ETAPA: IconStack2,
  TAREFA: IconListCheck,
};
const COR_TIPO: Record<TipoItemGeral, 'primary' | 'secondary' | 'default'> = {
  PROJETO: 'primary',
  ETAPA: 'secondary',
  TAREFA: 'default',
};
const TODOS_OS_TIPOS: TipoItemGeral[] = ['PROJETO', 'ETAPA', 'TAREFA'];
const FILTRO_VAZIO = { busca: '', projeto: '', pessoa: '' };

/** Com prazo primeiro (o mais próximo antes); depois projeto, etapa, tarefa; depois pelo nome. */
const ordenar = (a: ItemGeral, b: ItemGeral) =>
  (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') ||
  TODOS_OS_TIPOS.indexOf(a.tipo) - TODOS_OS_TIPOS.indexOf(b.tipo) ||
  a.titulo.localeCompare(b.titulo, 'pt-BR');

/**
 * Kanban geral da Gestão de Projetos: todos os projetos ativos, suas etapas e tarefas num quadro só.
 * Arrastar muda o status do item (tarefa em "Concluído" = feita); o clique abre o projeto ou a etapa.
 */
const KanbanGeral = () => {
  const navegar = useNavigate();
  const { notificar } = useInteracao();
  const { podeAlterar } = usePermissao();
  const alterar = podeAlterar(PERMISSOES.GESTAO_PROJETO_ESCREVER);
  const celular = useCelular();
  const projetos = useConsulta(servicoGestaoProjetos.listar);
  const etapas = useConsulta(servicoGestaoProjetos.etapasDosAtivos);
  const [tipos, setTipos] = useState<TipoItemGeral[]>(TODOS_OS_TIPOS);
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const itens = useMemo(
    () => montarItens(projetos.dados ?? [], etapas.dados ?? []),
    [projetos.dados, etapas.dados],
  );
  const pessoas = [...new Map(itens.flatMap((i) => i.pessoas).map((p) => [p.id, p])).values()].sort(
    (a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'),
  );

  const q = normalizar(filtro.busca);
  const visiveis = itens.filter(
    (i) =>
      tipos.includes(i.tipo) &&
      (!q ||
        normalizar(
          `${i.titulo} ${i.etapa?.titulo ?? ''} ${textoDeBuscaDoProjeto(i.projeto)} ${i.pessoas.map((p) => p.nomeCompleto).join(' ')}`,
        ).includes(q)) &&
      (!filtro.projeto || String(i.projeto.id) === filtro.projeto) &&
      (!filtro.pessoa || i.pessoas.some((p) => String(p.id) === filtro.pessoa)),
  );
  const temFiltro = Object.values(filtro).some(Boolean) || tipos.length < TODOS_OS_TIPOS.length;

  const trocarProjeto = (p: GestaoProjeto) =>
    projetos.definirDados((lista) => (lista ?? []).map((x) => (x.id === p.id ? p : x)));
  const trocarEtapa = (e: Etapa) =>
    etapas.definirDados((lista) => (lista ?? []).map((x) => (x.id === e.id ? e : x)));

  /** Muda no back o status equivalente à coluna de destino e atualiza o quadro com a resposta. */
  const mover = async (i: ItemGeral, destino: ColunaGeral) => {
    if (i.coluna === destino) return;
    try {
      if (i.tipo === 'PROJETO') {
        trocarProjeto(
          await servicoGestaoProjetos.alterarStatus(
            i.projeto.id,
            STATUS_PROJETO_NA_COLUNA[destino],
          ),
        );
      } else if (i.tipo === 'ETAPA') {
        trocarEtapa(
          await servicoGestaoProjetos.alterarStatusEtapa(
            i.projeto.id,
            i.etapa!.id,
            STATUS_ETAPA_NA_COLUNA[destino],
          ),
        );
      } else {
        const t = i.tarefa!;
        const status = STATUS_TAREFA_NA_COLUNA[destino];
        // Concluída marca a tarefa como feita (e confere as dependências) no próprio back.
        trocarEtapa(
          await servicoGestaoProjetos.atualizarTarefaEtapa(i.projeto.id, i.etapa!.id, t.id, {
            texto: t.texto,
            status,
            prazo: t.prazo ?? '',
            responsavelId: t.responsavel?.id ?? '',
            dependencias: t.dependencias,
            dependenciasEtapas: t.dependenciasEtapas,
          }),
        );
      }
      notificar(
        `${ROTULO_TIPO_ITEM[i.tipo]} ${i.tipo === 'PROJETO' ? 'movido' : 'movida'} para ${ROTULO_COLUNA_GERAL[destino]}.`,
      );
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    }
  };

  const aoSoltar = ({ draggableId, destination, source }: DropResult) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const i = visiveis.find((x) => x.chave === draggableId);
    if (i) mover(i, destination.droppableId as ColunaGeral);
  };

  const cartao = (i: ItemGeral) => {
    const Icone = ICONE_TIPO[i.tipo];
    const atrasado = i.prazo && i.coluna !== 'FIM' && diasAte(i.prazo) < 0;
    return (
      <BlankCard>
        <Box
          p={celular ? 1.25 : 2}
          onClick={() => navegar(destinoDoItem(i))}
          sx={{ cursor: 'pointer' }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            mb={0.75}
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              size="small"
              color={COR_TIPO[i.tipo]}
              icon={<Icone size={14} />}
              label={ROTULO_TIPO_ITEM[i.tipo]}
            />
            <Chip size="small" variant="outlined" label={i.rotuloStatus} />
          </Stack>
          <Typography
            variant={celular ? 'subtitle2' : 'subtitle1'}
            fontWeight={600}
            lineHeight={1.3}
            sx={{
              overflowWrap: 'anywhere',
              textDecoration: i.tarefa?.feita ? 'line-through' : undefined,
            }}
          >
            {i.titulo}
          </Typography>
          {i.tipo !== 'PROJETO' ? (
            <Typography
              variant="caption"
              color="textSecondary"
              display="block"
              sx={{ overflowWrap: 'anywhere' }}
            >
              {i.projeto.nome}
              {i.tipo === 'TAREFA' ? ` › ${i.etapa!.titulo}` : ''}
            </Typography>
          ) : null}
          {i.prazo || i.pessoas.length ? (
            <Stack
              direction="row"
              spacing={1}
              mt={1}
              alignItems="center"
              justifyContent="space-between"
            >
              {i.prazo ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconCalendarEvent size={14} />
                  <Typography
                    variant="caption"
                    color={atrasado ? 'error.main' : 'textSecondary'}
                    fontWeight={atrasado ? 600 : 400}
                  >
                    {formatarData(i.prazo)}
                  </Typography>
                </Stack>
              ) : (
                <span />
              )}
              {i.pessoas.length ? (
                <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: '60%' }}>
                  {i.pessoas.map((p) => p.nomeCompleto.split(' ')[0]).join(', ')}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      </BlankCard>
    );
  };

  const carregando =
    (projetos.carregando && !projetos.dados) || (etapas.carregando && !etapas.dados);
  const erro = projetos.erro ?? etapas.erro;
  const pronto = projetos.dados && etapas.dados;

  return (
    <Pagina>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
        <BotaoFiltros
          aberto={filtrosAbertos}
          ativo={temFiltro}
          aoAlternar={() => setFiltrosAbertos((v) => !v)}
          rotulo="Filtros do Kanban"
        />
        <ToggleButtonGroup
          size="small"
          value={tipos}
          onChange={(_, v: TipoItemGeral[]) => v.length && setTipos(v)}
          aria-label="Tipos no quadro"
        >
          {TODOS_OS_TIPOS.map((t) => (
            <ToggleButton key={t} value={t} sx={{ textTransform: 'none', px: 1.5 }}>
              {ROTULO_TIPO_ITEM[t]}s
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      <PainelFiltros aberto={filtrosAbertos}>
        <TextField
          type="search"
          size="small"
          placeholder="Buscar projeto, etapa, tarefa, pessoa…"
          value={filtro.busca}
          onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          inputProps={{ 'aria-label': 'Buscar no Kanban' }}
          sx={{ flexGrow: 1, minWidth: { sm: 260 } }}
        />
        <TextField
          select
          size="small"
          value={filtro.projeto}
          onChange={(e) => setFiltro({ ...filtro, projeto: e.target.value })}
          sx={{ minWidth: 220 }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Projeto' }}
        >
          <MenuItem value="">Todos os projetos</MenuItem>
          {(projetos.dados ?? []).map((p) => (
            <MenuItem key={p.id} value={String(p.id)}>
              {p.nome}
            </MenuItem>
          ))}
        </TextField>
        {pessoas.length ? (
          <TextField
            select
            size="small"
            value={filtro.pessoa}
            onChange={(e) => setFiltro({ ...filtro, pessoa: e.target.value })}
            sx={{ minWidth: 200 }}
            SelectProps={{ displayEmpty: true }}
            inputProps={{ 'aria-label': 'Pessoa' }}
          >
            <MenuItem value="">Todas as pessoas</MenuItem>
            {pessoas.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.nomeCompleto}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {temFiltro ? (
          <Button
            variant="text"
            onClick={() => {
              setFiltro(FILTRO_VAZIO);
              setTipos(TODOS_OS_TIPOS);
            }}
            sx={{ flexShrink: 0 }}
          >
            Limpar filtros
          </Button>
        ) : null}
      </PainelFiltros>

      {carregando ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {pronto ? (
        <DragDropContext onDragEnd={aoSoltar}>
          <RolagemQuadro compacto={celular}>
            {COLUNAS_GERAL.map((coluna) => {
              const cartoes = visiveis.filter((i) => i.coluna === coluna).sort(ordenar);
              return (
                <ColunaKanban
                  key={coluna}
                  id={coluna}
                  titulo={ROTULO_COLUNA_GERAL[coluna]}
                  quantidade={cartoes.length}
                  corFundo={COR_COLUNA_GERAL[coluna]}
                  compacto={celular}
                >
                  {cartoes.map((i, indice) => (
                    <Draggable
                      key={i.chave}
                      draggableId={i.chave}
                      index={indice}
                      isDragDisabled={!alterar}
                    >
                      {(arrastavel) => (
                        <Box
                          ref={arrastavel.innerRef}
                          {...arrastavel.draggableProps}
                          {...arrastavel.dragHandleProps}
                          mb={celular ? 1 : 2}
                        >
                          {cartao(i)}
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
      {pronto && !itens.length ? (
        <Typography color="textSecondary" textAlign="center" mt={2}>
          Nenhum projeto ativo ainda. Crie projetos, etapas e tarefas na Gestão de Projetos: eles
          aparecem aqui.
        </Typography>
      ) : null}
      {pronto && itens.length > 0 && !visiveis.length ? (
        <Typography color="textSecondary" textAlign="center" mt={2}>
          Nada com esses filtros.
        </Typography>
      ) : null}
    </Pagina>
  );
};

export default KanbanGeral;
