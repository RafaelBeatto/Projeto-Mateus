import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconLink, IconLock, IconPlus } from '@tabler/icons-react';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { BotaoFiltros, PainelFiltros } from 'src/components/compartilhados/Filtros';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { Coordenador, Etapa, StatusTarefaEtapa, TarefaEtapa } from 'src/types/gestaoProjetos';
import { ROTULO_STATUS_TAREFA_ETAPA } from 'src/types/gestaoProjetos';
import { diasAte } from 'src/utils/datas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData, iniciais, normalizar } from 'src/utils/formatacao';
import { dependenciasDaTarefa, progressoTarefasEtapa } from 'src/utils/gestaoProjetos';
import BotaoFlutuante from 'src/components/compartilhados/BotaoFlutuante';
import { useCelular } from 'src/hooks/useCelular';
import FormularioTarefaEtapa from './FormularioTarefaEtapa';

const COR_STATUS: Record<StatusTarefaEtapa, 'default' | 'warning' | 'primary' | 'success'> = {
  EM_ESPERA: 'default',
  EM_PAUSA: 'warning',
  EM_ANDAMENTO: 'primary',
  CONCLUIDA: 'success',
};
/** Filtro de responsável: '' = todos, 'sem' = sem responsável, ou o id do usuário. */
const SEM_RESPONSAVEL = 'sem';
/** Filtro de status: '' = todos, um StatusTarefaEtapa ou 'ATRASADA'. */
const ATRASADA = 'ATRASADA';
const FILTRO_VAZIO = { busca: '', responsavel: '', status: '' };

interface Props {
  projetoId: number;
  etapa: Etapa;
  /** Usuários ativos que podem ser responsáveis. */
  pessoas: Coordenador[];
  podeAlterar: boolean;
  aoAlterar: (e: Etapa) => void;
  /** Todas as etapas do projeto (com as tarefas): dependências podem ser de qualquer uma. */
  etapasDoProjeto: Etapa[];
}

/**
 * Lista de tarefas da etapa: criadas/editadas pelo modal (nome, data, responsável, dependências);
 * marcar como feita salva na hora e fica travado enquanto houver dependência pendente.
 */
const ChecklistEtapa = ({
  projetoId,
  etapa,
  pessoas,
  podeAlterar,
  aoAlterar,
  etapasDoProjeto,
}: Props) => {
  const { notificar, confirmar } = useInteracao();
  const [ocupado, setOcupado] = useState(false);
  const [formulario, setFormulario] = useState<{ aberto: boolean; tarefa: TarefaEtapa | null }>({
    aberto: false,
    tarefa: null,
  });
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const temFiltro = Object.values(filtro).some(Boolean);
  const prog = progressoTarefasEtapa(etapa);
  const celular = useCelular();

  const q = normalizar(filtro.busca);
  const visiveis = etapa.tarefas.filter(
    (t) =>
      (!q || normalizar(`${t.texto} ${t.responsavel?.nomeCompleto ?? ''}`).includes(q)) &&
      (!filtro.responsavel ||
        (filtro.responsavel === SEM_RESPONSAVEL
          ? !t.responsavel
          : String(t.responsavel?.id) === filtro.responsavel)) &&
      (!filtro.status ||
        (filtro.status === ATRASADA
          ? !t.feita && !!t.prazo && diasAte(t.prazo) < 0
          : t.status === filtro.status)),
  );
  const responsaveis = [
    ...new Map(
      etapa.tarefas.filter((t) => t.responsavel).map((t) => [t.responsavel!.id, t.responsavel!]),
    ).values(),
  ].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));

  const executar = async (acao: () => Promise<Etapa>, sucesso?: string) => {
    setOcupado(true);
    try {
      aoAlterar(await acao());
      if (sucesso) notificar(sucesso);
    } catch (x) {
      notificar(mensagemDeErro(x), 'error');
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async (t: TarefaEtapa) => {
    if (
      !(await confirmar(`Excluir a tarefa "${t.texto}"?`, {
        rotuloConfirmar: 'Excluir',
        perigo: true,
      }))
    )
      return;
    executar(
      () => servicoGestaoProjetos.removerTarefaEtapa(projetoId, etapa.id, t.id),
      'Tarefa excluída.',
    );
  };

  const editar = (t: TarefaEtapa) => setFormulario({ aberto: true, tarefa: t });

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h5">Lista de tarefas</Typography>
          {etapa.tarefas.length ? (
            <BotaoFiltros
              aberto={filtrosAbertos}
              ativo={temFiltro}
              aoAlternar={() => setFiltrosAbertos((v) => !v)}
              rotulo="Filtros das tarefas"
            />
          ) : null}
        </Stack>
        {podeAlterar && celular ? (
          <BotaoFlutuante
            rotulo="Nova tarefa"
            aoClicar={() => setFormulario({ aberto: true, tarefa: null })}
          />
        ) : null}
        {podeAlterar && !celular ? (
          <Button
            variant="contained"
            startIcon={<IconPlus size={16} />}
            onClick={() => setFormulario({ aberto: true, tarefa: null })}
            sx={{ flexShrink: 0 }}
          >
            Nova tarefa
          </Button>
        ) : null}
      </Stack>

      {prog.total ? (
        <Box mb={2}>
          <Typography variant="caption" color="textSecondary">
            {prog.feitas}/{prog.total} concluídas · {prog.pct}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={prog.pct}
            color="success"
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      ) : (
        <Typography variant="body2" color="textSecondary">
          Nenhuma tarefa ainda.{podeAlterar ? ' Use "Nova tarefa" para criar a primeira.' : ''}
        </Typography>
      )}

      {etapa.tarefas.length ? (
        <PainelFiltros aberto={filtrosAbertos}>
          <TextField
            type="search"
            size="small"
            placeholder="Buscar tarefa…"
            value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
            inputProps={{ 'aria-label': 'Buscar tarefa' }}
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
            value={filtro.status}
            onChange={(e) => setFiltro({ ...filtro, status: e.target.value })}
            sx={{ minWidth: 180 }}
            SelectProps={{ displayEmpty: true }}
            inputProps={{ 'aria-label': 'Status da tarefa' }}
          >
            <MenuItem value="">Todos os status</MenuItem>
            {(Object.keys(ROTULO_STATUS_TAREFA_ETAPA) as StatusTarefaEtapa[]).map((s) => (
              <MenuItem key={s} value={s}>
                {ROTULO_STATUS_TAREFA_ETAPA[s]}
              </MenuItem>
            ))}
            <MenuItem value={ATRASADA}>Atrasada</MenuItem>
          </TextField>
          {temFiltro ? (
            <Button variant="text" onClick={() => setFiltro(FILTRO_VAZIO)} sx={{ flexShrink: 0 }}>
              Limpar filtros
            </Button>
          ) : null}
        </PainelFiltros>
      ) : null}

      {temFiltro && !visiveis.length ? (
        <Typography variant="body2" color="textSecondary">
          Nenhuma tarefa com esses filtros.
        </Typography>
      ) : null}

      {visiveis.map((t) => {
        const atrasada = t.prazo && !t.feita && diasAte(t.prazo) < 0;
        const dependencias = dependenciasDaTarefa(t, etapa.id, etapasDoProjeto);
        // Só pode ser concluída depois das que ela depende (desmarcar continua livre).
        const aguardando = t.feita ? [] : dependencias.filter((d) => !d.concluida);
        return (
          <Stack
            key={t.id}
            direction="row"
            alignItems="center"
            spacing={1}
            py={1}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tooltip
              title={
                aguardando.length
                  ? `Conclua antes: ${aguardando.map((d) => d.rotulo).join(', ')}`
                  : ''
              }
            >
              <span>
                <Checkbox
                  checked={t.feita}
                  disabled={!podeAlterar || ocupado || aguardando.length > 0}
                  onChange={(ev) =>
                    executar(() =>
                      servicoGestaoProjetos.marcarTarefaEtapa(
                        projetoId,
                        etapa.id,
                        t.id,
                        ev.target.checked,
                      ),
                    )
                  }
                  inputProps={{ 'aria-label': t.texto }}
                />
              </span>
            </Tooltip>
            <Box
              flexGrow={1}
              minWidth={0}
              onClick={podeAlterar ? () => editar(t) : undefined}
              sx={{ cursor: podeAlterar ? 'pointer' : 'default' }}
            >
              <Typography
                fontWeight={500}
                color={t.feita ? 'textSecondary' : 'textPrimary'}
                sx={{ textDecoration: t.feita ? 'line-through' : 'none', overflowWrap: 'anywhere' }}
              >
                {t.texto}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                mt={0.5}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                {/* Tarefa feita já diz tudo: o status só aparece enquanto está pendente. */}
                {t.feita ? null : (
                  <Chip
                    size="small"
                    variant="outlined"
                    color={COR_STATUS[t.status]}
                    label={ROTULO_STATUS_TAREFA_ETAPA[t.status]}
                  />
                )}
                {t.prazo ? (
                  <Chip
                    size="small"
                    color={atrasada ? 'error' : 'default'}
                    label={`${formatarData(t.prazo)}${atrasada ? ' · atrasada' : ''}`}
                  />
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    Sem data
                  </Typography>
                )}
                {t.responsavel ? (
                  <Tooltip title={t.responsavel.cargoNome}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'primary.main' }}>
                        {iniciais(t.responsavel.nomeCompleto)}
                      </Avatar>
                      <Typography variant="caption">{t.responsavel.nomeCompleto}</Typography>
                    </Stack>
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    Sem responsável
                  </Typography>
                )}
                {dependencias.length ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {aguardando.length ? <IconLock size={14} /> : <IconLink size={14} />}
                    <Typography
                      variant="caption"
                      color={aguardando.length ? 'warning.main' : 'textSecondary'}
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      Depende de {dependencias.map((d) => d.rotulo).join(', ')}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
            {podeAlterar ? (
              <MenuAcoes
                rotulo={`Ações de ${t.texto}`}
                acoes={[
                  { rotulo: 'Editar', aoClicar: () => editar(t) },
                  { rotulo: 'Excluir', perigo: true, aoClicar: () => excluir(t) },
                ]}
              />
            ) : null}
          </Stack>
        );
      })}

      <FormularioTarefaEtapa
        aberto={formulario.aberto}
        projetoId={projetoId}
        etapaId={etapa.id}
        tarefa={formulario.tarefa}
        etapas={etapasDoProjeto}
        pessoas={pessoas}
        aoFechar={() => setFormulario({ aberto: false, tarefa: null })}
        aoSalvar={(e) => {
          aoAlterar(e);
          notificar(formulario.tarefa ? 'Tarefa atualizada.' : 'Tarefa criada.');
        }}
      />
    </>
  );
};

export default ChecklistEtapa;
