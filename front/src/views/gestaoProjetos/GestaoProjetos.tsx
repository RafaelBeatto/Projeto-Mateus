import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import Pagina from 'src/components/container/Pagina';
import ColunaKanban, { RolagemQuadro } from 'src/components/apps/kanban/ColunaKanban';
import BotaoFlutuante from 'src/components/compartilhados/BotaoFlutuante';
import { useCelular } from 'src/hooks/useCelular';
import FormularioGestaoProjeto from 'src/components/apps/gestaoProjetos/FormularioGestaoProjeto';
import TelaProjeto from 'src/components/apps/gestaoProjetos/TelaProjeto';
import CartaoGestaoProjeto from 'src/components/apps/gestaoProjetos/CartaoGestaoProjeto';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { BotaoFiltros, PainelFiltros } from 'src/components/compartilhados/Filtros';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoEmpresas } from 'src/servicos/empresas';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { Empresa } from 'src/types/empresas';
import { PESO_PRIORIDADE, Prioridade, ROTULO_PRIORIDADE } from 'src/types/comum';
import {
  GestaoProjeto,
  ROTULO_STATUS_GESTAO_PROJETO,
  StatusGestaoProjeto,
} from 'src/types/gestaoProjetos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { normalizar } from 'src/utils/formatacao';
import { textoDeBuscaDoProjeto } from 'src/utils/gestaoProjetos';

const COLUNAS: StatusGestaoProjeto[] = ['EM_ESPERA', 'EM_PAUSA', 'EM_ANDAMENTO', 'EM_ANALISE'];
const COR_COLUNA: Record<StatusGestaoProjeto, string> = {
  EM_ESPERA: 'primary.light',
  EM_PAUSA: 'warning.light',
  EM_ANDAMENTO: 'secondary.light',
  EM_ANALISE: 'success.light',
};

/** Valores distintos, não vazios, em ordem alfabética (opções dos filtros). */
const distintos = (valores: (string | null)[]) =>
  [...new Set(valores.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'pt-BR'));

/** Nome de contratante igual, sem diferenciar maiúscula nem espaço nas pontas. */
const mesmoNome = (a: string | null, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase();

interface OpcaoContratante {
  nome: string;
  cidade: string;
  projetos: number;
}

/**
 * Opções do filtro de contratante: os cadastrados em Contratantes e, se houver, os nomes antigos
 * que só existem nos projetos. Cada um com a cidade e quantos projetos do quadro tem.
 */
function opcoesContratante(cadastrados: Empresa[], projetos: GestaoProjeto[]): OpcaoContratante[] {
  const contar = (nome: string) => projetos.filter((p) => mesmoNome(p.contratante, nome)).length;
  const lista: OpcaoContratante[] = cadastrados.map((e) => ({
    nome: e.razaoSocial,
    cidade: [e.municipio, e.uf].filter(Boolean).join('/'),
    projetos: contar(e.razaoSocial),
  }));
  projetos.forEach(({ contratante, contratanteCidade }) => {
    if (contratante && !lista.some((o) => mesmoNome(o.nome, contratante))) {
      lista.push({ nome: contratante, cidade: contratanteCidade ?? '', projetos: contar(contratante) });
    }
  });
  // Primeiro os que têm projeto no quadro; depois pelo nome.
  return lista.sort((a, b) => Number(b.projetos > 0) - Number(a.projetos > 0) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Prioridade "Nada" (null) no filtro. */
const SEM_PRIORIDADE = 'NADA';

const FILTRO_VAZIO = {
  busca: '',
  coordenador: '',
  prioridade: '',
  contratante: '',
  origemRecurso: '',
};

/** Mais urgentes primeiro; depois pelo nome. */
const ordenar = (a: GestaoProjeto, b: GestaoProjeto) =>
  (b.prioridade ? PESO_PRIORIDADE[b.prioridade] : 0) -
    (a.prioridade ? PESO_PRIORIDADE[a.prioridade] : 0) || a.nome.localeCompare(b.nome, 'pt-BR');

/**
 * Gestão de Projetos (independente do módulo Projetos): todo projeto criado aqui
 * aparece no Kanban, começando em "Em espera". O status muda só pelo quadro.
 */
const GestaoProjetos = () => {
  const { podeAlterar } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.GESTAO_PROJETO_ESCREVER);
  const { dados, carregando, erro, definirDados, recarregar } = useConsulta(
    servicoGestaoProjetos.listar,
  );
  // Opções do filtro: os contratantes cadastrados (sem permissão, só os que estão nos projetos).
  const { dados: cadastrados } = useConsulta(servicoEmpresas.listar);
  const celular = useCelular();
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [formulario, setFormulario] = useState<{ aberto: boolean; projeto: GestaoProjeto | null }>({
    aberto: false,
    projeto: null,
  });

  // /gestao-projetos?projeto=ID abre o projeto em tela cheia (clique no cartão, Histórico, voltar do navegador).
  const [parametros, setParametros] = useSearchParams();
  const projetoPedido = Number(parametros.get('projeto')) || null;
  const aberto = projetoPedido ? (dados?.find((x) => x.id === projetoPedido) ?? null) : null;
  const abrirProjeto = (p: GestaoProjeto) => setParametros({ projeto: String(p.id) });
  // Ao voltar, recarrega: o progresso muda conforme as etapas avançam.
  const voltar = () => {
    setParametros({});
    recarregar();
  };
  const navegar = useNavigate();
  useEffect(() => {
    if (!projetoPedido || !dados || aberto) return;
    // Fora do quadro: arquivado abre em "Arquivados", na lixeira abre na "Lixeira"; se não existe (excluído, outra unidade), volta para o quadro.
    let ativo = true;
    servicoGestaoProjetos
      .detalhe(projetoPedido)
      .then((p) => {
        if (!ativo) return;
        if (p.excluidoEm) navegar(`/lixeira?projeto=${p.id}`, { replace: true });
        else if (p.arquivadoEm) navegar(`/arquivados?projeto=${p.id}`, { replace: true });
        else setParametros({}, { replace: true });
      })
      .catch(() => ativo && setParametros({}, { replace: true }));
    return () => {
      ativo = false;
    };
  }, [projetoPedido, dados, aberto, setParametros, navegar]);

  const substituir = (p: GestaoProjeto) =>
    definirDados((lista) => [...(lista ?? []).filter((x) => x.id !== p.id), p]);

  const todos = dados ?? [];
  const coordenadores = [
    ...new Map(todos.flatMap((p) => p.coordenadores).map((c) => [c.id, c])).values(),
  ].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));
  const contratantes = opcoesContratante(cadastrados ?? [], todos);
  const origensRecurso = distintos(todos.map((p) => p.origemRecurso));

  const q = normalizar(filtro.busca);
  const visiveis = todos.filter(
    (p) =>
      (!q || normalizar(textoDeBuscaDoProjeto(p)).includes(q)) &&
      (!filtro.coordenador || p.coordenadores.some((c) => String(c.id) === filtro.coordenador)) &&
      (!filtro.prioridade || (p.prioridade ?? SEM_PRIORIDADE) === filtro.prioridade) &&
      (!filtro.contratante || mesmoNome(p.contratante, filtro.contratante)) &&
      (!filtro.origemRecurso || p.origemRecurso === filtro.origemRecurso),
  );
  const temFiltro = Object.values(filtro).some(Boolean);

  const mover = async (p: GestaoProjeto, destino: StatusGestaoProjeto) => {
    if (p.status === destino) return;
    // Move na hora; se o back recusar, volta.
    substituir({ ...p, status: destino });
    try {
      substituir(await servicoGestaoProjetos.alterarStatus(p.id, destino));
      notificar(ROTULO_STATUS_GESTAO_PROJETO[destino]);
    } catch (e) {
      substituir(p);
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const aoSoltar = ({ draggableId, destination, source }: DropResult) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const p = visiveis.find((x) => `gestao-projeto-${x.id}` === draggableId);
    if (p) mover(p, destination.droppableId as StatusGestaoProjeto);
  };

  const excluir = async (p: GestaoProjeto) => {
    if (
      !(await confirmar(
        `Mover o projeto "${p.nome}" para a lixeira? Dá para restaurar depois, pela Lixeira.`,
        {
          rotuloConfirmar: 'Excluir',
          perigo: true,
        },
      ))
    )
      return;
    try {
      await servicoGestaoProjetos.excluir(p.id);
      definirDados((lista) => (lista ?? []).filter((x) => x.id !== p.id));
      notificar('Projeto movido para a lixeira.');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const arquivar = async (p: GestaoProjeto) => {
    if (
      !(await confirmar(
        `Arquivar o projeto "${p.nome}"? Ele sai do Kanban e fica em "Arquivados", só para consulta, até ser desarquivado.`,
        { rotuloConfirmar: 'Arquivar' },
      ))
    )
      return;
    try {
      await servicoGestaoProjetos.arquivar(p.id, true);
      definirDados((lista) => (lista ?? []).filter((x) => x.id !== p.id));
      if (aberto?.id === p.id) setParametros({});
      notificar('Projeto arquivado. Ele está em "Arquivados".');
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const abrir = (p: GestaoProjeto | null) => setFormulario({ aberto: true, projeto: p });

  const formularioProjeto = (
    <FormularioGestaoProjeto
      aberto={formulario.aberto}
      projeto={formulario.projeto}
      aoFechar={() => setFormulario({ aberto: false, projeto: null })}
      aoSalvar={(p) => {
        substituir(p);
        notificar(formulario.projeto ? 'Projeto atualizado.' : 'Projeto criado em "Em espera".');
      }}
    />
  );

  if (aberto) {
    return (
      <Pagina>
        <TelaProjeto
          projeto={aberto}
          podeAlterar={alterar}
          aoVoltar={voltar}
          aoEditar={() => abrir(aberto)}
          aoArquivar={alterar ? () => arquivar(aberto) : undefined}
        />
        {formularioProjeto}
      </Pagina>
    );
  }

  const cartoesDa = (coluna: StatusGestaoProjeto) =>
    visiveis.filter((p) => p.status === coluna).sort(ordenar);

  const cartao = (p: GestaoProjeto) => (
    <CartaoGestaoProjeto
      projeto={p}
      compacto={celular}
      aoAbrir={() => abrirProjeto(p)}
      acoes={[
        { rotulo: 'Abrir', aoClicar: () => abrirProjeto(p) },
        { rotulo: 'Editar', aoClicar: () => abrir(p), oculta: !alterar },
        ...COLUNAS.filter((c) => c !== p.status).map((c) => ({
          rotulo: `Mover para ${ROTULO_STATUS_GESTAO_PROJETO[c]}`,
          aoClicar: () => mover(p, c),
          oculta: !alterar,
        })),
        { rotulo: 'Arquivar', aoClicar: () => arquivar(p), oculta: !alterar },
        { rotulo: 'Excluir', perigo: true, aoClicar: () => excluir(p), oculta: !alterar },
      ]}
    />
  );

  return (
    <Pagina>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        mb={2}
      >
        <BotaoFiltros
          aberto={filtrosAbertos}
          ativo={temFiltro}
          aoAlternar={() => setFiltrosAbertos((v) => !v)}
          rotulo="Filtros dos projetos"
        />
        <Stack direction="row" spacing={1.5}>
          {alterar && celular ? (
            <BotaoFlutuante rotulo="Novo projeto" aoClicar={() => abrir(null)} />
          ) : null}
          {alterar && !celular ? (
            <Button
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={() => abrir(null)}
              sx={{ flexShrink: 0 }}
            >
              Novo projeto
            </Button>
          ) : null}
        </Stack>
      </Stack>
      <PainelFiltros aberto={filtrosAbertos}>
        <TextField
          type="search"
          size="small"
          placeholder="Buscar por nome, processo, contratante, coordenador…"
          value={filtro.busca}
          onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          inputProps={{ 'aria-label': 'Buscar projeto' }}
          sx={{ flexGrow: 1, minWidth: { sm: 280 } }}
        />
        {coordenadores.length ? (
          <TextField
            select
            size="small"
            value={filtro.coordenador}
            onChange={(e) => setFiltro({ ...filtro, coordenador: e.target.value })}
            sx={{ minWidth: 220 }}
            SelectProps={{ displayEmpty: true }}
            inputProps={{ 'aria-label': 'Coordenador' }}
          >
            <MenuItem value="">Todos os coordenadores</MenuItem>
            {coordenadores.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.nomeCompleto}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <TextField
          select
          size="small"
          value={filtro.prioridade}
          onChange={(e) => setFiltro({ ...filtro, prioridade: e.target.value })}
          sx={{ minWidth: 190 }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Prioridade' }}
        >
          <MenuItem value="">Qualquer prioridade</MenuItem>
          {(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((p) => (
            <MenuItem key={p} value={p}>
              {ROTULO_PRIORIDADE[p]}
            </MenuItem>
          ))}
          <MenuItem value={SEM_PRIORIDADE}>Nada</MenuItem>
        </TextField>
        {contratantes.length ? (
          <Autocomplete
            size="small"
            options={contratantes}
            value={contratantes.find((c) => mesmoNome(c.nome, filtro.contratante)) ?? null}
            onChange={(_, c) => setFiltro({ ...filtro, contratante: c?.nome ?? '' })}
            getOptionLabel={(c) => c.nome}
            isOptionEqualToValue={(a, b) => a.nome === b.nome}
            renderOption={(props, c) => (
              <li {...props} key={c.nome}>
                <Box minWidth={0} flexGrow={1}>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                    {c.nome}
                  </Typography>
                  {c.cidade ? (
                    <Typography variant="caption" color="textSecondary">
                      {c.cidade}
                    </Typography>
                  ) : null}
                </Box>
                <Typography variant="caption" color="textSecondary" ml={1} flexShrink={0}>
                  {c.projetos} {c.projetos === 1 ? 'projeto' : 'projetos'}
                </Typography>
              </li>
            )}
            noOptionsText="Nenhum contratante com esse nome"
            sx={{ minWidth: { xs: '100%', sm: 300 } }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Todos os contratantes"
                inputProps={{ ...params.inputProps, 'aria-label': 'Contratante' }}
              />
            )}
          />
        ) : null}
        {origensRecurso.length ? (
          <TextField
            select
            size="small"
            value={filtro.origemRecurso}
            onChange={(e) => setFiltro({ ...filtro, origemRecurso: e.target.value })}
            sx={{ minWidth: 200 }}
            SelectProps={{ displayEmpty: true }}
            inputProps={{ 'aria-label': 'Origem do recurso' }}
          >
            <MenuItem value="">Todas as origens</MenuItem>
            {origensRecurso.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {temFiltro ? (
          <Button variant="text" onClick={() => setFiltro(FILTRO_VAZIO)} sx={{ flexShrink: 0 }}>
            Limpar filtros
          </Button>
        ) : null}
      </PainelFiltros>
      {carregando && !dados ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {dados ? (
        <DragDropContext onDragEnd={aoSoltar}>
          <RolagemQuadro compacto={celular}>
            {COLUNAS.map((coluna) => {
              const cartoes = cartoesDa(coluna);
              return (
                <ColunaKanban
                  key={coluna}
                  id={coluna}
                  titulo={ROTULO_STATUS_GESTAO_PROJETO[coluna]}
                  quantidade={cartoes.length}
                  corFundo={COR_COLUNA[coluna]}
                  compacto={celular}
                >
                  {cartoes.map((p, indice) => (
                    <Draggable
                      key={p.id}
                      draggableId={`gestao-projeto-${p.id}`}
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
                          {cartao(p)}
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
      {dados && !dados.length ? (
        <Typography color="textSecondary" textAlign="center" mt={2}>
          Nenhum projeto ainda.
          {alterar ? ' Clique em "Novo projeto": ele aparece aqui, em "Em espera".' : ''}
        </Typography>
      ) : null}
      {dados && dados.length > 0 && !visiveis.length ? (
        <Typography color="textSecondary" textAlign="center" mt={2}>
          Nenhum projeto com esses filtros.
        </Typography>
      ) : null}

      {formularioProjeto}
    </Pagina>
  );
};

export default GestaoProjetos;
