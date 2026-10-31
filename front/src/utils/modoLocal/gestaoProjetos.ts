import omit from 'lodash/omit';
import type { Prioridade } from 'src/types/comum';
import { LIMITES } from 'src/constantes/limites';
import type {
  Etapa,
  GestaoProjeto,
  MensagemProjeto,
  StatusEtapa,
  StatusGestaoProjeto,
  StatusTarefaEtapa,
  TarefaEtapa,
} from 'src/types/gestaoProjetos';
import {
  ROTULO_STATUS_ETAPA,
  ROTULO_STATUS_GESTAO_PROJETO,
  ROTULO_STATUS_TAREFA_ETAPA,
} from 'src/types/gestaoProjetos';
import {
  agora,
  centavos,
  copia,
  ErroLocal,
  exigir,
  hoje,
  limpo,
  naoEncontrado,
  novoId,
  numeroOuNulo,
  regra,
  tabela,
} from './banco';
import {
  cargoDe,
  historicoDo,
  nomeCompleto,
  registrar,
  USUARIO_LOCAL_ID,
  usuarios,
  usuariosAtivos,
} from './nucleo';
import { empresas } from './empresas';
import { del, get, patch, post, put } from './rotas';

/** Gestão de Projetos (ServicoGestaoProjeto): nasce Em espera; o status só muda pelo Kanban. */
/** O progresso (etapas) é calculado na resposta, não guardado. */
interface ProjetoLocal extends Omit<
  GestaoProjeto,
  'coordenadores' | 'etapasTotal' | 'etapasConcluidas'
> {
  coordenadores: number[];
}

const projetos = tabela<ProjetoLocal>('gestaoProjetos');

const coordenador = (id: number) => {
  const u = usuarios.buscar(id);
  return u ? { id: u.id, nomeCompleto: nomeCompleto(u), cargoNome: cargoDe(u.cargoId).nome } : null;
};

function resposta(p: ProjetoLocal): GestaoProjeto {
  const doProjeto = etapas.filtrar((e) => e.projetoId === p.id);
  return copia({
    ...p,
    // Projetos gravados antes do arquivamento/lixeira não têm esses campos.
    arquivadoEm: p.arquivadoEm ?? null,
    excluidoEm: p.excluidoEm ?? null,
    coordenadores: p.coordenadores
      .map(coordenador)
      .filter(Boolean) as GestaoProjeto['coordenadores'],
    etapasTotal: doProjeto.length,
    etapasConcluidas: doProjeto.filter((e) => e.status === 'CONCLUIDO').length,
  });
}

const valorOpcional = (v: unknown, campo: string) => {
  const n = numeroOuNulo(v);
  if (n === null) return null;
  if (Number.isNaN(n) || n < 0)
    throw new ErroLocal(400, 'Confira os campos destacados.', {
      [campo]: 'O valor não pode ser negativo',
    });
  return centavos(n);
};

/**
 * Contratante: tem de estar cadastrado em Contratantes; a cidade vem do município (e UF) dele.
 * Projeto antigo com contratante fora da lista continua com ele enquanto não for trocado.
 */
function contratanteDe(nome: string | null, atual?: ProjetoLocal) {
  if (!nome) return { contratante: null, contratanteCidade: null };
  const cadastrado = empresas.todos().find((e) => e.razaoSocial.toLowerCase() === nome.toLowerCase());
  if (!cadastrado) {
    if (atual?.contratante && atual.contratante.toLowerCase() === nome.toLowerCase()) {
      return { contratante: atual.contratante, contratanteCidade: atual.contratanteCidade };
    }
    throw regra('Escolha um contratante cadastrado em Contratantes.');
  }
  const cidade = [cadastrado.municipio, cadastrado.uf].filter(Boolean).join('/');
  return { contratante: cadastrado.razaoSocial, contratanteCidade: cidade || null };
}

function dados(b: Record<string, unknown>, atual?: ProjetoLocal) {
  exigir({ nome: b.nome });
  const dataInicio = limpo(b.dataInicio) ?? hoje();
  const dataFim = limpo(b.dataFim);
  if (dataFim && dataFim < dataInicio)
    throw regra('A data de término não pode ser anterior à de início.');
  const ids = [...new Set(((b.coordenadores ?? []) as number[]).map(Number))];
  const validos = ids.every((id) => usuarios.buscar(id)?.ativo);
  if (!validos) throw regra('Escolha coordenadores ativos desta unidade.');
  return {
    nome: limpo(b.nome)!,
    processo: limpo(b.processo),
    ...contratanteDe(limpo(b.contratante), atual),
    prioridade: (limpo(b.prioridade) as Prioridade | null) ?? null,
    dataInicio,
    dataFim,
    coordenadores: ids,
    convenioOrigem: limpo(b.convenioOrigem),
    convenioNumero: limpo(b.convenioNumero),
    valorConvenio: valorOpcional(b.valorConvenio, 'valorConvenio'),
    contrapartida: valorOpcional(b.contrapartida, 'contrapartida'),
    origemRecurso: limpo(b.origemRecurso),
  };
}

/** Projeto que aceita alterações (ServicoGestaoProjeto.buscarParaEscrita): arquivado ou na lixeira, não. */
function editavel(id: number) {
  const p = projetos.obter(id, 'Projeto');
  if (p.excluidoEm) throw regra('Este projeto está na lixeira. Restaure-o para fazer alterações.');
  if (p.arquivadoEm)
    throw regra('Este projeto está arquivado. Desarquive-o para fazer alterações.');
  return p;
}

const registrarProjeto = (p: ProjetoLocal, acao: string, descricao: string) =>
  registrar('GESTAO_PROJETOS', acao, descricao, 'GESTAO_PROJETO', p.id);

// Ativos pelo nome; arquivados (?arquivados=true) do mais recente ao mais antigo. Nunca os da lixeira.
get('/gestao-projetos', ({ q }) =>
  q.arquivados === 'true'
    ? projetos
        .filtrar((p) => !!p.arquivadoEm && !p.excluidoEm)
        .sort((a, b) => b.arquivadoEm!.localeCompare(a.arquivadoEm!))
        .map(resposta)
    : projetos
        .filtrar((p) => !p.arquivadoEm && !p.excluidoEm)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map(resposta),
);

// ---------- lixeira ----------

const naLixeira = () =>
  projetos
    .filtrar((p) => !!p.excluidoEm)
    .sort((a, b) => b.excluidoEm!.localeCompare(a.excluidoEm!));

function buscarNaLixeira(id: number) {
  const p = projetos.obter(id, 'Projeto');
  if (!p.excluidoEm) throw regra('Este projeto não está na lixeira.');
  return p;
}

function excluirDeVez(p: ProjetoLocal) {
  projetos.excluir(p.id);
  excluirEtapasDo(p.id);
  registrarProjeto(p, 'EXCLUSAO', `Projeto "${p.nome}" excluído.`);
}

get('/gestao-projetos/lixeira', () => naLixeira().map(resposta));
del('/gestao-projetos/lixeira', () => {
  const lista = naLixeira();
  lista.forEach(excluirDeVez);
  return { excluidos: lista.length };
});
patch('/gestao-projetos/:id/restaurar', ({ p }) => {
  const restaurado = projetos.salvar({ ...buscarNaLixeira(p.id), excluidoEm: null });
  registrarProjeto(restaurado, 'REABERTURA', `Projeto "${restaurado.nome}" restaurado da lixeira.`);
  return resposta(restaurado);
});
del('/gestao-projetos/:id/definitivo', ({ p }) => excluirDeVez(buscarNaLixeira(p.id)));
get('/gestao-projetos/coordenadores-disponiveis', () =>
  usuariosAtivos()
    .map((u) => coordenador(u.id)!)
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR')),
);
get('/gestao-projetos/:id', ({ p }) => resposta(projetos.obter(p.id, 'Projeto')));
get('/gestao-projetos/:id/historico', ({ p }) => {
  projetos.obter(p.id, 'Projeto');
  return historicoDo('GESTAO_PROJETO', p.id);
});

post('/gestao-projetos', ({ b }) => {
  const p = projetos.inserir({
    ...dados(b),
    status: 'EM_ESPERA',
    arquivadoEm: null,
    excluidoEm: null,
    criadoEm: agora(),
    atualizadoEm: agora(),
  });
  registrarProjeto(p, 'CRIACAO', `Projeto "${p.nome}" criado.`);
  return resposta(p);
});
put('/gestao-projetos/:id', ({ p, b }) => {
  const atual = editavel(p.id);
  const atualizado = projetos.salvar({
    ...atual,
    ...dados(b, atual),
    atualizadoEm: agora(),
  });
  registrarProjeto(atualizado, 'EDICAO', `Dados do projeto "${atualizado.nome}" atualizados.`);
  return resposta(atualizado);
});
patch('/gestao-projetos/:id/status', ({ p, b }) => {
  const projeto = editavel(p.id);
  const status = b.status as StatusGestaoProjeto;
  if (!ROTULO_STATUS_GESTAO_PROJETO[status])
    throw new ErroLocal(400, 'Confira os campos destacados.', { status: 'não deve ser nulo' });
  if (projeto.status === status) return resposta(projeto);
  const movido = projetos.salvar({ ...projeto, status, atualizadoEm: agora() });
  registrarProjeto(
    movido,
    'MOVIMENTACAO',
    `Projeto "${movido.nome}" movido para ${ROTULO_STATUS_GESTAO_PROJETO[status]}.`,
  );
  return resposta(movido);
});
patch('/gestao-projetos/:id/arquivado', ({ p, b }) => {
  const projeto = projetos.obter(p.id, 'Projeto');
  if (projeto.excluidoEm) throw regra('Este projeto está na lixeira. Restaure-o antes.');
  const arquivar = !!b.arquivado;
  if (!!projeto.arquivadoEm === arquivar) return resposta(projeto);
  const salvo = projetos.salvar({ ...projeto, arquivadoEm: arquivar ? agora() : null });
  registrarProjeto(
    salvo,
    arquivar ? 'ARQUIVAMENTO' : 'REABERTURA',
    `Projeto "${salvo.nome}" ${arquivar ? 'arquivado' : 'desarquivado'}.`,
  );
  return resposta(salvo);
});
// Excluir manda para a lixeira (restaurável).
del('/gestao-projetos/:id', ({ p }) => {
  const projeto = projetos.obter(p.id, 'Projeto');
  if (projeto.excluidoEm) return;
  projetos.salvar({ ...projeto, excluidoEm: agora() });
  registrarProjeto(projeto, 'EXCLUSAO', `Projeto "${projeto.nome}" movido para a lixeira.`);
});

// ---------- etapas (ServicoGestaoProjetoEtapa) ----------

interface TarefaEtapaLocal extends Omit<TarefaEtapa, 'responsavel'> {
  responsavelId?: number | null;
}

interface EtapaLocal extends Omit<Etapa, 'responsavel' | 'tarefas'> {
  responsavelId: number | null;
  tarefas: TarefaEtapaLocal[];
}

const etapas = tabela<EtapaLocal>('gestaoProjetoEtapas');

const pessoa = (id: number | null | undefined) => (id ? coordenador(id) : null);

// Etapas gravadas antes da lista de tarefas (ou tarefas sem data/responsável/dependências) não têm esses campos.
const respostaEtapa = (e: EtapaLocal): Etapa =>
  copia({
    ...omit(e, 'responsavelId'),
    tarefas: (e.tarefas ?? []).map((t) => ({
      ...omit(t, 'responsavelId'),
      // Status antigos (Não iniciada, Aguardando, Bloqueada) viram Em espera; feita = Concluída.
      status: t.feita ? 'CONCLUIDA' : t.status === 'EM_ANDAMENTO' || t.status === 'EM_PAUSA' ? t.status : 'EM_ESPERA',
      prazo: t.prazo ?? null,
      dependencias: t.dependencias ?? [],
      dependenciasEtapas: t.dependenciasEtapas ?? [],
      responsavel: pessoa(t.responsavelId),
    })),
    responsavel: pessoa(e.responsavelId),
    etapaPaiId: e.etapaPaiId ?? null,
  });

/** Responsável novo: usuário ativo (no modo local só há uma unidade). */
const responsavelValido = (v: unknown) => {
  const id = numeroOuNulo(v);
  if (id !== null && !usuarios.buscar(id)?.ativo)
    throw regra('Escolha um responsável ativo desta unidade.');
  return id;
};

function etapaDo(projetoId: number, etapaId: number) {
  const e = etapas.buscar(etapaId);
  if (!e || e.projetoId !== projetoId) throw naoEncontrado('Etapa');
  return e;
}

/** Ramificação de origem: outra etapa do mesmo projeto, e nunca ela mesma nem uma que sai dela (ciclo). */
function paiValido(projetoId: number, v: unknown, etapaId?: number) {
  const paiId = numeroOuNulo(v);
  if (paiId === null) return null;
  const doProjeto = new Map(etapas.filtrar((x) => x.projetoId === projetoId).map((x) => [x.id, x]));
  if (!doProjeto.has(paiId)) throw regra('A ramificação só pode sair de outra etapa deste projeto.');
  const vistos = new Set<number>();
  for (let atual: number | null = paiId; atual != null && !vistos.has(atual); atual = doProjeto.get(atual)?.etapaPaiId ?? null) {
    if (atual === etapaId) throw regra('Uma etapa não pode sair dela mesma nem de uma ramificação dela.');
    vistos.add(atual);
  }
  return paiId;
}

function dadosEtapa(b: Record<string, unknown>, projetoId: number, etapaId?: number) {
  exigir({ titulo: b.titulo });
  const responsavelId = responsavelValido(b.responsavelId);
  return {
    titulo: limpo(b.titulo)!,
    descricao: limpo(b.descricao),
    prazo: limpo(b.prazo),
    responsavelId,
    etapaPaiId: paiValido(projetoId, b.etapaPaiId, etapaId),
  };
}

// Kanban geral: etapas de todos os projetos ativos (nem arquivados, nem na lixeira).
get('/gestao-projetos/etapas', () => {
  const ativos = new Set(projetos.filtrar((p) => !p.arquivadoEm && !p.excluidoEm).map((p) => p.id));
  return etapas
    .filtrar((e) => ativos.has(e.projetoId))
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
    .map(respostaEtapa);
});
get('/gestao-projetos/:id/etapas', ({ p }) => {
  projetos.obter(p.id, 'Projeto');
  return etapas
    .filtrar((e) => e.projetoId === p.id)
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
    .map(respostaEtapa);
});
post('/gestao-projetos/:id/etapas', ({ p, b }) => {
  const projeto = editavel(p.id);
  const e = etapas.inserir({
    ...dadosEtapa(b, p.id),
    projetoId: p.id,
    status: (b.status as StatusEtapa) ?? 'EM_ESPERA',
    tarefas: [],
    criadoEm: agora(),
    atualizadoEm: agora(),
  });
  registrarProjeto(projeto, 'CRIACAO', `Etapa "${e.titulo}" criada no projeto "${projeto.nome}".`);
  return respostaEtapa(e);
});
put('/gestao-projetos/:id/etapas/:etapaId', ({ p, b }) => {
  const projeto = editavel(p.id);
  const atual = etapaDo(p.id, p.etapaId);
  const e = etapas.salvar({
    ...atual,
    ...dadosEtapa(b, p.id, atual.id),
    status: (b.status as StatusEtapa) ?? atual.status,
    atualizadoEm: agora(),
  });
  registrarProjeto(projeto, 'EDICAO', `Etapa "${e.titulo}" editada no projeto "${projeto.nome}".`);
  return respostaEtapa(e);
});
patch('/gestao-projetos/:id/etapas/:etapaId/status', ({ p, b }) => {
  const projeto = editavel(p.id);
  const atual = etapaDo(p.id, p.etapaId);
  const status = b.status as StatusEtapa;
  if (!ROTULO_STATUS_ETAPA[status])
    throw new ErroLocal(400, 'Confira os campos destacados.', { status: 'não deve ser nulo' });
  if (atual.status === status) return respostaEtapa(atual);
  const e = etapas.salvar({ ...atual, status, atualizadoEm: agora() });
  registrarProjeto(
    projeto,
    status === 'CONCLUIDO' ? 'CONCLUSAO' : 'MOVIMENTACAO',
    `Etapa "${e.titulo}" movida para ${ROTULO_STATUS_ETAPA[status]}.`,
  );
  return respostaEtapa(e);
});
del('/gestao-projetos/:id/etapas/:etapaId', ({ p }) => {
  const projeto = editavel(p.id);
  const e = etapaDo(p.id, p.etapaId);
  // As ramificações que saíam dela passam a sair de onde ela saía.
  etapas.filtrar((x) => x.etapaPaiId === e.id).forEach((x) => etapas.salvar({ ...x, etapaPaiId: e.etapaPaiId ?? null }));
  etapas.excluir(e.id);
  limparDependencias(
    p.id,
    (e.tarefas ?? []).map((t) => t.id),
    e.id,
  );
  registrarProjeto(
    projeto,
    'EXCLUSAO',
    `Etapa "${e.titulo}" excluída do projeto "${projeto.nome}".`,
  );
});

// ---------- lista de tarefas da etapa ----------

const tarefaDa = (e: EtapaLocal, id: number) => {
  const t = (e.tarefas ?? []).find((x) => x.id === id);
  if (!t) throw naoEncontrado('Tarefa');
  return t;
};

const etapasDoProjeto = (projetoId: number) => etapas.filtrar((x) => x.projetoId === projetoId);

/** Tira as referências às tarefas/etapa excluídas das outras etapas do projeto (no banco: ON DELETE CASCADE). */
function limparDependencias(
  projetoId: number,
  tarefaIds: number[],
  etapaId?: number,
  menosEtapaId?: number,
) {
  etapasDoProjeto(projetoId)
    .filter((x) => x.id !== menosEtapaId)
    .forEach((x) =>
      etapas.salvar({
        ...x,
        tarefas: (x.tarefas ?? []).map((t) => ({
          ...t,
          dependencias: (t.dependencias ?? []).filter((id) => !tarefaIds.includes(id)),
          dependenciasEtapas: (t.dependenciasEtapas ?? []).filter((id) => id !== etapaId),
        })),
      }),
    );
}

const ids = (v: unknown) => [...new Set(((v ?? []) as unknown[]).map(Number))];

/** Dependências: tarefas e etapas do mesmo projeto, nunca ela mesma nem a própria etapa, e sem ciclo. */
function dependenciasValidas(e: EtapaLocal, b: Record<string, unknown>, tarefaId?: number) {
  const tarefaIds = ids(b.dependencias);
  const etapaIds = ids(b.dependenciasEtapas);
  const doProjeto = etapasDoProjeto(e.projetoId).map((x) => (x.id === e.id ? e : x));
  if (etapaIds.some((id) => id === e.id || !doProjeto.some((x) => x.id === id)))
    throw regra('A tarefa só pode depender de outras etapas deste projeto.');
  const todas = new Map(doProjeto.flatMap((x) => x.tarefas ?? []).map((t) => [t.id, t]));
  if (tarefaIds.some((id) => id === tarefaId || !todas.has(id)))
    throw regra('A tarefa só pode depender de outras tarefas deste projeto.');
  if (tarefaId !== undefined) {
    const pendentes = [...tarefaIds];
    const vistos = new Set<number>();
    while (pendentes.length) {
      const atual = pendentes.pop()!;
      if (atual === tarefaId)
        throw regra(
          'Essas dependências formam um ciclo: uma tarefa acabaria esperando por ela mesma.',
        );
      if (!vistos.has(atual)) {
        vistos.add(atual);
        pendentes.push(...(todas.get(atual)?.dependencias ?? []));
      }
    }
  }
  return { dependencias: tarefaIds, dependenciasEtapas: etapaIds };
}

/** Nome, status, data, responsável e dependências (modal da tarefa). Quem já era responsável continua, mesmo inativo. */
function dadosTarefa(b: Record<string, unknown>, e: EtapaLocal, atual?: TarefaEtapaLocal) {
  exigir({ texto: b.texto });
  const texto = limpo(b.texto)!;
  if (texto.length > LIMITES.GESTAO_PROJETO_ETAPA_TAREFA)
    throw regra(`A tarefa deve ter até ${LIMITES.GESTAO_PROJETO_ETAPA_TAREFA} caracteres.`);
  const responsavelId = numeroOuNulo(b.responsavelId);
  const status = (limpo(b.status) ?? 'EM_ESPERA') as StatusTarefaEtapa;
  if (!(status in ROTULO_STATUS_TAREFA_ETAPA)) throw regra('Status da tarefa inválido.');
  return {
    texto,
    status,
    prazo: limpo(b.prazo),
    responsavelId:
      responsavelId === (atual?.responsavelId ?? null)
        ? responsavelId
        : responsavelValido(responsavelId),
    ...dependenciasValidas(e, b, atual?.id),
  };
}

/** Concluída = feita (ServicoGestaoProjetoEtapa.definirStatus): concluir exige as dependências concluídas. */
function definirStatus(
  projetoId: number,
  e: EtapaLocal,
  t: TarefaEtapaLocal,
  status: StatusTarefaEtapa,
) {
  if (status === 'CONCLUIDA' && !t.feita) {
    const doProjeto = etapasDoProjeto(projetoId).map((x) => (x.id === e.id ? e : x));
    const todas = doProjeto.flatMap((x) => x.tarefas ?? []);
    const pendentes = [
      ...(t.dependenciasEtapas ?? [])
        .map((id) => doProjeto.find((x) => x.id === id))
        .filter((d) => d && d.status !== 'CONCLUIDO')
        .map((d) => `etapa "${d!.titulo}"`),
      ...(t.dependencias ?? [])
        .map((id) => todas.find((x) => x.id === id))
        .filter((d) => d && !d.feita)
        .map((d) => `"${d!.texto}"`),
    ];
    if (pendentes.length) throw regra(`Conclua antes: ${pendentes.join(', ')}.`);
  }
  t.status = status;
  t.feita = status === 'CONCLUIDA';
}

post('/gestao-projetos/:id/etapas/:etapaId/tarefas', ({ p, b }) => {
  const projeto = editavel(p.id);
  const e = etapaDo(p.id, p.etapaId);
  const { status, ...resto } = dadosTarefa(b, e);
  const t: TarefaEtapaLocal = { id: novoId(), feita: false, status: 'EM_ESPERA', ...resto };
  definirStatus(p.id, e, t, status);
  e.tarefas = [...(e.tarefas ?? []), t];
  registrarProjeto(projeto, 'EDICAO', `Tarefa "${t.texto}" adicionada à etapa "${e.titulo}".`);
  return respostaEtapa(etapas.salvar(e));
});
put('/gestao-projetos/:id/etapas/:etapaId/tarefas/:tarefaId', ({ p, b }) => {
  const projeto = editavel(p.id);
  const e = etapaDo(p.id, p.etapaId);
  const t = tarefaDa(e, p.tarefaId);
  const { status, ...resto } = dadosTarefa(b, e, t);
  Object.assign(t, resto);
  definirStatus(p.id, e, t, status);
  registrarProjeto(projeto, 'EDICAO', `Tarefa "${t.texto}" da etapa "${e.titulo}" editada.`);
  return respostaEtapa(etapas.salvar(e));
});
patch('/gestao-projetos/:id/etapas/:etapaId/tarefas/:tarefaId', ({ p, b }) => {
  const projeto = editavel(p.id);
  const e = etapaDo(p.id, p.etapaId);
  const t = tarefaDa(e, p.tarefaId);
  if (t.feita !== !!b.feita) {
    // Desmarcar volta para Em espera.
    definirStatus(p.id, e, t, b.feita ? 'CONCLUIDA' : 'EM_ESPERA');
    registrarProjeto(
      projeto,
      'EDICAO',
      `Tarefa "${t.texto}" da etapa "${e.titulo}" marcada como ${t.feita ? 'concluída' : 'pendente'}.`,
    );
  }
  return respostaEtapa(etapas.salvar(e));
});
del('/gestao-projetos/:id/etapas/:etapaId/tarefas/:tarefaId', ({ p }) => {
  const projeto = editavel(p.id);
  const e = etapaDo(p.id, p.etapaId);
  const t = tarefaDa(e, p.tarefaId);
  // Quem dependia dela deixa de depender (no banco: ON DELETE CASCADE).
  limparDependencias(p.id, [t.id], undefined, e.id);
  e.tarefas = e.tarefas
    .filter((x) => x.id !== t.id)
    .map((x) => ({ ...x, dependencias: (x.dependencias ?? []).filter((id) => id !== t.id) }));
  registrarProjeto(projeto, 'EDICAO', `Tarefa "${t.texto}" removida da etapa "${e.titulo}".`);
  return respostaEtapa(etapas.salvar(e));
});

/** Ao excluir o projeto, as etapas e o chat saem junto (ON DELETE CASCADE no banco). */
export const excluirEtapasDo = (projetoId: number) => {
  etapas.excluirOnde((e) => e.projetoId === projetoId);
  mensagens.excluirOnde((m) => m.projetoId === projetoId);
};

// ---------- chat do projeto (ServicoGestaoProjetoChat) ----------
// No modo local não há outra pessoa conectada: as mensagens ficam guardadas, mas ninguém responde.

interface MensagemLocal extends Omit<MensagemProjeto, 'remetente'> {
  remetenteId: number;
}

const mensagens = tabela<MensagemLocal>('gestaoProjetoMensagens');
const LIMITE_MENSAGENS = 50;

const respostaMensagem = (m: MensagemLocal): MensagemProjeto =>
  copia({ ...omit(m, 'remetenteId'), remetente: coordenador(m.remetenteId) });

get('/gestao-projetos/:id/chat', ({ p, q }) => {
  projetos.obter(p.id, 'Projeto');
  const doProjeto = mensagens.filtrar((m) => m.projetoId === p.id).sort((a, b) => a.id - b.id);
  if (q.depoisDeId)
    return doProjeto.filter((m) => m.id > Number(q.depoisDeId)).map(respostaMensagem);
  const antes = q.antesDeId ? Number(q.antesDeId) : Infinity;
  return doProjeto
    .filter((m) => m.id < antes)
    .slice(-LIMITE_MENSAGENS)
    .map(respostaMensagem);
});
post('/gestao-projetos/:id/chat', ({ p, b }) => {
  projetos.obter(p.id, 'Projeto');
  const texto = String(b.texto ?? '').trim();
  if (!texto || texto.length > LIMITES.MENSAGEM_TEXTO)
    throw regra(`A mensagem deve ter entre 1 e ${LIMITES.MENSAGEM_TEXTO} caracteres.`);
  return respostaMensagem(
    mensagens.inserir({
      projetoId: p.id,
      remetenteId: USUARIO_LOCAL_ID,
      texto,
      enviadaEm: agora(),
    }),
  );
});
